# -*- coding: utf-8 -*-
"""No network or paid model calls: fake Agy/Codex for automatic failover tests."""
from __future__ import annotations

import json
from pathlib import Path
import subprocess
import tempfile
import unittest

from .auto_review import infrastructure_failure, run_auto_review_command
from .test_cli import _populate_synthetic_root, _make_fake_agy_runner


class TestAutomaticFallback(unittest.TestCase):
    def test_exact_infrastructure_error_only(self):
        base = dict(status="BLOCKED", deterministicStatus="PASS",
                    modelInvoked=False, findingSummary={"totalFindings": 0})
        self.assertEqual(infrastructure_failure({
            **base, "blockedReasons":["[AGY_NOT_FOUND] absent"]}), "AGY_NOT_FOUND")
        for reason in ("[P1] EPS mismatch", "[INVALID_FINDING_SEVERITY] wrong",
                       "[REQUIRED_SOURCE_MISSING] lost", "[AGY_WRAPPER_ERROR] invalid"):
            self.assertIsNone(infrastructure_failure({**base, "blockedReasons":[reason]}))
        self.assertIsNone(infrastructure_failure({
            **base, "modelInvoked":True, "blockedReasons":["[AGY_TIMEOUT] late"]}))
        self.assertIsNone(infrastructure_failure({
            **base, "findingSummary":{"totalFindings":1},
            "blockedReasons":["[AGY_TIMEOUT] late"]}))
        self.assertIsNone(infrastructure_failure({
            **base, "deterministicStatus":"NOT_VERIFIED",
            "blockedReasons":["[AGY_NOT_FOUND] absent"]}))

    @staticmethod
    def _codex_runner(calls, *, severity=None, invalid_scope=False, malformed=False):
        def runner(args, **kwargs):
            args = list(args)
            calls.append(args)
            if "--version" in args:
                return subprocess.CompletedProcess(args, 0, "codex-cli 1.0.0-test\n", "")
            text = kwargs["input"]
            ctx = json.loads(text.split("CONTEXT_JSON:\n", 1)[1])
            batch = ctx["batch"]
            scope = batch["scope"]
            finding = {
                "claim": "2025 FY 毛利率", "file": "research/acme-1234/research-package.json",
                "jsonPointer": "/actuals/0/grossMargin",
                "sourceIds": ["src-official-fs"], "sourceLocation": "Page 1",
                "expected": "40.0%", "actual": "42.0%", "difference": "2pp",
                "severity": severity, "risk": "高估獲利", "disclosureLocation": None,
                "remediation": "依官方資料修正",
            }
            result = {
                "schemaVersion": "1.0.0",
                "batchId": batch["batchId"],
                "reviewedScope": {key: scope[key] for key in ("sectionIds", "collections", "sourceIds")},
                "summary": "測試用離線 Codex 回應",
                "findings": [finding] if severity else [],
            }
            if invalid_scope:
                result["reviewedScope"]["sourceIds"] = []
            answer = Path(args[args.index("--output-last-message") + 1])
            answer.write_text("{invalid" if malformed else json.dumps(result), encoding="utf-8")
            return subprocess.CompletedProcess(args, 0, "", "")
        return runner

    def test_missing_agy_uses_codex_and_writes_separate_records(self):
        with tempfile.TemporaryDirectory() as dirname:
            root = Path(dirname)
            _populate_synthetic_root(root, slug="acme-1234", include_evidence_files=True)
            agy_runner, _ = _make_fake_agy_runner(raise_not_found=True)
            calls = []
            code, result = run_auto_review_command(
                "acme-1234", root_dir=root,
                agy_runner=agy_runner, codex_runner=self._codex_runner(calls),
            )
            self.assertEqual(code, 0, result.get("blockedReasons"))
            self.assertEqual(result["status"], "PASS")
            self.assertEqual(result["reviewProvider"], "codex-fallback")
            self.assertEqual(result["fallbackReason"], "AGY_NOT_FOUND")
            self.assertTrue(result["modelInvoked"])
            self.assertTrue(result["recordPath"].endswith("/codex-review.json"))
            self.assertTrue((root / result["recordPath"]).is_file())
            self.assertTrue((root / result["agyRecordPath"]).is_file())
            self.assertTrue(any("--sandbox" in cmd and "read-only" in cmd for cmd in calls))
            self.assertTrue(any("--ephemeral" in cmd for cmd in calls))
            record = json.loads((root / result["recordPath"]).read_text(encoding="utf-8"))
            self.assertEqual(record["reviewProvider"], "codex-fallback")
            self.assertEqual(record["assuranceLevel"], "internal-fallback-review")
            self.assertEqual(record["fallbackReason"], "AGY_NOT_FOUND")

    def test_agy_p1_cannot_be_overridden_by_codex(self):
        with tempfile.TemporaryDirectory() as dirname:
            root = Path(dirname)
            _populate_synthetic_root(root, slug="acme-1234", include_evidence_files=True)
            finding = {
                "claim":"2025 FY 毛利率", "file":"research/acme-1234/research-package.json",
                "jsonPointer":"/actuals/0/grossMargin", "sourceIds":["src-official-fs"],
                "sourceLocation":"Page 1", "expected":"40.0%", "actual":"42.0%",
                "difference":"2pp", "severity":"P1", "risk":"高估獲利",
                "disclosureLocation":None, "remediation":"修正為 40%",
            }
            agy_runner, _ = _make_fake_agy_runner(findings=[finding])
            calls = []
            code, result = run_auto_review_command(
                "acme-1234", root_dir=root, agy_runner=agy_runner,
                codex_runner=self._codex_runner(calls)
            )
            self.assertNotEqual(code, 0)
            self.assertEqual(result["status"], "BLOCKED")
            self.assertFalse(result["fallbackUsed"])
            self.assertEqual(calls, [])

    def test_missing_evidence_stops_before_fallback(self):
        with tempfile.TemporaryDirectory() as dirname:
            root = Path(dirname)
            _populate_synthetic_root(root, slug="acme-1234", include_evidence_files=False)
            agy_runner, _ = _make_fake_agy_runner(raise_not_found=True)
            calls = []
            code, result = run_auto_review_command(
                "acme-1234", root_dir=root, agy_runner=agy_runner,
                codex_runner=self._codex_runner(calls))
            self.assertNotEqual(code, 0)
            self.assertEqual(result["status"], "BLOCKED")
            self.assertFalse(result["fallbackUsed"])
            self.assertEqual(calls, [])

    def test_codex_bad_response_or_p1_still_blocked(self):
        for mode in ("malformed", "invalid_scope", "p1"):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as dirname:
                root = Path(dirname)
                _populate_synthetic_root(root, slug="acme-1234", include_evidence_files=True)
                agy_runner, _ = _make_fake_agy_runner(raise_not_found=True)
                runner = self._codex_runner([], severity="P1" if mode=="p1" else None,
                                            invalid_scope=mode=="invalid_scope",
                                            malformed=mode=="malformed")
                code, result = run_auto_review_command(
                    "acme-1234", root_dir=root,
                    agy_runner=agy_runner, codex_runner=runner,
                )
                self.assertNotEqual(code, 0)
                self.assertEqual(result["status"], "BLOCKED")


if __name__ == "__main__":
    unittest.main()
