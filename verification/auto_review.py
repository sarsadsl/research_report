# -*- coding: utf-8 -*-
"""Automatic fail-closed reviewer: Agy/Gemini first; Codex only for outages.

Use: python -m verification.auto_review <slug> [--root .] [--evidence-dir DIR]
Review artifacts are local and Git ignored. Never changes packages or deploys.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys
from typing import Any, Mapping, Sequence, TextIO

from .cli import EXIT_BLOCKED, EXIT_PASS, run_review_command
from .codex_review import CODEX_MODEL, run_codex_review

# Explicit infrastructure-only allowlist. Findings, invalid JSON, incomplete
# evidence, schema violations, and P2 disclosure errors MUST NOT trigger fallback.
TRANSIENT_AGY_ERRORS = frozenset({
    "AGY_NOT_FOUND", "AGY_TIMEOUT", "AGY_OS_ERROR",
    "AGY_VERSION_FAILED", "AGY_VERSION_EMPTY", "AGY_MODELS_FAILED",
    "MODEL_NOT_AVAILABLE", "AGY_CLI_NON_ZERO",
})
_CODE_RE = re.compile(r"^\[([A-Z][A-Z0-9_]*)\]")


def infrastructure_failure(result: Mapping[str, Any]) -> str | None:
    if result.get("status") != "BLOCKED" or result.get("deterministicStatus") != "PASS":
        return None
    # A model process starting is not the same as a completed review.
    # Require explicit transport-only classification from the trusted CLI,
    # persisted primary record, and zero findings before restarting in Codex.
    counts = result.get("findingSummary") or {}
    if result.get("fallbackSafe") is not True or counts.get("totalFindings") != 0:
        return None
    if not result.get("recordPath"):
        return None
    reasons = result.get("blockedReasons")
    if not isinstance(reasons, list) or len(reasons) != 1 or not isinstance(reasons[0], str):
        return None
    match = _CODE_RE.match(reasons[0])
    code = match.group(1) if match else None
    return code if code in TRANSIENT_AGY_ERRORS and result.get("reviewFailureCode") == code else None


def run_auto_review_command(
    slug: str,
    *,
    root_dir: str | Path = ".",
    evidence_dir: str | Path | None = None,
    agy_model: str = "gemini-4-argon-high",
    output_path: str | Path | None = None,
    codex_model: str = CODEX_MODEL,
    allow_private_source_review: bool = False,
    agy_runner=None,
    codex_runner=None,
    base_env=None,
) -> tuple[int, dict[str, Any]]:
    code, agy = run_review_command(
        slug, root_dir=root_dir, evidence_dir=evidence_dir,
        model=agy_model, output_path=output_path, runner=agy_runner, base_env=base_env,
        allow_private_source_review=allow_private_source_review,
    )
    agy_status = str(agy.get("status") or "BLOCKED")
    if code == EXIT_PASS and agy_status in ("PASS", "PASS_WITH_P2"):
        return code, {**agy, "reviewProvider":"agy-gemini", "fallbackUsed":False}
    failure_code = infrastructure_failure(agy)
    if failure_code is None:
        return EXIT_BLOCKED, {**agy, "reviewProvider":"agy-gemini", "fallbackUsed":False,
                              "fallbackReason":"none - no eligible infrastructure outage"}
    hashes = agy.get("hashes")
    pkg_hash = hashes.get("packageHash") if isinstance(hashes, Mapping) else None
    if not isinstance(pkg_hash, str) or not re.fullmatch(r"[a-f0-9]{64}", pkg_hash):
        return EXIT_BLOCKED, {**agy, "fallbackUsed":False,
                              "fallbackReason":"Agy outcome lacks valid package hash"}
    relative_output = str(Path(output_path).with_name("codex-review.json")) if output_path else (
        f".research-verification/{slug}/{pkg_hash}/codex-review.json"
    )

    def _invoke_codex(ctx, **_kwargs):
        return run_codex_review(
            ctx, model=codex_model, base_env=base_env, runner=codex_runner,
            fallback_reason=failure_code,
        )

    fallback_code, fallback = run_review_command(
        slug, root_dir=root_dir, evidence_dir=evidence_dir, model=agy_model,
        output_path=relative_output, gemini_reviewer=_invoke_codex,
        base_env=base_env,
        allow_private_source_review=allow_private_source_review,
    )
    # This status never invents a third-party Gemini approval. The certificate
    # signer must inspect reviewProvider and audit assurance before issuing.
    return fallback_code, {
        **fallback, "reviewProvider":"codex-fallback",
        "fallbackUsed":True, "fallbackReason":failure_code,
        "agyStatus":"BLOCKED", "agyRecordPath":agy.get("recordPath"),
        "assuranceLevel":"internal-fallback-review",
    }


def main(argv: Sequence[str] | None = None, *, stdout: TextIO | None = None) -> int:
    parser = argparse.ArgumentParser(description="Agy/Gemini -> local read-only Codex automatic reviewer")
    parser.add_argument("slug")
    parser.add_argument("--root", default=".")
    parser.add_argument("--evidence-dir", default=None)
    parser.add_argument("--output", help="Local ignored path for the Agy review record")
    parser.add_argument("--agy-model", default="gemini-4-argon-high")
    parser.add_argument("--codex-model", default=CODEX_MODEL,
                        help="codex-cli-default uses the authenticated CLI default and records the runtime model")
    parser.add_argument("--allow-private-source-review", action="store_true",
                        help="Explicitly consent to sharing restricted local broker excerpts with an external reviewer")
    args = parser.parse_args(argv)
    try:
        code, result = run_auto_review_command(
            args.slug, root_dir=args.root, evidence_dir=args.evidence_dir,
            agy_model=args.agy_model, codex_model=args.codex_model, output_path=args.output,
            allow_private_source_review=args.allow_private_source_review,
        )
    except Exception:
        code, result = EXIT_BLOCKED, {
            "status":"BLOCKED", "ok":False,
            "fallbackUsed":False, "blockedReasons":["Unexpected auto-review failure"]
        }
    out = sys.stdout if stdout is None else stdout
    out.write(json.dumps(result, ensure_ascii=False) + "\n")
    out.flush()
    return code


if __name__ == "__main__":
    sys.exit(main())
