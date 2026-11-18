# -*- coding: utf-8 -*-
"""本機獨立研究驗證 CLI 單元測試。

完全使用臨時合成目錄（synthetic roots）與注入之 fake Gemini runner，
絕不呼叫真實 Agy、網路或寫入任何正式研究資料／證書。
"""

from __future__ import annotations

import io
import json
from pathlib import Path
import subprocess
import tempfile
from typing import Any, Sequence
import unittest

from .cli import (
    EXIT_BLOCKED,
    EXIT_NOT_VERIFIED,
    EXIT_PASS,
    run_cli,
    run_review_command,
    run_validate_command,
)
from .gemini_review import DEFAULT_GEMINI_MODEL


def _build_synthetic_schemas() -> tuple[dict[str, Any], dict[str, Any]]:
    """建立供測試臨時根目錄使用的 Manifest 與 Package JSON Schema（Draft 2020-12）。"""
    manifest_schema: dict[str, Any] = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "additionalProperties": False,
        "required": [
            "schemaVersion",
            "ticker",
            "market",
            "slug",
            "reportVersion",
            "output",
            "quality",
        ],
        "properties": {
            "schemaVersion": {"const": "1.0.0"},
            "ticker": {"type": "string"},
            "market": {"type": "string"},
            "slug": {"type": "string"},
            "reportVersion": {"type": "string"},
            "output": {
                "type": "object",
                "additionalProperties": False,
                "required": ["dashboard", "fullReport", "standalone"],
                "properties": {
                    "dashboard": {"type": "boolean"},
                    "fullReport": {"type": "boolean"},
                    "standalone": {"type": "boolean"},
                },
            },
            "quality": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "checkOverflow",
                    "checkOverlap",
                    "checkSources",
                    "desktopTest",
                    "mobileTest",
                    "offlineStandaloneTest",
                ],
                "properties": {
                    "checkOverflow": {"type": "boolean"},
                    "checkOverlap": {"type": "boolean"},
                    "checkSources": {"type": "boolean"},
                    "desktopTest": {"type": "boolean"},
                    "mobileTest": {"type": "boolean"},
                    "offlineStandaloneTest": {"type": "boolean"},
                },
            },
        },
    }

    package_schema: dict[str, Any] = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "required": [
            "schemaVersion",
            "packageVersion",
            "asOfDate",
            "company",
            "report",
            "thesis",
            "dashboard",
            "actuals",
            "monthlyRevenue",
            "segments",
            "forecasts",
            "capacity",
            "catalysts",
            "risks",
            "signalRules",
            "signalSnapshots",
            "sections",
            "sources",
            "claims",
        ],
        "properties": {
            "schemaVersion": {"const": "1.0.0"},
            "packageVersion": {"type": "string", "minLength": 1},
            "asOfDate": {"type": "string", "format": "date"},
            "company": {"type": "object"},
            "report": {"type": "object"},
            "thesis": {"type": "object"},
            "dashboard": {"type": "object"},
            "actuals": {"type": "array"},
            "monthlyRevenue": {"type": "array"},
            "segments": {"type": "array"},
            "forecasts": {"type": "array"},
            "capacity": {"type": "array"},
            "catalysts": {"type": "array"},
            "risks": {"type": "array"},
            "signalRules": {"type": "array"},
            "signalSnapshots": {"type": "array"},
            "sections": {"type": "array"},
            "sources": {"type": "array"},
            "claims": {"type": "array"},
            "earningsQuality": {"type": "object"},
            "valuation": {"type": "object"},
        },
    }
    return manifest_schema, package_schema


