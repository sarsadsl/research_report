# -*- coding: utf-8 -*-
"""本機獨立研究驗證命令列介面（Local Independent Verification CLI）。

支援子命令：
1. `python -m verification validate <slug> [--root PATH] [--evidence-dir PATH]`
2. `python -m verification review <slug> [--root PATH] [--evidence-dir PATH] [--model MODEL] [--output PATH]`
3. `python -m verification map-source <slug> --source-id ID --path RELATIVE_PATH --access public|restricted|internal`

安全與隔離守則：
- 所有路徑皆先正規化並驗證未跨越指定 root 邊界。
- 受限／券商（third-party/broker 或 restricted）來源之原文摘錄絕不傳送予外部 Gemini 審查，在外部審查 context 中標記為 `available=False` / `"unavailable"`，若屬必要來源則直接阻擋（BLOCKED）。
- 絕不捏造或合成任何缺失證據摘錄。
- 當定性／定量驗證不為 PASS、或來源證據不符合審查條件時，不呼叫 Gemini 模型，並將 `modelInvoked` 設為 `False`，同時寫入本機 BLOCKED 紀錄。
- 審查紀錄僅允許以原子寫入方式存於 `<root>/.research-verification/<slug>/<packageHash>/gemini-review.json`（或位於 `<root>/.research-verification/` 下的安全相對路徑），拒絕任何位於 `.research-verification` 外的輸出路徑。
- 標準輸出（stdout）僅輸出精簡且不含原文摘錄、不含模型原始輸出、不含本機絕對路徑之單一 JSON 狀態摘要。
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from typing import Any, Callable, Mapping, Sequence, TextIO

from .evidence import (
    classify_source_category,
    inspect_sources_and_evidence,
    is_restricted_source,
)
from .gemini_review import (
    DEFAULT_GEMINI_MODEL,
    GeminiReviewError,
    GeminiReviewResult,
    REVIEW_STATUS_BLOCKED,
    REVIEW_STATUS_PASS,
    REVIEW_STATUS_PASS_WITH_P2,
    RunnerCallable,
    run_gemini_review,
    validate_review_context,
)
from .hashing import (
    VERIFICATION_POLICY_VERSION,
    compute_policy_hash,
    compute_verifier_code_hash,
    sha256_bytes,
    sha256_canonical,
)
from .locators import write_source_locator
from .validator import SLUG_PATTERN, validate_research_package

EXIT_PASS = 0
EXIT_NOT_VERIFIED = 1
EXIT_BLOCKED = 2


class _CliArgumentParser(argparse.ArgumentParser):
    """將參數解析錯誤轉為例外，以便統一輸出單一結構化 JSON 並以非零狀態碼結束。"""

    def error(self, message: str) -> None:
        raise ValueError(f"CLI 參數錯誤：{message}")


def _utc_now_iso() -> str:
    """回傳標準 ISO-8601 UTC 時間戳記。"""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _status_to_exit_code(status: str) -> int:
    """僅當狀態為 PASS（或 review 之 PASS_WITH_P2）時回傳 0，其餘皆回傳非零值。"""
    if status == "PASS":
        return EXIT_PASS
    if status == "NOT_VERIFIED":
        return EXIT_NOT_VERIFIED
    return EXIT_BLOCKED


def _resolve_and_check_root_slug(root_arg: str | Path, slug: str) -> tuple[Path, Path, str | None]:
    """解析 root 與 slug 路徑，確認 slug 合法且目標目錄嚴格位於 root 之下。"""
    try:
        root_resolved = Path(root_arg).resolve()
    except OSError:
        return Path("."), Path("."), "無法解析指定的 root 路徑。"

    if not root_resolved.exists() or not root_resolved.is_dir():
        return root_resolved, root_resolved, "指定的 root 目錄不存在或不是有效資料夾。"

    if not isinstance(slug, str) or not SLUG_PATTERN.match(slug.strip()):
        return root_resolved, root_resolved, "不合法的 research slug 格式（必須為小寫英數 kebab-case，且不得含路徑字元）。"

    clean_slug = slug.strip()
    try:
        pkg_dir = (root_resolved / "research" / clean_slug).resolve()
        pkg_dir.relative_to(root_resolved)
    except (OSError, ValueError):
        return root_resolved, root_resolved, "偵測到不安全的 slug 路徑跨越（超出 root 邊界）。"

    return root_resolved, pkg_dir, None


def _resolve_and_check_output_path(
    root_resolved: Path,
    slug: str,
    package_hash: str,
    custom_output: str | Path | None,
) -> tuple[Path | None, str | None, str | None]:
    """解析並驗證 review 輸出路徑必須嚴格位於 `<root>/.research-verification/` 之下。

    回傳 `(resolved_output_path, posix_rel_path_from_root, error_message)`。
    """
    safe_slug = slug.strip() if isinstance(slug, str) and SLUG_PATTERN.match(slug.strip()) else "invalid-slug"
    safe_pkg_hash = (
        package_hash.strip()
        if isinstance(package_hash, str) and re.match(r"^[a-f0-9]{64}$", package_hash.strip())
        else "unhashed"
    )
    allowed_base = (root_resolved / ".research-verification").resolve()
    default_target = (allowed_base / safe_slug / safe_pkg_hash / "gemini-review.json").resolve()

    if custom_output is None:
        rel_str = default_target.relative_to(root_resolved).as_posix()
        return default_target, rel_str, None

    raw_out = str(custom_output).strip()
    if not raw_out:
        return None, None, "輸出路徑不可為空字串。"

    out_path = Path(raw_out)
    try:
        candidate = (out_path if out_path.is_absolute() else (root_resolved / out_path)).resolve()
    except OSError:
        return None, None, "無法解析指定的輸出路徑。"

    try:
        rel_to_allowed = candidate.relative_to(allowed_base)
        rel_to_root = candidate.relative_to(root_resolved)
    except ValueError:
        return (
            None,
            None,
            "拒絕自訂輸出路徑：review 紀錄僅允許寫入 root 下的 `.research-verification/` 目錄內。",
        )

    if not rel_to_allowed.parts or candidate == allowed_base or candidate.suffix.lower() != ".json":
        return (
            None,
            None,
            "拒絕自訂輸出路徑：目標必須為 `.research-verification/` 下的 `.json` 檔案。",
        )

    return candidate, rel_to_root.as_posix(), None


def _atomic_write_json(target_path: Path, payload: Mapping[str, Any]) -> None:
    """以臨時檔案加 os.replace 原子寫入 JSON 紀錄。"""
    target_path.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    fd, tmp_name = tempfile.mkstemp(
        prefix=f".{target_path.name}.",
        suffix=".tmp",
        dir=str(target_path.parent),
    )
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(serialized)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(str(tmp_path), str(target_path))
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise


def _load_json_quietly(path: Path) -> dict[str, Any] | None:
    """安全讀取 JSON 物件；若失敗或非 dict 則回傳 None。"""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def _collect_required_source_ids(pkg: Mapping[str, Any]) -> set[str]:
    """收集 package 中定義或被引用的所有必要 source IDs。"""
    required_ids: set[str] = set()

    def _add_from_obj(node: Any) -> None:
        if isinstance(node, Mapping):
            sids = node.get("sourceIds")
            if isinstance(sids, list):
                for sid in sids:
                    if isinstance(sid, str) and sid.strip():
                        required_ids.add(sid.strip())
            for val in node.values():
                if isinstance(val, (Mapping, list)):
                    _add_from_obj(val)
        elif isinstance(node, list):
            for item in node:
                _add_from_obj(item)

    sources = pkg.get("sources")
    if isinstance(sources, list):
        for src in sources:
            if isinstance(src, Mapping) and isinstance(src.get("id"), str) and src["id"].strip():
                required_ids.add(src["id"].strip())

    _add_from_obj(pkg)
    return required_ids


def _build_report_sections_context(
    pkg: Mapping[str, Any],
    root_resolved: Path,
    slug: str,
) -> tuple[list[dict[str, Any]], dict[str, Any] | None, str | None]:
    """從 package.sections 與（若存在的）generated Full Report 建立結構化 reportSections。"""
    raw_sections = pkg.get("sections") if isinstance(pkg.get("sections"), list) else []
    required_sids = _collect_required_source_ids(pkg)
    enriched_sections: list[dict[str, Any]] = []

    for idx, sec in enumerate(raw_sections):
        if not isinstance(sec, Mapping):
            continue
        sec_dict = dict(sec)
        sec_id = str(sec_dict.get("id") or sec_dict.get("sectionId") or f"section-{idx + 1}").strip()
        sec_dict["id"] = sec_id

        # 根據 payloadRefs 收集該章節涵蓋的 sourceIds，協助批次拆分與定位
        sec_sids: list[str] = [
            str(s).strip()
            for s in (sec_dict.get("sourceIds") or [])
            if isinstance(s, str) and str(s).strip()
        ]
        for ref in sec_dict.get("payloadRefs") or []:
            if isinstance(ref, str) and ref in pkg:
                ref_node = pkg[ref]
                for sid in sorted(_collect_required_source_ids({"node": ref_node})):
                    if sid in required_sids and sid not in sec_sids:
                        sec_sids.append(sid)
        if sec_sids:
            sec_dict["sourceIds"] = sec_sids
        enriched_sections.append(sec_dict)

    full_report_rel = f"public/research/reports/{slug}.html"
    full_report_path = (root_resolved / full_report_rel).resolve()
    full_report_obj: dict[str, Any] | None = None
    report_html_text: str | None = None
    try:
        full_report_path.relative_to(root_resolved)
        if full_report_path.is_file():
            raw_bytes = full_report_path.read_bytes()
            report_html_text = raw_bytes.decode("utf-8", errors="replace")
            full_report_obj = {
                "file": full_report_rel,
                "sha256": sha256_bytes(raw_bytes),
                "charCount": len(report_html_text),
                "sections": enriched_sections,
            }
    except Exception:
        full_report_obj = None
        report_html_text = None

    return enriched_sections, full_report_obj, report_html_text


def _build_source_evidence_for_gemini(
    pkg: Mapping[str, Any],
    evidence_report: Mapping[str, Any],
    *,
    allow_private_source_review: bool = False,
) -> tuple[list[dict[str, Any]], list[str], list[str]]:
    """為每個 package source 建立明確的 `sourceEvidence` 項目。

    嚴格遵守：
    1. 每一個 `pkg["sources"]` 中的 source ID 皆有對應的 `sourceEvidence` entry。
    2. 僅當 `inspect_sources_and_evidence` 允許且來源非受限（`restricted=False` 且非 `third-party/broker`）時，
       才附上本機 `excerpt`；若為 `research_inference` 則使用 package 內的模型假設描述作為結構化說明（不捏造外部檔案）。
    3. 任何受限來源（`restricted=True` 或 `third-party/broker`）絕不傳送私人券商報告內容給外部 Gemini，
       在 `sourceEvidence` 中標記為 `available=False, availability="unavailable", restricted=True, excerpt=None`，
       若屬必要來源則會觸發 BLOCKED。
    4. 任何缺失或未驗證之來源保持 `available=False, availability="unavailable", excerpt=None`，絕不合成或捏造摘錄。
    """
    raw_sources = pkg.get("sources") if isinstance(pkg.get("sources"), list) else []
    internal_excerpts = (
        evidence_report.get("internalExcerpts")
        if isinstance(evidence_report.get("internalExcerpts"), Mapping)
        else {}
    )
    public_records_list = (
        evidence_report.get("publicSourceRecords")
        if isinstance(evidence_report.get("publicSourceRecords"), list)
        else []
    )
    public_by_id: dict[str, Mapping[str, Any]] = {
        str(r.get("sourceId")): r
        for r in public_records_list
        if isinstance(r, Mapping) and isinstance(r.get("sourceId"), str)
    }
    required_ids = _collect_required_source_ids(pkg)

    source_evidence_entries: list[dict[str, Any]] = []
    restricted_blocked_ids: list[str] = []
    unavailable_required_ids: list[str] = []

    for idx, src in enumerate(raw_sources):
        if not isinstance(src, Mapping):
            continue
        src_id = str(src.get("id") or f"index-{idx}").strip()
        ev_class = str(src.get("evidenceClass") or "unknown").strip()
        detailed_cat = classify_source_category(dict(src))
        restricted = is_restricted_source(dict(src), detailed_cat)
        is_required = src_id in required_ids or bool(src.get("required", True))
        pub_rec = public_by_id.get(src_id, {})

        private_evidence = internal_excerpts.get(src_id)
        if (
            restricted
            and allow_private_source_review
            and isinstance(private_evidence, Mapping)
            and isinstance(private_evidence.get("excerpt"), str)
            and private_evidence["excerpt"].strip()
        ):
            available = True
            availability = "available"
            excerpt_val = private_evidence["excerpt"]
            reason = "authorized_private_local_evidence_excerpt"
        elif restricted:
            # 預設不將私人券商內容送交 Gemini；明確啟用時才使用本機證據摘錄
            available = False
            availability = "unavailable"
            excerpt_val: str | None = None
            reason = "restricted_source_withheld_from_external_review"
            if is_required:
                restricted_blocked_ids.append(src_id)
                unavailable_required_ids.append(src_id)
        elif ev_class == "research_inference":
            # 自建研究推論模型無外部原始檔，使用 package 內已公開的結構化來源定義，不捏造外部證據
            model_desc_parts = [
                str(src.get("title") or "").strip(),
                str(src.get("notes") or "").strip(),
            ]
            model_desc = " — ".join(p for p in model_desc_parts if p) or f"research_inference:{src_id}"
            available = True
            availability = "available"
            excerpt_val = f"[research_inference metadata] {model_desc}"
            reason = "research_inference_model_metadata"
        elif src_id in internal_excerpts and isinstance(internal_excerpts[src_id], Mapping):
            raw_exc = internal_excerpts[src_id].get("excerpt")
            if isinstance(raw_exc, str) and raw_exc.strip():
                available = True
                availability = "available"
                excerpt_val = raw_exc
                reason = "verified_local_evidence_excerpt"
            else:
                available = False
                availability = "unavailable"
                excerpt_val = None
                reason = "empty_local_evidence_excerpt"
                if is_required:
                    unavailable_required_ids.append(src_id)
        else:
            available = False
            availability = "unavailable"
            excerpt_val = None
            reason = "missing_local_evidence_file"
            if is_required:
                unavailable_required_ids.append(src_id)

        entry: dict[str, Any] = {
            "id": src_id,
            "sourceId": src_id,
            "evidenceClass": ev_class,
            "detailedCategory": detailed_cat,
            "provider": str(src.get("provider") or ""),
            "title": str(src.get("title") or ""),
            "publishedDate": str(src.get("publishedDate") or ""),
            "coveredPeriods": list(src.get("coveredPeriods") or []),
            "required": is_required,
            "restricted": restricted,
            "available": available,
            "availability": availability,
            "availabilityReason": reason,
            "fileSha256": pub_rec.get("fileSha256"),
            "textSha256": pub_rec.get("textSha256"),
            "excerpt": excerpt_val,
        }
        source_evidence_entries.append(entry)

    return (
        source_evidence_entries,
        sorted(set(restricted_blocked_ids)),
        sorted(set(unavailable_required_ids)),
    )


def _sanitize_public_source_evidence(entries: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """產生不含原文 excerpt 的來源證據狀態清單，供寫入紀錄摘要或診斷。"""
    sanitized: list[dict[str, Any]] = []
    for item in entries:
        sanitized.append(
            {
                "id": item.get("id"),
                "sourceId": item.get("sourceId"),
                "evidenceClass": item.get("evidenceClass"),
                "detailedCategory": item.get("detailedCategory"),
                "required": bool(item.get("required", True)),
                "restricted": bool(item.get("restricted", False)),
                "available": bool(item.get("available", False)),
                "availability": item.get("availability"),
                "availabilityReason": item.get("availabilityReason"),
                "fileSha256": item.get("fileSha256"),
                "textSha256": item.get("textSha256"),
                "hasExcerpt": bool(isinstance(item.get("excerpt"), str) and str(item.get("excerpt")).strip()),
            }
        )
    return sanitized


def _sanitize_executable_name(executable: Any) -> str:
    """避免在紀錄或輸出中洩漏本機執行檔絕對路徑。"""
    if not isinstance(executable, str) or not executable.strip():
        return ""
    return Path(executable.strip()).name


def run_validate_command(
    slug: str,
    *,
    root_dir: str | Path = ".",
    evidence_dir: str | Path | None = None,
) -> tuple[int, dict[str, Any]]:
    """執行 `validate` 子命令：呼叫 `validate_research_package`，回傳 `(exit_code, result_dict)`。"""
    root_resolved, _, path_err = _resolve_and_check_root_slug(root_dir, slug)
    if path_err is not None:
        # 交由 validate_research_package 產生標準結構化 BLOCKED 回應（不洩漏絕對路徑）
        safe_root = root_resolved if root_resolved.is_dir() else Path(".")
        result = validate_research_package(slug=str(slug), root_dir=safe_root, evidence_dir=None)
        return EXIT_BLOCKED, result

    resolved_ev_dir: Path | None = None
    if evidence_dir is not None:
        try:
            cand_ev = Path(evidence_dir)
            resolved_ev_dir = (cand_ev if cand_ev.is_absolute() else (root_resolved / cand_ev)).resolve()
            resolved_ev_dir.relative_to(root_resolved)
        except (OSError, ValueError):
            # 若 evidence_dir 超出 root 或無效，直接回傳 BLOCKED
            result = validate_research_package(slug="__invalid_evidence_dir__", root_dir=root_resolved)
            result["slug"] = slug
            result["blockedIds"] = ["cli.evidence_dir.outside_root"]
            if result.get("checks"):
                result["checks"][0]["id"] = "cli.evidence_dir.outside_root"
                result["checks"][0]["message"] = "指定的 --evidence-dir 超出 root 目錄邊界或無法解析。"
            return EXIT_BLOCKED, result

    result = validate_research_package(
        slug=slug.strip(),
        root_dir=root_resolved,
        evidence_dir=resolved_ev_dir,
    )
    status = str(result.get("status") or "BLOCKED")
    exit_code = _status_to_exit_code(status)
    return exit_code, result


def run_map_source_command(
    slug: str,
    *,
    root_dir: str | Path = ".",
    source_id: str,
    source_path: str | Path,
    access: str,
    drive_file_id: str | None = None,
    drive_name: str | None = None,
) -> tuple[int, dict[str, Any]]:
    """Register one repo-local evidence file in the ignored locator manifest."""
    root_resolved, pkg_dir, path_err = _resolve_and_check_root_slug(root_dir, slug)
    if path_err is not None:
        return EXIT_BLOCKED, {
            "schemaVersion": "1.0.0",
            "command": "map-source",
            "slug": slug,
            "status": "BLOCKED",
            "ok": False,
            "error": "invalid_root_or_slug",
        }

    pkg_path = pkg_dir / "research-package.json"
    pkg_doc = _load_json_quietly(pkg_path)
    if not isinstance(pkg_doc, dict):
        return EXIT_BLOCKED, {
            "schemaVersion": "1.0.0",
            "command": "map-source",
            "slug": slug,
            "status": "BLOCKED",
            "ok": False,
            "error": "research_package_unavailable",
        }

    source_items = pkg_doc.get("sources")
    source = next(
        (
            item
            for item in source_items
            if isinstance(item, dict) and item.get("id") == source_id
        ),
        None,
    ) if isinstance(source_items, list) else None
    if source is None:
        return EXIT_BLOCKED, {
            "schemaVersion": "1.0.0",
            "command": "map-source",
            "slug": slug,
            "sourceId": source_id,
            "status": "BLOCKED",
            "ok": False,
            "error": "source_id_not_in_package",
        }

    detailed_category = classify_source_category(source)
    if is_restricted_source(source, detailed_category) and access != "restricted":
        return EXIT_BLOCKED, {
            "schemaVersion": "1.0.0",
            "command": "map-source",
            "slug": slug,
            "sourceId": source_id,
            "status": "BLOCKED",
            "ok": False,
            "error": "restricted_source_requires_restricted_access",
        }

    try:
        registered = write_source_locator(
            root_resolved,
            slug,
            source_id,
            source_path,
            access=access,
            drive_file_id=drive_file_id,
            drive_name=drive_name,
        )
    except (OSError, ValueError) as exc:
        return EXIT_BLOCKED, {
            "schemaVersion": "1.0.0",
            "command": "map-source",
            "slug": slug,
            "sourceId": source_id,
            "status": "BLOCKED",
            "ok": False,
            "error": str(exc) if isinstance(exc, ValueError) else "source_locator_write_failed",
        }

    return EXIT_PASS, {
        "schemaVersion": "1.0.0",
        "command": "map-source",
        "slug": slug,
        "sourceId": source_id,
        "status": "PASS",
        "ok": True,
        "path": registered["path"],
        "sha256": registered["sha256"],
        "access": registered["access"],
        "manifestPath": registered["manifestPath"],
    }


def run_review_command(
    slug: str,
    *,
    root_dir: str | Path = ".",
    evidence_dir: str | Path | None = None,
    model: str = DEFAULT_GEMINI_MODEL,
    output_path: str | Path | None = None,
    agy_bin: str = "agy",
    runner: RunnerCallable | None = None,
    base_env: Mapping[str, str] | None = None,
    gemini_reviewer: Callable[..., GeminiReviewResult] | None = None,
    allow_private_source_review: bool = False,
) -> tuple[int, dict[str, Any]]:
    """執行 `review` 子命令：

    1. 驗證路徑與輸出位置（必須位於 `<root>/.research-verification/` 下）。
    2. 先執行確定性驗證 `validate_research_package`。
    3. 讀取實際 `research-package.json`、章節（與已產生的 Full Report，若存在）及 `inspect_sources_and_evidence` 結果。
    4. 為每個來源建立明確的 `sourceEvidence` 項目；受限來源標記為 unavailable（不傳送給 Gemini），缺失來源保持 unavailable（不捏造摘錄）。
    5. 若確定性驗證非 PASS、或 `validate_review_context` 政策阻擋，則不呼叫 Gemini（`modelInvoked=False`），直接寫入本機 BLOCKED 紀錄。
    6. 僅在確定性驗證為 PASS 且 `validate_review_context` 通過時呼叫 `run_gemini_review`。
    7. 將完整審查紀錄以原子方式寫入 `.research-verification/<slug>/<packageHash>/gemini-review.json`（或允許之 `.research-verification/` 路徑），並回傳精簡公開 JSON 摘要。
    """
    started_at_utc = _utc_now_iso()
    target_model = (model or DEFAULT_GEMINI_MODEL).strip() or DEFAULT_GEMINI_MODEL

    root_resolved, _, root_err = _resolve_and_check_root_slug(root_dir, slug)
    if root_err is not None:
        return EXIT_BLOCKED, {
            "schemaVersion": "1.0.0",
            "command": "review",
            "slug": str(slug),
            "status": REVIEW_STATUS_BLOCKED,
            "ok": False,
            "model": target_model,
            "modelInvoked": False,
            "startedAtUtc": started_at_utc,
            "completedAtUtc": _utc_now_iso(),
            "blockedReasons": [root_err],
            "recordPath": None,
        }

    clean_slug = slug.strip()

    # 驗證 --evidence-dir（若有提供）必須位於 root 之下
    resolved_ev_dir: Path | None = None
    if evidence_dir is not None:
        try:
            cand_ev = Path(evidence_dir)
            resolved_ev_dir = (cand_ev if cand_ev.is_absolute() else (root_resolved / cand_ev)).resolve()
            resolved_ev_dir.relative_to(root_resolved)
        except (OSError, ValueError):
            return EXIT_BLOCKED, {
                "schemaVersion": "1.0.0",
                "command": "review",
                "slug": clean_slug,
                "status": REVIEW_STATUS_BLOCKED,
                "ok": False,
                "model": target_model,
                "modelInvoked": False,
                "startedAtUtc": started_at_utc,
                "completedAtUtc": _utc_now_iso(),
                "blockedReasons": ["指定的 --evidence-dir 必須位於 root 目錄之下。"],
                "recordPath": None,
            }

    # 第一步：執行確定性驗證
    det_result = validate_research_package(
        slug=clean_slug,
        root_dir=root_resolved,
        evidence_dir=resolved_ev_dir,
    )
    det_status = str(det_result.get("status") or "BLOCKED")
    hashes: dict[str, str] = {
        "packageHash": str(det_result.get("packageHash") or ""),
        "manifestHash": str(det_result.get("manifestHash") or ""),
        "profileHash": str(det_result.get("profileHash") or ""),
        "evidenceHash": str(det_result.get("evidenceHash") or ""),
        "recomputeHash": str(det_result.get("recomputeHash") or ""),
        "policyHash": str(det_result.get("policyHash") or compute_policy_hash()),
        "verifierCodeHash": str(det_result.get("verifierCodeHash") or compute_verifier_code_hash(root_resolved)),
        "checksHash": str(det_result.get("checksHash") or ""),
    }

    # 檢查並解析輸出檔案路徑（拒絕任何位於 <root>/.research-verification 之外的路徑）
    resolved_out_path, rel_out_path, out_err = _resolve_and_check_output_path(
        root_resolved,
        clean_slug,
        hashes["packageHash"],
        output_path,
    )
    if out_err is not None or resolved_out_path is None or rel_out_path is None:
        return EXIT_BLOCKED, {
            "schemaVersion": "1.0.0",
            "command": "review",
            "slug": clean_slug,
            "status": REVIEW_STATUS_BLOCKED,
            "ok": False,
            "deterministicStatus": det_status,
            "model": target_model,
            "modelInvoked": False,
            "startedAtUtc": started_at_utc,
            "completedAtUtc": _utc_now_iso(),
            "hashes": hashes,
            "blockedReasons": [out_err or "不合法的輸出路徑。"],
            "recordPath": None,
        }

    # 讀取實際 research-package.json 與本機證據檢查結果
    pkg_path = root_resolved / "research" / clean_slug / "research-package.json"
    pkg_doc = _load_json_quietly(pkg_path) or {}
    evidence_report = inspect_sources_and_evidence(
        pkg_doc,
        root_dir=root_resolved,
        slug=clean_slug,
        evidence_dir=resolved_ev_dir,
        pkg_rel_file=f"research/{clean_slug}/research-package.json",
    )

    report_sections, full_report_obj, report_html_text = _build_report_sections_context(
        pkg_doc, root_resolved, clean_slug
    )
    source_evidence, restricted_blocked_ids, unavailable_required_ids = _build_source_evidence_for_gemini(
        pkg_doc, evidence_report, allow_private_source_review=allow_private_source_review
    )

    deterministic_checks_payload = {
        "status": det_status,
        "ok": bool(det_result.get("ok")),
        "counts": det_result.get("counts") or {},
        "blockedIds": det_result.get("blockedIds") or [],
        "notVerifiedIds": det_result.get("notVerifiedIds") or [],
        "missingRequiredSources": det_result.get("missingRequiredSources") or [],
        "checks": det_result.get("checks") or [],
    }

    review_context: dict[str, Any] = {
        "company": pkg_doc.get("company") if isinstance(pkg_doc.get("company"), Mapping) else det_result.get("company") or {},
        "package": pkg_doc,
        "deterministicChecks": deterministic_checks_payload,
        "reportSections": report_sections,
        "sourceEvidence": source_evidence,
    }
    if full_report_obj is not None:
        review_context["fullReport"] = full_report_obj
    if report_html_text:
        review_context["reportText"] = report_html_text

    blocked_reasons: list[str] = []
    if det_status != "PASS":
        blocked_reasons.append(
            f"確定性驗證狀態為 {det_status}（必須為 PASS 才允許執行外部模型審查）。"
        )
    if restricted_blocked_ids:
        blocked_reasons.append(
            "包含未授權送交 Gemini 審查的受限／私人券商來源："
            + ", ".join(restricted_blocked_ids)
        )
    if unavailable_required_ids:
        blocked_reasons.append(
            "缺少必要原始證據或來源對外部審查不可用：" + ", ".join(unavailable_required_ids)
        )

    # 驗證 review context 是否符合 Gemini 模組的政策
    context_policy_ok = False
    if not blocked_reasons:
        try:
            validate_review_context(review_context)
            context_policy_ok = True
        except GeminiReviewError as exc:
            blocked_reasons.append(f"[{exc.code}] {exc.message}")
        except Exception as exc:
            blocked_reasons.append(f"驗證 review context 失敗：{exc}")

    model_invoked = False
    gemini_result: GeminiReviewResult | None = None

    if det_status == "PASS" and context_policy_ok and not blocked_reasons:
        review_fn = run_gemini_review if gemini_reviewer is None else gemini_reviewer
        try:
            gemini_result = review_fn(
                review_context,
                model=target_model,
                agy_bin=agy_bin,
                base_env=base_env,
                runner=runner,
                raise_on_blocked=False,
            )
            # 只有當實際送出至少一個批次（產生 batch trace 或 prompt 雜湊）時，才代表模型確實被呼叫
            model_invoked = bool(gemini_result.batches)
        except GeminiReviewError as exc:
            blocked_reasons.append(f"[{exc.code}] {exc.message}")
        except Exception as exc:
            blocked_reasons.append(f"執行 Gemini 審查時發生未預期錯誤：{exc}")

    completed_at_utc = _utc_now_iso()

    if gemini_result is not None:
        final_status = (
            gemini_result.status
            if gemini_result.status in (REVIEW_STATUS_PASS, REVIEW_STATUS_PASS_WITH_P2, REVIEW_STATUS_BLOCKED)
            else REVIEW_STATUS_BLOCKED
        )
        if det_status != "PASS" or blocked_reasons:
            final_status = REVIEW_STATUS_BLOCKED
        all_blocked_reasons = list(dict.fromkeys(blocked_reasons + list(gemini_result.blocked_reasons)))
        severity_counts = (
            dict(gemini_result.summary.get("severityCounts"))
            if isinstance(gemini_result.summary.get("severityCounts"), Mapping)
            else {
                sev: sum(1 for f in gemini_result.findings if f.severity == sev)
                for sev in ("P0", "P1", "P2", "P3")
            }
        )
        finding_summary = {
            "totalBatches": len(gemini_result.batches),
            "totalFindings": len(gemini_result.findings),
            "severityCounts": severity_counts,
            "p3Count": len(gemini_result.p3_notes),
        }
        agy_meta_clean = {
            "model": gemini_result.model or target_model,
            "agyVersion": gemini_result.agy_version,
            "executable": _sanitize_executable_name(gemini_result.metadata.get("executable")),
            "verifiedAtUtc": gemini_result.metadata.get("verifiedAtUtc", ""),
            "availableModels": list(gemini_result.metadata.get("availableModels") or []),
            "errorCode": gemini_result.metadata.get("errorCode"),
        }
        prompt_sha256 = gemini_result.prompt_sha256
        response_sha256 = gemini_result.response_sha256
        findings_dicts = [f.to_dict() for f in gemini_result.findings]
        p3_dicts = [f.to_dict() for f in gemini_result.p3_notes]
        batches_dicts = [b.to_dict() for b in gemini_result.batches]
    else:
        final_status = REVIEW_STATUS_BLOCKED
        all_blocked_reasons = blocked_reasons or ["審查因前置條件未滿足而阻擋（BLOCKED）。"]
        finding_summary = {
            "totalBatches": 0,
            "totalFindings": 0,
            "severityCounts": {"P0": 0, "P1": 0, "P2": 0, "P3": 0},
            "p3Count": 0,
        }
        agy_meta_clean = {
            "model": target_model,
            "agyVersion": "",
            "executable": _sanitize_executable_name(agy_bin),
            "verifiedAtUtc": "",
            "availableModels": [],
            "errorCode": "PRECHECK_BLOCKED",
        }
        prompt_sha256 = ""
        response_sha256 = ""
        findings_dicts = []
        p3_dicts = []
        batches_dicts = []

    record_payload: dict[str, Any] = {
        "schemaVersion": "1.0.0",
        "policyVersion": VERIFICATION_POLICY_VERSION,
        "slug": clean_slug,
        "status": final_status,
        "ok": final_status in (REVIEW_STATUS_PASS, REVIEW_STATUS_PASS_WITH_P2),
        "deterministicStatus": det_status,
        "model": agy_meta_clean["model"],
        "reviewProvider": "codex-fallback" if gemini_result and gemini_result.metadata.get("provider") == "codex-fallback" else "agy-gemini",
        "assuranceLevel": "internal-fallback-review" if gemini_result and gemini_result.metadata.get("provider") == "codex-fallback" else "independent-model-review",
        "fallbackReason": str(gemini_result.metadata.get("fallbackReason") or "") if gemini_result else "",
        "agyVersion": agy_meta_clean["agyVersion"],
        "agyMetadata": agy_meta_clean,
        "modelInvoked": model_invoked,
        "startedAtUtc": gemini_result.started_at_utc if gemini_result else started_at_utc,
        "completedAtUtc": gemini_result.completed_at_utc if gemini_result else completed_at_utc,
        **hashes,
        "hashes": hashes,
        "promptSha256": prompt_sha256,
        "responseSha256": response_sha256,
        "findingSummary": finding_summary,
        "blockedReasons": all_blocked_reasons,
        "restrictedSourceIds": restricted_blocked_ids,
        "unavailableSourceIds": unavailable_required_ids,
        "sourceEvidenceSummary": _sanitize_public_source_evidence(source_evidence),
        "findings": findings_dicts,
        "p3Notes": p3_dicts,
    }
    # 僅在實際由 Gemini 模組提供原始批次 prompt/response 時，才保存於本機忽略目錄紀錄中
    if batches_dicts:
        record_payload["batches"] = batches_dicts

    try:
        _atomic_write_json(resolved_out_path, record_payload)
    except OSError as exc:
        return EXIT_BLOCKED, {
            "schemaVersion": "1.0.0",
            "command": "review",
            "slug": clean_slug,
            "status": REVIEW_STATUS_BLOCKED,
            "ok": False,
            "deterministicStatus": det_status,
            "model": target_model,
            "modelInvoked": model_invoked,
            "startedAtUtc": started_at_utc,
            "completedAtUtc": _utc_now_iso(),
            "hashes": hashes,
            "blockedReasons": [*all_blocked_reasons, f"寫入本機審查紀錄失敗：{exc.__class__.__name__}"],
            "recordPath": None,
        }

    # 建立公開安全的 stdout 摘要（絕不含原始證據 excerpt 或模型原始回應文字）
    stdout_summary: dict[str, Any] = {
        "schemaVersion": "1.0.0",
        "command": "review",
        "slug": clean_slug,
        "status": final_status,
        "ok": final_status in (REVIEW_STATUS_PASS, REVIEW_STATUS_PASS_WITH_P2),
        "deterministicStatus": det_status,
        "model": agy_meta_clean["model"],
        "reviewProvider": "codex-fallback" if gemini_result and gemini_result.metadata.get("provider") == "codex-fallback" else "agy-gemini",
        "assuranceLevel": "internal-fallback-review" if gemini_result and gemini_result.metadata.get("provider") == "codex-fallback" else "independent-model-review",
        "fallbackReason": str(gemini_result.metadata.get("fallbackReason") or "") if gemini_result else "",
        "agyVersion": agy_meta_clean["agyVersion"],
        "modelInvoked": model_invoked,
        "startedAtUtc": record_payload["startedAtUtc"],
        "completedAtUtc": record_payload["completedAtUtc"],
        "hashes": hashes,
        "findingSummary": finding_summary,
        "blockedReasons": all_blocked_reasons,
        "recordPath": rel_out_path,
    }

    exit_code = EXIT_PASS if final_status in (REVIEW_STATUS_PASS, REVIEW_STATUS_PASS_WITH_P2) else EXIT_BLOCKED
    return exit_code, stdout_summary


def build_arg_parser() -> argparse.ArgumentParser:
    """建立 `verification` 命令列參數解析器。"""
    parser = _CliArgumentParser(
        prog="python -m verification",
        description="獨立研究報告驗證與本機 Gemini 審查命令列工具。",
    )
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    map_source_parser = subparsers.add_parser(
        "map-source",
        help="將本機證據檔相對路徑、SHA-256 與選填 Drive 檔案 ID 存入 Git 忽略的本機索引。",
    )
    map_source_parser.add_argument("slug", help="研究報告 slug（例如 umc-2303）。")
    map_source_parser.add_argument("--root", default=".", help="儲存庫根目錄路徑（預設為當前目錄）。")
    map_source_parser.add_argument("--source-id", required=True, help="research-package.json 內既有的來源 ID。")
    map_source_parser.add_argument("--path", required=True, help="repo 相對證據檔路徑，使用正斜線。")
    map_source_parser.add_argument(
        "--access",
        required=True,
        choices=("public", "restricted", "internal"),
        help="來源存取類別；券商或受限來源必須指定 restricted。",
    )
    map_source_parser.add_argument("--drive-file-id", default=None, help="選填的 Google Drive file ID，只存本機索引。")
    map_source_parser.add_argument("--drive-name", default=None, help="選填的 Drive 原始檔名，只存本機索引。")

    validate_parser = subparsers.add_parser(
        "validate",
        help="執行確定性研究 Package 驗證（Schema、參照、證據分類與財務重算）。",
    )
    validate_parser.add_argument("slug", help="研究報告 slug（例如 umc-2303）。")
    validate_parser.add_argument("--root", default=".", help="儲存庫根目錄路徑（預設為當前目錄）。")
    validate_parser.add_argument(
        "--evidence-dir",
        default=None,
        help="本機原始證據目錄路徑（選填，必須位於 --root 之下）。",
    )

    review_parser = subparsers.add_parser(
        "review",
        help="先執行確定性驗證，通過後以本機非互動 Agy 執行獨立 Gemini 審查並儲存紀錄。",
    )
    review_parser.add_argument("slug", help="研究報告 slug（例如 umc-2303）。")
    review_parser.add_argument("--root", default=".", help="儲存庫根目錄路徑（預設為當前目錄）。")
    review_parser.add_argument(
        "--evidence-dir",
        default=None,
        help="本機原始證據目錄路徑（選填，必須位於 --root 之下）。",
    )
    review_parser.add_argument(
        "--model",
        default=DEFAULT_GEMINI_MODEL,
        help=f"指定 Gemini 審查模型（預設：{DEFAULT_GEMINI_MODEL}）。",
    )
    review_parser.add_argument(
        "--allow-private-source-review",
        action="store_true",
        help="明確授權將本機受限券商證據摘錄送交 Agy/Gemini 私人審查；絕不寫入公開憑證。",
    )
    review_parser.add_argument(
        "--output",
        default=None,
        help="自訂審查紀錄輸出路徑（選填，必須位於 <root>/.research-verification/ 之下）。",
    )

    return parser


def run_cli(
    argv: Sequence[str] | None = None,
    *,
    stdout: TextIO | None = None,
    stderr: TextIO | None = None,
    runner: RunnerCallable | None = None,
    base_env: Mapping[str, str] | None = None,
    gemini_reviewer: Callable[..., GeminiReviewResult] | None = None,
) -> int:
    """解析 CLI 參數、執行對應子命令，並輸出單一 JSON 物件至 stdout。"""
    out_stream = sys.stdout if stdout is None else stdout
    _ = stderr  # 保留介面相容性；所有錯誤統一以 JSON 物件輸出並回傳非零狀態碼

    parser = build_arg_parser()
    try:
        args = parser.parse_args(list(argv) if argv is not None else None)
    except SystemExit as exc:
        code = int(exc.code) if isinstance(exc.code, int) else EXIT_BLOCKED
        return code
    except Exception as exc:
        err_payload = {
            "schemaVersion": "1.0.0",
            "status": REVIEW_STATUS_BLOCKED,
            "ok": False,
            "error": str(exc),
        }
        out_stream.write(json.dumps(err_payload, ensure_ascii=False) + "\n")
        out_stream.flush()
        return EXIT_BLOCKED

    if args.subcommand == "validate":
        exit_code, payload = run_validate_command(
            args.slug,
            root_dir=args.root,
            evidence_dir=args.evidence_dir,
        )
    elif args.subcommand == "map-source":
        exit_code, payload = run_map_source_command(
            args.slug,
            root_dir=args.root,
            source_id=args.source_id,
            source_path=args.path,
            access=args.access,
            drive_file_id=args.drive_file_id,
            drive_name=args.drive_name,
        )
    elif args.subcommand == "review":
        exit_code, payload = run_review_command(
            args.slug,
            root_dir=args.root,
            evidence_dir=args.evidence_dir,
            model=args.model,
            output_path=args.output,
            runner=runner,
            base_env=base_env,
            gemini_reviewer=gemini_reviewer,
            allow_private_source_review=args.allow_private_source_review,
        )
    else:  # pragma: no cover
        exit_code = EXIT_BLOCKED
        payload = {
            "schemaVersion": "1.0.0",
            "status": REVIEW_STATUS_BLOCKED,
            "ok": False,
            "error": f"不支援的子命令：{args.subcommand!r}",
        }

    out_stream.write(json.dumps(payload, ensure_ascii=False) + "\n")
    out_stream.flush()
    return exit_code


def main(argv: Sequence[str] | None = None) -> int:
    """CLI 進入點。"""
    return run_cli(argv)


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