def _populate_synthetic_root(
    root: Path,
    slug: str = "acme-1234",
    *,
    include_evidence_files: bool = True,
    include_restricted_source: bool = False,
    make_recompute_blocked: bool = False,
    structured_pe_valuation: bool = True,
) -> dict[str, Any]:
    """在臨時目錄建立完整可通過（或依參數觸發 NOT_VERIFIED / BLOCKED）的合成研究 Package。"""
    schema_dir = root / "research_system" / "schemas"
    schema_dir.mkdir(parents=True, exist_ok=True)
    manifest_schema, package_schema = _build_synthetic_schemas()
    (schema_dir / "research-manifest-v1.schema.json").write_text(
        json.dumps(manifest_schema, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (schema_dir / "research-package-v1.schema.json").write_text(
        json.dumps(package_schema, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    pkg_dir = root / "research" / slug
    sources_dir = pkg_dir / "sources"
    sources_dir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "schemaVersion": "1.0.0",
        "ticker": "1234",
        "market": "TW",
        "slug": slug,
        "reportVersion": "1.0",
        "output": {"dashboard": True, "fullReport": True, "standalone": True},
        "quality": {
            "checkOverflow": True,
            "checkOverlap": True,
            "checkSources": True,
            "desktopTest": True,
            "mobileTest": True,
            "offlineStandaloneTest": True,
        },
    }

    profiles = {
        "schemaVersion": "1.0.0",
        "profiles": {
            "full-research": {
                "kind": "generated",
                "output": f"public/research/reports/{slug}.html",
                "layout": "research-standard-v2",
                "expectedPages": 8,
                "sections": ["package-sections"],
            }
        },
    }

    sources_list: list[dict[str, Any]] = [
        {
            "id": "src-official-fs",
            "evidenceClass": "official",
            "provider": "ACME Official Filing",
            "title": "2025 Annual & 2026Q1 Financial Statement",
            "url": "https://example.com/acme-2025-fs",
            "publishedDate": "2026-04-15",
            "accessedDate": "2026-11-14",
            "coveredPeriods": ["2025FY", "2026/01-2026/02"],
            "confidence": "high",
            "notes": "官方財報與月營收公告。",
        },
        {
            "id": "src-model",
            "evidenceClass": "research_inference",
            "provider": "Internal Research Model",
            "title": "ACME 2027F Valuation Model",
            "publishedDate": "2026-11-14",
            "accessedDate": "2026-11-14",
            "coveredPeriods": ["2027F"],
            "confidence": "medium",
            "notes": "自建研究推論模型。",
        },
    ]

    if include_restricted_source:
        sources_list.append(
            {
                "id": "src-broker-private",
                "evidenceClass": "third_party_fact",
                "provider": "第一金證券投顧",
                "title": "私人券商研究報告：2027F EPS 預估",
                "publishedDate": "2026-11-01",
                "accessedDate": "2026-11-14",
                "coveredPeriods": ["2027F"],
                "confidence": "medium",
                "notes": "狼友小站內部授權資料；不公開原始報告內容。",
            }
        )

    gross_margin_val = 55.0 if make_recompute_blocked else 40.0

    valuation_block: dict[str, Any] = {
        "epsBasis": "normalized",
        "doubleCountChecked": True,
        "notes": "2027F EPS 6.00 元 × 15 倍 PE = 合理價 90.00 元。",
    }
    if structured_pe_valuation:
        valuation_block.update(
            {
                "eps": 6.0,
                "multiple": 15.0,
                "fairValue": 90.0,
                "sourceIds": ["src-model"],
            }
        )

    pkg: dict[str, Any] = {
        "schemaVersion": "1.0.0",
        "packageVersion": "1.0.0",
        "asOfDate": "2026-11-14",
        "company": {
            "id": slug,
            "ticker": "1234",
            "market": "TW",
            "name": "合成測試股份有限公司",
            "slug": slug,
            "sector": "半導體",
            "industry": "測試產業",
            "currency": "TWD",
        },
        "report": {
            "id": f"{slug}-report-v1",
            "title": "合成測試 1234｜獨立驗證測試報告",
            "slug": slug,
            "status": "published",
            "version": "1.0",
            "publishedAt": "2026-11-14",
        },
        "thesis": {
            "summary": "2025A 營收 1,000 百萬元，2027F 營收 1,210 百萬元（CAGR 10%）。",
            "coreChain": ["營收成長", "毛利穩定", "合理估值"],
            "claimIds": ["claim-actual-2025", "claim-forecast-2027"],
        },
        "dashboard": {
            "currentView": "營運穩健成長。",
            "verificationChain": ["月營收", "財報三率", "估值"],
            "conclusion": "維持中性偏正向看法。",
            "forecastScenario": "consensus",
            "headlineForecastYears": [2027],
            "focusMetric": {"field": "revenue", "label": "營收"},
            "monthlyRevenue": {
                "focusYear": 2026,
                "cumulativeThroughMonth": 2,
                "unitDivisor": 1,
                "unitLabel": "百萬元",
            },
            "cagrCards": [
                {
                    "field": "revenue",
                    "label": "2025A至2027F營收CAGR",
                    "baseYear": 2025,
                    "targetYear": 2027,
                    "baseValue": 1000,
                    "years": 2,
                },
                {
                    "field": "eps",
                    "label": "2025A至2027F EPS CAGR",
                    "baseYear": 2025,
                    "targetYear": 2027,
                    "baseValue": 5.0,
                    "years": 2,
                },
            ],
            "estimateNote": "2027F 為自建模型推估，已於報告明確揭露假設限制。",
        },
        "actuals": [
            {
                "id": "act-2025fy",
                "period": "2025FY",
                "fiscalYear": 2025,
                "quarter": None,
                "revenue": 1000.0,
                "grossProfit": 400.0,
                "grossMargin": gross_margin_val,
                "operatingIncome": 200.0,
                "operatingMargin": 20.0,
                "netIncome": 150.0,
                "netMargin": 15.0,
                "eps": 5.0,
                "currency": "TWD",
                "scale": "million",
                "evidenceClass": "official",
                "sourceIds": ["src-official-fs"],
                "claimIds": ["claim-actual-2025"],
            }
        ],
        "monthlyRevenue": [
            {
                "id": "m-2026-01",
                "year": 2026,
                "month": 1,
                "revenue": 100.0,
                "mom": None,
                "yoy": None,
                "currency": "TWD",
                "scale": "million",
                "evidenceClass": "official",
                "sourceIds": ["src-official-fs"],
                "claimIds": [],
            },
            {
                "id": "m-2026-02",
                "year": 2026,
                "month": 2,
                "revenue": 110.0,
                "mom": 10.0,
                "yoy": None,
                "currency": "TWD",
                "scale": "million",
                "evidenceClass": "official",
                "sourceIds": ["src-official-fs"],
                "claimIds": [],
            },
        ],
        "segments": [
            {
                "id": "seg-2025-core",
                "period": "2025FY",
                "segment": "核心晶圓",
                "revenue": 1000.0,
                "share": 100.0,
                "isEstimate": False,
                "currency": "TWD",
                "scale": "million",
                "evidenceClass": "official",
                "sourceIds": ["src-official-fs"],
                "claimIds": ["claim-actual-2025"],
            }
        ],
        "forecasts": [
            {
                "id": "fc-2027-consensus",
                "fiscalYear": 2027,
                "scenario": "consensus",
                "revenue": 1210.0,
                "grossMargin": 42.0,
                "netIncome": 180.0,
                "eps": 6.0,
                "optoShare": None,
                "currency": "TWD",
                "scale": "million",
                "evidenceClass": "research_inference",
                "sourceIds": ["src-model"],
                "claimIds": ["claim-forecast-2027"],
                "notes": "2027F 基準情境推估。",
            }
        ],
        "capacity": [],
        "catalysts": [],
        "risks": [],
        "signalRules": [],
        "signalSnapshots": [],
        "sections": [
            {
                "id": "sec-summary",
                "type": "summary",
                "title": "投資摘要與財務檢核",
                "sortOrder": 1,
                "payloadRefs": ["thesis", "actuals", "forecasts", "earningsQuality"],
                "showSources": True,
            },
            {
                "id": "sec-sources",
                "type": "sources",
                "title": "來源與方法",
                "sortOrder": 2,
                "payloadRefs": ["sources", "monthlyRevenue"],
                "showSources": True,
            },
        ],
        "sources": sources_list,
        "claims": [
            {
                "id": "claim-actual-2025",
                "text": "2025FY 營收 1,000 百萬元、毛利率 40.0%、EPS 5.00 元。",
                "evidenceClass": "official",
                "sourceIds": ["src-official-fs"],
                "inputClaimIds": [],
                "method": "財報直接核對。",
                "confidence": "high",
            },
            {
                "id": "claim-forecast-2027",
                "text": "2027F 營收 1,210 百萬元、EPS 6.00 元。",
                "evidenceClass": "research_inference",
                "sourceIds": (
                    ["src-model", "src-broker-private"]
                    if include_restricted_source
                    else ["src-model"]
                ),
                "inputClaimIds": ["claim-actual-2025"],
                "method": "自建模型推算。",
                "confidence": "medium",
            },
        ],
        "earningsQuality": {
            "standard": "EQ-01-v1",
            "reviewStatus": "PASS",
            "reviewer": "Synthetic Unit Test",
            "reviewedAt": "2026-11-14",
            "coverageNote": "完整涵蓋 2025FY 實績。",
            "periods": [
                {
                    "id": "eq-2025fy",
                    "period": "2025FY",
                    "periodType": "annual",
                    "currency": "TWD",
                    "scale": "million",
                    "revenue": 1000.0,
                    "operatingIncome": 200.0,
                    "nonOperatingNet": 0.0,
                    "pretaxIncome": 200.0,
                    "incomeTax": 50.0,
                    "netIncomeAttributable": 150.0,
                    "reportedEps": 5.0,
                    "normalizedEps": 5.0,
                    "weightedAverageShares": 30.0,
                    "shareholdersEquity": 800.0,
                    "adjustments": [],
                    "sourceIds": ["src-official-fs"],
                    "claimIds": ["claim-actual-2025"],
                    "normalizationNote": "無特殊業外調整項目。",
                }
            ],
            "qualitativeFlags": [],
            "l2": {
                "status": "PASS",
                "summary": "無異常業外項目。",
                "sourceIds": ["src-official-fs"],
                "claimIds": ["claim-actual-2025"],
            },
            "valuation": valuation_block,
            "notes": "測試用盈餘品質資料。",
        },
    }

    (pkg_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (pkg_dir / "report-profiles.json").write_text(
        json.dumps(profiles, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (pkg_dir / "research-package.json").write_text(
        json.dumps(pkg, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    if include_evidence_files:
        (sources_dir / "src-official-fs.txt").write_text(
            "UNIQUE_OFFICIAL_EVIDENCE_EXCERPT_987654: 2025FY revenue=1000, grossProfit=400, "
            "operatingIncome=200, netIncome=150, shares=30, EPS=5.0. 2026-01 rev=100, 2026-02 rev=110.",
            encoding="utf-8",
        )
        if include_restricted_source:
            (sources_dir / "src-broker-private.txt").write_text(
                ("BROKER_PRIVATE_BODY " * 260)
                + "SECRET_BROKER_PRIVATE_CONTENT_DO_NOT_UPLOAD: 第一金投顧內部報告全文。",
                encoding="utf-8",
            )

    # 同時建立一份公開報告 HTML 供檢驗 reportSections / fullReport 整合
    report_dir = root / "public" / "research" / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    (report_dir / f"{slug}.html").write_text(
        "<!doctype html><html><body><section id='sec-summary' class='page'>"
        "<h1>合成測試 1234</h1><p>2027F 為自建模型推估，已於報告明確揭露假設限制。</p>"
        "</section></body></html>",
        encoding="utf-8",
    )

    return pkg


def _make_fake_agy_runner(
    *,
    available_models: Sequence[str] = (DEFAULT_GEMINI_MODEL, "gemini-4-argon-low"),
    findings: list[dict[str, Any]] | None = None,
    version_returncode: int = 0,
    models_returncode: int = 0,
    review_returncode: int = 0,
    wrapper_status: str = "SUCCESS",
    raw_review_stdout_override: str | None = None,
    raise_timeout_on_review: bool = False,
    raise_not_found: bool = False,
) -> tuple[Any, list[list[str]]]:
    """建立可記錄所有呼叫參數的 fake subprocess runner，絕不接觸真實 Agy。"""
    recorded_calls: list[list[str]] = []

    def _runner(args: Sequence[str], **kwargs: Any) -> subprocess.CompletedProcess[str]:
        cmd_list = [str(x) for x in args]
        recorded_calls.append(cmd_list)

        if raise_not_found:
            raise FileNotFoundError("Simulated agy binary missing")

        if "--version" in cmd_list:
            return subprocess.CompletedProcess(
                args=cmd_list,
                returncode=version_returncode,
                stdout="agy-cli 2.4.0-test\n" if version_returncode == 0 else "",
                stderr="" if version_returncode == 0 else "version error",
            )

        if len(cmd_list) >= 2 and cmd_list[1] == "models":
            return subprocess.CompletedProcess(
                args=cmd_list,
                returncode=models_returncode,
                stdout=json.dumps({"models": list(available_models)}) if models_returncode == 0 else "",
                stderr="" if models_returncode == 0 else "models error",
            )

        if raise_timeout_on_review:
            raise subprocess.TimeoutExpired(cmd=cmd_list, timeout=kwargs.get("timeout", 10.0))

        if raw_review_stdout_override is not None:
            stdout_str = raw_review_stdout_override
        else:
            inner_response = {
                "schemaVersion": "1.0.0",
                "batchId": "batch-001",
                "reviewedScope": {
                    "sectionIds": ["sec-summary", "sec-sources"],
                    "collections": ["actuals", "forecasts"],
                    "sourceIds": ["src-official-fs", "src-model"],
                },
                "summary": "MOCK_RAW_MODEL_SUMMARY_DO_NOT_LEAK_TO_STDOUT",
                "findings": findings if findings is not None else [],
            }
            wrapper = {
                "status": wrapper_status,
                "response": json.dumps(inner_response, ensure_ascii=False),
            }
            stdout_str = json.dumps(wrapper, ensure_ascii=False)

        return subprocess.CompletedProcess(
            args=cmd_list,
            returncode=review_returncode,
            stdout=stdout_str,
            stderr="" if review_returncode == 0 else "review cli error",
        )

    return _runner, recorded_calls


class VerificationCliTestCase(unittest.TestCase):
    """驗證 `verification` 本機 CLI 的所有安全與功能要求。"""

    def test_validate_pass_and_not_verified_exit_behavior(self) -> None:
        """測試 `validate` 在 PASS 時回傳 exit 0，在 NOT_VERIFIED 或 BLOCKED 時回傳非零，且輸出單一 JSON。"""
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            _populate_synthetic_root(root, slug="acme-1234", include_evidence_files=True)

            # 1. 所有證據與重算齊備 -> PASS (exit 0)
            out_pass = io.StringIO()
            code_pass = run_cli(["validate", "acme-1234", "--root", str(root)], stdout=out_pass)
            self.assertEqual(code_pass, EXIT_PASS)
            payload_pass = json.loads(out_pass.getvalue())
            self.assertEqual(payload_pass["status"], "PASS")
            self.assertTrue(payload_pass["ok"])
            self.assertEqual(payload_pass["counts"]["BLOCKED"], 0)
            self.assertEqual(payload_pass["counts"]["NOT_VERIFIED"], 0)
            self.assertNotIn("UNIQUE_OFFICIAL_EVIDENCE_EXCERPT_987654", out_pass.getvalue())

        with tempfile.TemporaryDirectory() as tmp_dir_nv:
            root_nv = Path(tmp_dir_nv)
            # 2. 移除本機證據檔 -> NOT_VERIFIED (非零退出)
            _populate_synthetic_root(root_nv, slug="acme-1234", include_evidence_files=False)
            out_nv = io.StringIO()
            code_nv = run_cli(["validate", "acme-1234", "--root", str(root_nv)], stdout=out_nv)
            self.assertNotEqual(code_nv, EXIT_PASS)
            self.assertEqual(code_nv, EXIT_NOT_VERIFIED)
            payload_nv = json.loads(out_nv.getvalue())
            self.assertEqual(payload_nv["status"], "NOT_VERIFIED")
            self.assertFalse(payload_nv["ok"])
            official_src_records = [
                rec for rec in payload_nv["sources"] if rec.get("sourceId") == "src-official-fs"
            ]
            self.assertEqual(len(official_src_records), 1)
            self.assertEqual(official_src_records[0]["status"], "NOT_VERIFIED")
            self.assertFalse(official_src_records[0]["hasLocalEvidenceFile"])

        with tempfile.TemporaryDirectory() as tmp_dir_blk:
            root_blk = Path(tmp_dir_blk)
            # 3. 故意製造毛利率重算不符 -> BLOCKED (非零退出)
            _populate_synthetic_root(
                root_blk,
                slug="acme-1234",
                include_evidence_files=True,
                make_recompute_blocked=True,
            )
            out_blk = io.StringIO()
            code_blk = run_cli(["validate", "acme-1234", "--root", str(root_blk)], stdout=out_blk)
            self.assertEqual(code_blk, EXIT_BLOCKED)
            payload_blk = json.loads(out_blk.getvalue())
            self.assertEqual(payload_blk["status"], "BLOCKED")
            self.assertFalse(payload_blk["ok"])

    def test_review_blocked_without_model_invocation_when_source_missing_or_restricted_or_det_not_pass(self) -> None:
        """測試當來源缺失、受限或確定性驗證非 PASS 時，review 必為 BLOCKED、不呼叫模型且仍保存本機紀錄。"""
        # 情況 A：缺少本機原始證據檔（deterministic 為 NOT_VERIFIED 且來源 unavailable）
        with tempfile.TemporaryDirectory() as tmp_missing:
            root = Path(tmp_missing)
            _populate_synthetic_root(root, slug="acme-1234", include_evidence_files=False)
            runner, calls = _make_fake_agy_runner()
            out_buf = io.StringIO()
            code = run_cli(
                ["review", "acme-1234", "--root", str(root)],
                stdout=out_buf,
                runner=runner,
            )
            self.assertEqual(code, EXIT_BLOCKED)
            self.assertEqual(len(calls), 0, "缺證據時絕不可呼叫 Agy/Gemini")

            summary = json.loads(out_buf.getvalue())
            self.assertEqual(summary["status"], "BLOCKED")
            self.assertFalse(summary["modelInvoked"])
            self.assertEqual(summary["deterministicStatus"], "NOT_VERIFIED")
            self.assertTrue(summary["recordPath"].startswith(".research-verification/acme-1234/"))

            saved_record = json.loads((root / summary["recordPath"]).read_text(encoding="utf-8"))
            self.assertEqual(saved_record["status"], "BLOCKED")
            self.assertFalse(saved_record["modelInvoked"])
            self.assertIn("src-official-fs", saved_record["unavailableSourceIds"])

        # 情況 B：包含受限券商來源（即使有本機 txt 且 deterministic 為 PASS，亦不得將私人券商內容上傳至 Gemini）
        with tempfile.TemporaryDirectory() as tmp_restricted:
            root_res = Path(tmp_restricted)
            _populate_synthetic_root(
                root_res,
                slug="acme-1234",
                include_evidence_files=True,
                include_restricted_source=True,
            )
            # 先確認 deterministic validate 在本機有檔案時為 PASS
            det_code, det_res = run_validate_command("acme-1234", root_dir=root_res)
            self.assertEqual(det_code, EXIT_PASS)
            self.assertEqual(det_res["status"], "PASS")

            runner_res, calls_res = _make_fake_agy_runner()
            out_res = io.StringIO()
            code_res = run_cli(
                ["review", "acme-1234", "--root", str(root_res)],
                stdout=out_res,
                runner=runner_res,
            )
            self.assertEqual(code_res, EXIT_BLOCKED)
            self.assertEqual(len(calls_res), 0, "含受限券商來源時絕不可呼叫外部 Gemini 模型")

            summary_res = json.loads(out_res.getvalue())
            self.assertEqual(summary_res["status"], "BLOCKED")
            self.assertFalse(summary_res["modelInvoked"])
            self.assertNotIn("SECRET_BROKER_PRIVATE_CONTENT_DO_NOT_UPLOAD", out_res.getvalue())

            saved_res = json.loads((root_res / summary_res["recordPath"]).read_text(encoding="utf-8"))
            self.assertEqual(saved_res["status"], "BLOCKED")
            self.assertFalse(saved_res["modelInvoked"])
            self.assertIn("src-broker-private", saved_res["restrictedSourceIds"])
            self.assertNotIn(
                "SECRET_BROKER_PRIVATE_CONTENT_DO_NOT_UPLOAD",
                json.dumps(saved_res, ensure_ascii=False),
            )

        # 情況 C：確定性驗證為 BLOCKED（例如 PE valuation 僅有自由文字而無結構化欄位，導致 deterministic 為 NOT_VERIFIED，或毛利率錯誤導致 BLOCKED）
        with tempfile.TemporaryDirectory() as tmp_det_blk:
            root_det = Path(tmp_det_blk)
            _populate_synthetic_root(
                root_det,
                slug="acme-1234",
                include_evidence_files=True,
                make_recompute_blocked=True,
            )
            runner_det, calls_det = _make_fake_agy_runner()
            code_det, summary_det = run_review_command(
                "acme-1234",
                root_dir=root_det,
                runner=runner_det,
            )
            self.assertEqual(code_det, EXIT_BLOCKED)
            self.assertEqual(len(calls_det), 0)
            self.assertFalse(summary_det["modelInvoked"])
            self.assertEqual(summary_det["deterministicStatus"], "BLOCKED")
            self.assertTrue((root_det / summary_det["recordPath"]).is_file())

    def test_successful_mock_review_stored_only_under_ignored_path_and_no_stdout_excerpts(self) -> None:
        """測試成功執行 mock review 時，完整紀錄存於預設 `.research-verification/<slug>/<packageHash>/gemini-review.json`，且 stdout 不含摘錄與原始模型輸出。"""
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            _populate_synthetic_root(root, slug="acme-1234", include_evidence_files=True)
            runner, calls = _make_fake_agy_runner(findings=[])

            out_buf = io.StringIO()
            code = run_cli(
                ["review", "acme-1234", "--root", str(root)],
                stdout=out_buf,
                runner=runner,
            )
            self.assertEqual(code, EXIT_PASS)
            self.assertGreaterEqual(len(calls), 3)  # --version, models, review batch

            stdout_raw = out_buf.getvalue()
            # 確保 stdout 不洩漏原始證據摘錄、不洩漏模型原始輸出、不洩漏本機臨時目錄絕對路徑
            self.assertNotIn("UNIQUE_OFFICIAL_EVIDENCE_EXCERPT_987654", stdout_raw)
            self.assertNotIn("MOCK_RAW_MODEL_SUMMARY_DO_NOT_LEAK_TO_STDOUT", stdout_raw)
            self.assertNotIn(str(root.resolve()), stdout_raw)

            summary = json.loads(stdout_raw)
            self.assertEqual(summary["status"], "PASS")
            self.assertTrue(summary["ok"])
            self.assertTrue(summary["modelInvoked"])
            self.assertEqual(summary["model"], DEFAULT_GEMINI_MODEL)

            pkg_hash = summary["hashes"]["packageHash"]
            expected_rel = f".research-verification/acme-1234/{pkg_hash}/gemini-review.json"
            self.assertEqual(summary["recordPath"], expected_rel)

            record_file = root / expected_rel
            self.assertTrue(record_file.is_file())
            record_data = json.loads(record_file.read_text(encoding="utf-8"))
            self.assertEqual(record_data["status"], "PASS")
            self.assertTrue(record_data["modelInvoked"])
            self.assertEqual(record_data["packageHash"], pkg_hash)
            self.assertTrue(record_data["manifestHash"])
            self.assertTrue(record_data["profileHash"])
            self.assertTrue(record_data["policyHash"])
            self.assertTrue(record_data["verifierCodeHash"])
            self.assertEqual(len(record_data["batches"]), 1)
            self.assertIn(
                "UNIQUE_OFFICIAL_EVIDENCE_EXCERPT_987654",
                record_data["batches"][0]["prompt"],
            )

    def test_private_broker_excerpt_requires_opt_in_and_stays_out_of_public_output(self) -> None:
        """明確啟用後才把本機券商摘錄送入私人審查；公開摘要不含摘錄。"""
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            _populate_synthetic_root(
                root,
                slug="acme-1234",
                include_evidence_files=True,
                include_restricted_source=True,
            )
            runner, calls = _make_fake_agy_runner(findings=[])
            out = io.StringIO()
            code = run_cli(
                [
                    "review", "acme-1234", "--root", str(root),
                    "--allow-private-source-review",
                ],
                stdout=out,
                runner=runner,
            )
            self.assertEqual(code, EXIT_PASS)
            self.assertGreaterEqual(len(calls), 3)
            public_summary = out.getvalue()
            self.assertNotIn("SECRET_BROKER_PRIVATE_CONTENT_DO_NOT_UPLOAD", public_summary)
            summary = json.loads(public_summary)
            self.assertTrue(summary["modelInvoked"])
            record = json.loads((root / summary["recordPath"]).read_text(encoding="utf-8"))
            self.assertEqual(record["restrictedSourceIds"], [])
            self.assertEqual(record["unavailableSourceIds"], [])
            self.assertIn(
                "SECRET_BROKER_PRIVATE_CONTENT_DO_NOT_UPLOAD",
                record["batches"][0]["prompt"],
            )
            broker_summary = next(
                source for source in record["sourceEvidenceSummary"]
                if source["sourceId"] == "src-broker-private"
            )
            self.assertTrue(broker_summary["restricted"])
            self.assertTrue(broker_summary["hasExcerpt"])
            self.assertNotIn(
                "SECRET_BROKER_PRIVATE_CONTENT_DO_NOT_UPLOAD",
                json.dumps(record["sourceEvidenceSummary"], ensure_ascii=False),
            )

    def test_outside_root_and_non_verification_output_paths_rejected(self) -> None:
        """測試拒絕任何位於 `<root>/.research-verification` 之外的 `--output` 路徑及非法 slug。"""
        with tempfile.TemporaryDirectory() as tmp_dir, tempfile.TemporaryDirectory() as outside_dir:
            root = Path(tmp_dir)
            _populate_synthetic_root(root, slug="acme-1234", include_evidence_files=True)
            runner, calls = _make_fake_agy_runner()

            forbidden_outputs = [
                str(Path(outside_dir) / "outside.json"),
                "public/research/reports/leaked.json",
                "research/acme-1234/gemini-review.json",
                ".research-verification/../escaped.json",
            ]
            for bad_out in forbidden_outputs:
                out_buf = io.StringIO()
                code = run_cli(
                    ["review", "acme-1234", "--root", str(root), "--output", bad_out],
                    stdout=out_buf,
                    runner=runner,
                )
                self.assertEqual(code, EXIT_BLOCKED)
                res = json.loads(out_buf.getvalue())
                self.assertEqual(res["status"], "BLOCKED")
                self.assertFalse(res["modelInvoked"])
                self.assertIsNone(res["recordPath"])
            self.assertEqual(len(calls), 0)

    def test_agy_and_model_and_runner_failures_remain_blocked(self) -> None:
        """測試 Agy 缺席、模型不可用、逾時、非零退出或格式錯誤時皆維持 fail-closed BLOCKED。"""
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            _populate_synthetic_root(root, slug="acme-1234", include_evidence_files=True)

            # 1. Agy 執行檔不存在
            runner_nf, _ = _make_fake_agy_runner(raise_not_found=True)
            code_nf, res_nf = run_review_command("acme-1234", root_dir=root, runner=runner_nf)
            self.assertEqual(code_nf, EXIT_BLOCKED)
            self.assertEqual(res_nf["status"], "BLOCKED")
            self.assertFalse(res_nf["modelInvoked"])

            # 2. 指定的模型不在 `agy models` 清單中
            runner_model, _ = _make_fake_agy_runner(available_models=("other-model-only",))
            code_m, res_m = run_review_command("acme-1234", root_dir=root, runner=runner_model)
            self.assertEqual(code_m, EXIT_BLOCKED)
            self.assertEqual(res_m["status"], "BLOCKED")
            self.assertFalse(res_m["modelInvoked"])

            # 3. 審查呼叫逾時
            runner_to, _ = _make_fake_agy_runner(raise_timeout_on_review=True)
            code_to, res_to = run_review_command("acme-1234", root_dir=root, runner=runner_to)
            self.assertEqual(code_to, EXIT_BLOCKED)
            self.assertEqual(res_to["status"], "BLOCKED")

            # 4. 模型回傳含禁止的 Markdown code fence
            runner_fence, _ = _make_fake_agy_runner(
                raw_review_stdout_override='{"status":"SUCCESS","response":"```json\\n{}\\n```"}'
            )
            code_f, res_f = run_review_command("acme-1234", root_dir=root, runner=runner_fence)
            self.assertEqual(code_f, EXIT_BLOCKED)
            self.assertEqual(res_f["status"], "BLOCKED")

            # 5. 模型回傳 P1 finding -> BLOCKED
            p1_finding = {
                "claim": "2025FY 毛利率",
                "file": "research/acme-1234/research-package.json",
                "jsonPointer": "/actuals/0/grossMargin",
                "sourceIds": ["src-official-fs"],
                "sourceLocation": "Page 1",
                "expected": "40.0%",
                "actual": "42.0%",
                "difference": "差異 2 個百分點",
                "severity": "P1",
                "risk": "高估獲利能力",
                "disclosureLocation": None,
                "remediation": "修正為 40.0%",
            }
            runner_p1, _ = _make_fake_agy_runner(findings=[p1_finding])
            code_p1, res_p1 = run_review_command("acme-1234", root_dir=root, runner=runner_p1)
            self.assertEqual(code_p1, EXIT_BLOCKED)
            self.assertEqual(res_p1["status"], "BLOCKED")
            self.assertTrue(res_p1["modelInvoked"])
            self.assertEqual(res_p1["findingSummary"]["severityCounts"]["P1"], 1)


if __name__ == "__main__":
    unittest.main()
