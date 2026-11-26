# -*- coding: utf-8 -*-
"""獨立研究驗證系統（validator 與 recompute）之本機離線單元測試。"""

from __future__ import annotations

import copy
import json
import tempfile
import unittest
from pathlib import Path
from typing import Any
from unittest.mock import patch

from .hashing import compute_verifier_code_hash, sha256_bytes
from .recompute import (
    recompute_actual_margin_checks,
    recompute_eps_checks,
    run_financial_recompute,
)
from .validator import validate_research_package

REPO_ROOT = Path(__file__).resolve().parent.parent
UMC_SLUG = "umc-2303"
SYNTHETIC_EVIDENCE_TEXT = (
    "SYNTHETIC_EVIDENCE_MARKER_94827103 — "
    "此為單元測試專用之本機合成文字證據，不含任何真實來源或受限券商材料。"
)


def _copy_umc_fixture(temp_base: Path) -> tuple[Path, Path, dict[str, Any]]:
    """
    複製 UMC manifest / package / schema / profile（若存在）至臨時 repo fixture，
    並建立只含合成文字檔的臨時 evidence-dir（絕不複製任何真實來源或券商材料）。
    """
    repo_root = temp_base / "temp_repo"
    evidence_dir = temp_base / "temp_evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    # 1. 複製研究報告 Schema 與可能存在的 profile 設定（僅限結構定義 JSON）
    src_schema_dir = REPO_ROOT / "research_system" / "schemas"
    dst_schema_dir = repo_root / "research_system" / "schemas"
    dst_schema_dir.mkdir(parents=True, exist_ok=True)
    for schema_file in src_schema_dir.glob("*.json"):
        (dst_schema_dir / schema_file.name).write_bytes(schema_file.read_bytes())

    src_profiles_dir = REPO_ROOT / "research_system" / "profiles"
    if src_profiles_dir.is_dir():
        dst_profiles_dir = repo_root / "research_system" / "profiles"
        dst_profiles_dir.mkdir(parents=True, exist_ok=True)
        for profile_file in src_profiles_dir.glob("*.json"):
            (dst_profiles_dir / profile_file.name).write_bytes(profile_file.read_bytes())

    # 2. 複製 UMC manifest、research-package 與 report-profiles.json（排除任何 sources 原始檔目錄）
    src_umc_dir = REPO_ROOT / "research" / UMC_SLUG
    dst_umc_dir = repo_root / "research" / UMC_SLUG
    dst_umc_dir.mkdir(parents=True, exist_ok=True)

    for filename in (
        "manifest.json",
        "research-package.json",
        "report-profiles.json",
        "profile.json",
        "company-profile.json",
    ):
        src_file = src_umc_dir / filename
        if src_file.is_file():
            (dst_umc_dir / filename).write_bytes(src_file.read_bytes())

    pkg_data = json.loads((dst_umc_dir / "research-package.json").read_text(encoding="utf-8"))
    return repo_root, evidence_dir, pkg_data


def _write_synthetic_evidence_files(
    evidence_dir: Path,
    source_ids: list[str],
    content: str = SYNTHETIC_EVIDENCE_TEXT,
) -> None:
    """在臨時 evidence-dir 中為指定 sourceIds 建立合成 .txt 證據檔。"""
    evidence_dir.mkdir(parents=True, exist_ok=True)
    for sid in source_ids:
        (evidence_dir / f"{sid}.txt").write_text(
            f"[{sid}]\n{content}\n",
            encoding="utf-8",
        )


class ValidatorAndRecomputeTestCase(unittest.TestCase):
    """驗證 UMC 套件結構、參照完整性、財務重算與輸出敏感資訊隔離之測試套件。"""

    def setUp(self) -> None:
        """為每個測試建立獨立的臨時目錄與合成證據環境。"""
        self._tmp = tempfile.TemporaryDirectory(prefix="umc_verify_fixture_")
        self.temp_base = Path(self._tmp.name)
        self.repo_root, self.evidence_dir, self.pkg_data = _copy_umc_fixture(self.temp_base)
        self.pkg_path = self.repo_root / "research" / UMC_SLUG / "research-package.json"

    def tearDown(self) -> None:
        """清理臨時目錄。"""
        self._tmp.cleanup()

    def _save_pkg(self, pkg: dict[str, Any]) -> None:
        """將修改後的 package 寫回臨時 repo fixture。"""
        self.pkg_path.write_text(
            json.dumps(pkg, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def test_umc_valid_schema_and_structure_is_not_verified_when_missing_eps_denominator_or_evidence(self) -> None:
        """
        測試 1：UMC 結構及 schema 正常，但缺 EPS 分母或本機原始證據時整體是 NOT_VERIFIED，絕不可 PASS。
        """
        # 情境 A：僅提供部分合成證據檔（缺少部分本機原始證據且缺季度 EPS 分母）
        _write_synthetic_evidence_files(self.evidence_dir, ["umc-src-q3", "umc-src-months"])
        res_missing_ev = validate_research_package(
            UMC_SLUG,
            root_dir=self.repo_root,
            evidence_dir=self.evidence_dir,
        )

        checks_by_id = {chk["id"]: chk for chk in res_missing_ev["checks"]}
        self.assertEqual(checks_by_id["schema.manifest.valid"]["status"], "PASS")
        self.assertEqual(checks_by_id["schema.package.valid"]["status"], "PASS")
        self.assertEqual(checks_by_id["reference.integrity.valid"]["status"], "PASS")
        self.assertEqual(res_missing_ev["counts"]["BLOCKED"], 0)
        self.assertGreater(res_missing_ev["counts"]["NOT_VERIFIED"], 0)
        self.assertEqual(res_missing_ev["status"], "NOT_VERIFIED")
        self.assertNotEqual(res_missing_ev["status"], "PASS")
        self.assertFalse(res_missing_ev["ok"])

        # 即便提供所有來源，移除申報分母後仍不可通過。
        missing_eps = copy.deepcopy(self.pkg_data)
        for actual in missing_eps["actuals"]:
            actual.pop("epsCalculation", None)
        self._save_pkg(missing_eps)
        all_source_ids = [
            str(src["id"])
            for src in self.pkg_data.get("sources", [])
            if isinstance(src, dict) and src.get("id")
        ]
        _write_synthetic_evidence_files(self.evidence_dir, all_source_ids)
        res_all_ev = validate_research_package(
            UMC_SLUG,
            root_dir=self.repo_root,
            evidence_dir=self.evidence_dir,
        )

        self.assertEqual(res_all_ev["counts"]["BLOCKED"], 0)
        self.assertIn("actual.eps.umc-a-2026Q3", res_all_ev["notVerifiedIds"])
        self.assertEqual(res_all_ev["status"], "NOT_VERIFIED")
        self.assertNotEqual(res_all_ev["status"], "PASS")
        self.assertFalse(res_all_ev["ok"])

    def test_nonexistent_source_id_causes_blocked(self) -> None:
        """
        測試 2：將 sourceIds 改成不存在的 ID 時，驗證結果必須為 BLOCKED。
        """
        pkg = copy.deepcopy(self.pkg_data)
        fake_source_id = "umc-src-nonexistent-999"
        pkg["actuals"][0]["sourceIds"] = [fake_source_id]
        self._save_pkg(pkg)

        result = validate_research_package(
            UMC_SLUG,
            root_dir=self.repo_root,
            evidence_dir=self.evidence_dir,
        )

        self.assertEqual(result["status"], "BLOCKED")
        self.assertFalse(result["ok"])
        self.assertGreater(result["counts"]["BLOCKED"], 0)
        self.assertTrue(
            any(
                bid.startswith("reference.missing_source.") and fake_source_id in bid
                for bid in result["blockedIds"]
            ),
            msg=f"預期 blockedIds 包含 nonexistent source 錯誤，實際為：{result['blockedIds']}",
        )

    def test_wrong_actual_gross_margin_causes_blocked(self) -> None:
        """
        測試 3：將 actual grossMargin 改成錯誤數值時，財務重算與整體狀態必須為 BLOCKED。
        """
        pkg = copy.deepcopy(self.pkg_data)
        # 2026Q3 (index 3) 營收 74239.117、毛利 25204.523，正確毛利率約 33.95%，將其竄改為 48.5%
        pkg["actuals"][3]["grossMargin"] = 48.5
        self._save_pkg(pkg)

        margin_checks = recompute_actual_margin_checks(pkg)
        q3_gm_checks = [
            chk for chk in margin_checks if chk["id"] == "actual.gross_margin.umc-a-2026Q3"
        ]
        self.assertEqual(len(q3_gm_checks), 1)
        self.assertEqual(q3_gm_checks[0]["status"], "BLOCKED")
        self.assertEqual(q3_gm_checks[0]["jsonPointer"], "/actuals/3/grossMargin")

        result = validate_research_package(
            UMC_SLUG,
            root_dir=self.repo_root,
            evidence_dir=self.evidence_dir,
        )
        self.assertEqual(result["status"], "BLOCKED")
        self.assertFalse(result["ok"])
        self.assertIn("actual.gross_margin.umc-a-2026Q3", result["blockedIds"])

    def test_serialized_result_excludes_temp_paths_internal_excerpts_and_raw_source_text(self) -> None:
        """
        測試 4：序列化驗證結果不含臨時絕對路徑、internalExcerpts 與原始來源文字。
        """
        all_source_ids = [
            str(src["id"])
            for src in self.pkg_data.get("sources", [])
            if isinstance(src, dict) and src.get("id")
        ]
        secret_raw_text = "SYNTHETIC_CONFIDENTIAL_SOURCE_BODY_NEVER_SERIALIZE_55667788"
        _write_synthetic_evidence_files(self.evidence_dir, all_source_ids, content=secret_raw_text)

        result = validate_research_package(
            UMC_SLUG,
            root_dir=self.repo_root,
            evidence_dir=self.evidence_dir,
        )
        serialized = json.dumps(result, ensure_ascii=False)

        # 不得包含 internalExcerpts 欄位或原始來源內文
        self.assertNotIn("internalExcerpts", result)
        self.assertNotIn("internalExcerpts", serialized)
        self.assertNotIn("excerpt", serialized)
        self.assertNotIn(secret_raw_text, serialized)
        self.assertNotIn(SYNTHETIC_EVIDENCE_TEXT, serialized)

        # 不得洩漏臨時目錄的絕對路徑（含原生與 POSIX 斜線格式、大小寫變體）
        forbidden_paths = {
            str(self.temp_base),
            str(self.temp_base.resolve()),
            self.temp_base.as_posix(),
            self.temp_base.resolve().as_posix(),
            str(self.repo_root),
            str(self.repo_root.resolve()),
            self.repo_root.as_posix(),
            self.repo_root.resolve().as_posix(),
            str(self.evidence_dir),
            str(self.evidence_dir.resolve()),
            self.evidence_dir.as_posix(),
            self.evidence_dir.resolve().as_posix(),
        }
        serialized_lower = serialized.lower()
        for path_str in forbidden_paths:
            if path_str:
                self.assertNotIn(path_str.lower(), serialized_lower)

        # 所有 check 的 file 欄位均須為相對路徑
        for chk in result["checks"]:
            file_field = str(chk.get("file") or "")
            self.assertFalse(Path(file_field).is_absolute(), msg=f"發現絕對路徑：{file_field}")
            self.assertTrue(
                file_field.startswith(f"research/{UMC_SLUG}/"),
                msg=f"非預期的相對檔案路徑：{file_field}",
            )

    def test_financial_recompute_eps_missing_denominator_is_not_verified(self) -> None:
        """
        測試 5：財務重算缺 denominator（weightedAverageShares）的 EPS 必須是 NOT_VERIFIED，絕不反推股數。
        """
        legacy = copy.deepcopy(self.pkg_data)
        for actual in legacy["actuals"]:
            actual.pop("epsCalculation", None)
        eps_checks = recompute_eps_checks(legacy)
        eps_by_id = {chk["id"]: chk for chk in eps_checks}

        for act_id in ("umc-a-2025Q4", "umc-a-2026Q1", "umc-a-2026Q2", "umc-a-2026Q3"):
            chk = eps_by_id[f"actual.eps.{act_id}"]
            self.assertEqual(chk["status"], "NOT_VERIFIED")
            self.assertIsNone(chk["expected"])

        for eq_id in ("umc-eq-2025FY", "umc-eq-2025Q4", "umc-eq-2026Q1", "umc-eq-2026Q2", "umc-eq-2026Q3"):
            chk = eps_by_id[f"eq.eps.{eq_id}"]
            self.assertEqual(chk["status"], "NOT_VERIFIED")
            self.assertIsNone(chk["expected"])

        # 驗證明確提供歸母淨利但缺少 weightedAverageShares（None 或 0）時，即使有 netIncome 與 eps 仍為 NOT_VERIFIED
        synthetic_pkg = {
            "report": {"slug": UMC_SLUG},
            "company": {"slug": UMC_SLUG},
            "actuals": [
                {
                    "id": "umc-a-test-null-shares",
                    "period": "2026Q3",
                    "fiscalYear": 2026,
                    "quarter": 3,
                    "revenue": 74239.117,
                    "netIncome": 16434.0,
                    "netIncomeAttributable": 16434.0,
                    "weightedAverageShares": None,
                    "eps": 1.32,
                    "currency": "TWD",
                    "scale": "million",
                    "sourceIds": ["umc-src-q3fs"],
                },
                {
                    "id": "umc-a-test-zero-shares",
                    "period": "2026Q2",
                    "fiscalYear": 2026,
                    "quarter": 2,
                    "revenue": 68733.0,
                    "netIncome": 42260.0,
                    "netIncomeAttributable": 42260.0,
                    "weightedAverageShares": 0,
                    "eps": 3.39,
                    "currency": "TWD",
                    "scale": "million",
                    "sourceIds": ["umc-src-q2"],
                },
            ],
            "earningsQuality": {
                "periods": [
                    {
                        "id": "umc-eq-test-null-shares",
                        "period": "2026Q3",
                        "periodType": "quarter",
                        "currency": "TWD",
                        "scale": "million",
                        "netIncomeAttributable": 16434.0,
                        "reportedEps": 1.32,
                        "weightedAverageShares": None,
                        "sourceIds": ["umc-src-q3fs"],
                    }
                ]
            },
        }

        recompute_res = run_financial_recompute(synthetic_pkg)
        synth_eps_checks = {
            chk["id"]: chk for chk in recompute_res["checks"] if chk["category"] == "eps_recompute"
        }

        self.assertEqual(synth_eps_checks["actual.eps.umc-a-test-null-shares"]["status"], "NOT_VERIFIED")
        self.assertIsNone(synth_eps_checks["actual.eps.umc-a-test-null-shares"]["expected"])
        self.assertEqual(synth_eps_checks["actual.eps.umc-a-test-zero-shares"]["status"], "NOT_VERIFIED")
        self.assertIsNone(synth_eps_checks["actual.eps.umc-a-test-zero-shares"]["expected"])
        self.assertEqual(synth_eps_checks["eq.eps.umc-eq-test-null-shares"]["status"], "NOT_VERIFIED")
        self.assertIsNone(synth_eps_checks["eq.eps.umc-eq-test-null-shares"]["expected"])

    def test_canonical_eps_uses_filing_inputs_and_exact_reported_rounding(self) -> None:
        actual = copy.deepcopy(self.pkg_data["actuals"][0])
        package = {"actuals": [actual]}
        contract = actual["epsCalculation"]
        num, den = contract["numerator"], contract["denominator"]
        num.update(value=1005, scale="thousand")
        den.update(value=1, scale="million")
        actual["eps"] = 1.01
        source_ids = set(actual["sourceIds"]) | {num["sourceId"], den["sourceId"]}
        self.assertEqual(recompute_eps_checks(package, source_ids)[0]["status"], "PASS")
        actual["eps"] = 1.00
        self.assertEqual(recompute_eps_checks(package, source_ids)[0]["status"], "BLOCKED")
        actual["eps"] = 1.01
        source_ids.remove(den["sourceId"])
        self.assertEqual(recompute_eps_checks(package, source_ids)[0]["status"], "NOT_VERIFIED")

    def test_valuation_schema_supports_auditable_forecast_sensitivity(self) -> None:
        package = copy.deepcopy(self.pkg_data)
        row = package["forecasts"][0]
        case = {
            "id": "forward-reference", "epsBasis": "forecast", "period": f"{row['fiscalYear']}F",
            "scenario": row["scenario"], "eps": row["eps"], "multiple": 15,
            "impliedPrice": row["eps"] * 15, "sourceIds": row["sourceIds"],
        }
        package["earningsQuality"]["valuation"]["scenarios"] = [case]
        _write_synthetic_evidence_files(self.evidence_dir, [source["id"] for source in package["sources"]])
        for eps, expected in [(row["eps"], "PASS"), (row["eps"] + 1, "BLOCKED")]:
            case.update(eps=eps, impliedPrice=eps * 15)
            self._save_pkg(package)
            result = validate_research_package(UMC_SLUG, root_dir=self.repo_root, evidence_dir=self.evidence_dir)
            checks = {check["id"]: check for check in result["checks"]}
            self.assertEqual(checks["schema.package.valid"]["status"], "PASS")
            self.assertEqual(checks["valuation.pe.earnings_quality.forward-reference"]["status"], expected)

    def test_financial_recompute_accepts_correct_eps_and_blocks_wrong_eps(self) -> None:
        """有原始輸入時，正確 EPS 通過，錯誤 EPS 超過容差即阻擋。"""
        package = {
            "company": {"slug": UMC_SLUG},
            "actuals": [
                {
                    "id": "umc-a-eps-test",
                    "period": "2026Q1",
                    "netIncomeAttributable": 100.0,
                    "weightedAverageShares": 10.0,
                    "eps": 10.0,
                    "currency": "TWD",
                    "scale": "unit",
                    "sourceIds": ["umc-src-eps-test"],
                }
            ],
        }
        evidence = {"umc-src-eps-test": True}

        correct = recompute_eps_checks(package, evidence_availability=evidence)
        self.assertEqual(correct[0]["status"], "PASS")
        self.assertEqual(correct[0]["expected"], 10)

        package["actuals"][0]["eps"] = 12.0
        incorrect = recompute_eps_checks(package, evidence_availability=evidence)
        self.assertEqual(incorrect[0]["status"], "BLOCKED")
        self.assertEqual(incorrect[0]["expected"], 10)
        self.assertEqual(incorrect[0]["actual"], 12)
        self.assertGreater(incorrect[0]["diff"], incorrect[0]["tolerance"])

    def test_top_level_fields_and_profile_hash_are_populated(self) -> None:
        """
        測試 6：驗證必要頂層欄位（schemaVersion、safe company、packageVersion、reportVersion、asOfDate、summary、UTC timestamp）
        以及 hashes.profileHash 正確等於 report-profiles.json 的 raw SHA-256。
        """
        profiles_path = self.repo_root / "research" / UMC_SLUG / "report-profiles.json"
        self.assertTrue(profiles_path.is_file(), msg="fixture 應已複製 report-profiles.json")
        expected_profile_hash = sha256_bytes(profiles_path.read_bytes())

        result = validate_research_package(
            UMC_SLUG,
            root_dir=self.repo_root,
            evidence_dir=self.evidence_dir,
        )

        # 驗證 hashes.profileHash 與頂層 profileHash
        self.assertEqual(result["hashes"]["profileHash"], expected_profile_hash)
        self.assertEqual(result["profileHash"], expected_profile_hash)
        checks_by_id = {chk["id"]: chk for chk in result["checks"]}
        self.assertEqual(checks_by_id["profile.full_research.valid"]["status"], "PASS")

        # 驗證必要頂層欄位
        self.assertEqual(result["schemaVersion"], "1.0.0")
        self.assertEqual(result["packageVersion"], self.pkg_data["packageVersion"])
        self.assertEqual(result["reportVersion"], self.pkg_data["report"]["version"])
        self.assertEqual(result["asOfDate"], self.pkg_data["asOfDate"])
        self.assertIsInstance(result["timestamp"], str)
        self.assertTrue(result["timestamp"].endswith("Z"))

        # 驗證 safe company 僅含指定 7 個安全識別欄位，不含 description 等長敘述
        expected_company_keys = {"id", "ticker", "market", "name", "slug", "sector", "industry"}
        self.assertEqual(set(result["company"].keys()), expected_company_keys)
        for key in expected_company_keys:
            self.assertEqual(result["company"][key], self.pkg_data["company"][key])

        # 驗證 summary 結構與狀態一致
        self.assertIsInstance(result["summary"], dict)
        self.assertEqual(result["summary"]["status"], result["status"])
        self.assertEqual(result["summary"]["ok"], result["ok"])
        self.assertEqual(result["summary"]["counts"], result["counts"])

    def test_invalid_profile_output_or_expected_pages_and_load_error_cause_blocked_safely(self) -> None:
        """
        測試 7：當 report-profiles.json 的 output 不符或 expectedPages 非正整數時必須 BLOCKED；
        且 JSON 載入錯誤不洩漏例外原文或絕對路徑。
        """
        profiles_path = self.repo_root / "research" / UMC_SLUG / "report-profiles.json"
        orig_profiles = json.loads(profiles_path.read_text(encoding="utf-8"))

        # 情境 A：output 路徑不符
        bad_output_profiles = copy.deepcopy(orig_profiles)
        bad_output_profiles["profiles"]["full-research"]["output"] = "public/research/reports/wrong-slug.html"
        profiles_path.write_text(json.dumps(bad_output_profiles, ensure_ascii=False, indent=2), encoding="utf-8")

        res_bad_output = validate_research_package(
            UMC_SLUG,
            root_dir=self.repo_root,
            evidence_dir=self.evidence_dir,
        )
        self.assertEqual(res_bad_output["status"], "BLOCKED")
        self.assertFalse(res_bad_output["ok"])
        self.assertIn("profile.full_research.output_invalid", res_bad_output["blockedIds"])

        # 情境 B：expectedPages 非正整數（如 0 或 bool）
        for invalid_pages in (0, -3, True, "16"):
            bad_pages_profiles = copy.deepcopy(orig_profiles)
            bad_pages_profiles["profiles"]["full-research"]["expectedPages"] = invalid_pages
            profiles_path.write_text(json.dumps(bad_pages_profiles, ensure_ascii=False, indent=2), encoding="utf-8")

            res_bad_pages = validate_research_package(
                UMC_SLUG,
                root_dir=self.repo_root,
                evidence_dir=self.evidence_dir,
            )
            self.assertEqual(res_bad_pages["status"], "BLOCKED")
            self.assertFalse(res_bad_pages["ok"])
            self.assertIn("profile.full_research.expected_pages_invalid", res_bad_pages["blockedIds"])

        # 情境 C：JSON 載入錯誤不得包含例外訊息或臨時絕對路徑
        profiles_path.write_text("{ malformed json ", encoding="utf-8")
        res_bad_json = validate_research_package(
            UMC_SLUG,
            root_dir=self.repo_root,
            evidence_dir=self.evidence_dir,
        )
        self.assertEqual(res_bad_json["status"], "BLOCKED")
        self.assertIn("profile.file.load_error", res_bad_json["blockedIds"])
        serialized_bad_json = json.dumps(res_bad_json, ensure_ascii=False).lower()
        self.assertNotIn(str(self.repo_root).lower(), serialized_bad_json)
        self.assertNotIn(self.repo_root.as_posix().lower(), serialized_bad_json)
        self.assertNotIn("expecting property name", serialized_bad_json)

    def test_forecast_marked_as_official_causes_blocked(self) -> None:
        """
        測試 8：將預測列（forecasts）的 evidenceClass 改為 official 時，必須產生 BLOCKED check（含相對 JSON pointer 與 sourceIds）。
        """
        pkg = copy.deepcopy(self.pkg_data)
        target_forecast = pkg["forecasts"][0]
        forecast_id = target_forecast["id"]
        expected_sources = list(target_forecast["sourceIds"])
        target_forecast["evidenceClass"] = "official"
        self._save_pkg(pkg)

        result = validate_research_package(
            UMC_SLUG,
            root_dir=self.repo_root,
            evidence_dir=self.evidence_dir,
        )

        self.assertEqual(result["status"], "BLOCKED")
        self.assertFalse(result["ok"])
        check_id = f"evidence_class.forecast_disallowed.{forecast_id}"
        self.assertIn(check_id, result["blockedIds"])

        checks_by_id = {chk["id"]: chk for chk in result["checks"]}
        chk = checks_by_id[check_id]
        self.assertEqual(chk["status"], "BLOCKED")
        self.assertEqual(chk["jsonPointer"], "/forecasts/0/evidenceClass")
        self.assertEqual(chk["sourceIds"], expected_sources)
        self.assertEqual(chk["file"], f"research/{UMC_SLUG}/research-package.json")

    def test_official_claim_citing_only_research_inference_source_causes_blocked(self) -> None:
        """
        測試 9：official claim 若只引用研究推論（research_inference）source，必須產生 BLOCKED check（含相對 JSON pointer 與 sourceIds）。
        """
        pkg = copy.deepcopy(self.pkg_data)
        target_claim = pkg["claims"][0]
        claim_id = target_claim["id"]
        target_claim["evidenceClass"] = "official"
        target_claim["sourceIds"] = ["umc-src-model"]
        self._save_pkg(pkg)

        result = validate_research_package(
            UMC_SLUG,
            root_dir=self.repo_root,
            evidence_dir=self.evidence_dir,
        )

        self.assertEqual(result["status"], "BLOCKED")
        self.assertFalse(result["ok"])
        check_id = f"evidence_class.claim_official_missing_source.{claim_id}"
        self.assertIn(check_id, result["blockedIds"])

        checks_by_id = {chk["id"]: chk for chk in result["checks"]}
        chk = checks_by_id[check_id]
        self.assertEqual(chk["status"], "BLOCKED")
        self.assertEqual(chk["jsonPointer"], "/claims/0/evidenceClass")
        self.assertEqual(chk["sourceIds"], ["umc-src-model"])
        self.assertEqual(chk["file"], f"research/{UMC_SLUG}/research-package.json")

    def test_broker_source_is_classified_as_third_party_broker_without_becoming_market_consensus(self) -> None:
        """
        測試 10：券商來源被分類為 third-party/broker 子類，保留原始 third_party_fact 的 evidenceClass，
        不會自動變成 market_consensus；若將 forecast 改標為 market_consensus 且僅引用券商或自建模型來源，則必須 BLOCKED。
        """
        result = validate_research_package(
            UMC_SLUG,
            root_dir=self.repo_root,
            evidence_dir=self.evidence_dir,
        )

        sources_by_id = {s["sourceId"]: s for s in result["sources"]}
        for broker_sid in ("umc-src-firstcapital-20261102", "umc-src-hongyuan-20261029"):
            self.assertIn(broker_sid, sources_by_id)
            rec = sources_by_id[broker_sid]
            self.assertEqual(rec["evidenceClass"], "third_party_fact")
            self.assertEqual(rec["detailedCategory"], "third-party/broker")
            self.assertNotEqual(rec["evidenceClass"], "market_consensus")
            self.assertNotEqual(rec["detailedCategory"], "market_consensus")

        self.assertEqual(result["sourceCategories"].get("third-party/broker"), 2)
        self.assertEqual(result["sourceCategories"].get("market_consensus"), 0)

        # 若將預測列標為 market_consensus，但僅由券商來源 (third_party_fact / third-party/broker) 支持，不得視為合法共識，應為 BLOCKED
        pkg = copy.deepcopy(self.pkg_data)
        pkg["forecasts"][1]["evidenceClass"] = "market_consensus"
        pkg["forecasts"][1]["sourceIds"] = ["umc-src-firstcapital-20261102", "umc-src-hongyuan-20261029"]
        # 同時測試由自建 model source 單獨支持 market_consensus 也必須 BLOCKED
        pkg["forecasts"][2]["evidenceClass"] = "market_consensus"
        pkg["forecasts"][2]["sourceIds"] = ["umc-src-model"]
        self._save_pkg(pkg)

        res_blocked = validate_research_package(
            UMC_SLUG,
            root_dir=self.repo_root,
            evidence_dir=self.evidence_dir,
        )
        self.assertEqual(res_blocked["status"], "BLOCKED")
        checks_by_id = {chk["id"]: chk for chk in res_blocked["checks"]}

        f1_id = pkg["forecasts"][1]["id"]
        f1_chk_id = f"evidence_class.market_consensus_missing_source.forecasts.{f1_id}"
        self.assertIn(f1_chk_id, res_blocked["blockedIds"])
        self.assertEqual(checks_by_id[f1_chk_id]["jsonPointer"], "/forecasts/1/evidenceClass")
        self.assertEqual(
            checks_by_id[f1_chk_id]["sourceIds"],
            ["umc-src-firstcapital-20261102", "umc-src-hongyuan-20261029"],
        )

        f2_id = pkg["forecasts"][2]["id"]
        f2_chk_id = f"evidence_class.market_consensus_model_only.forecasts.{f2_id}"
        self.assertIn(f2_chk_id, res_blocked["blockedIds"])
        self.assertEqual(checks_by_id[f2_chk_id]["jsonPointer"], "/forecasts/2/evidenceClass")
        self.assertEqual(checks_by_id[f2_chk_id]["sourceIds"], ["umc-src-model"])

    def test_missing_verifier_code_file_fails_closed_for_version_hash(self) -> None:
        with patch("verification.hashing.VERIFIER_CODE_FILES", ("verification/__definitely_missing__.py",)):
            with self.assertRaises(FileNotFoundError):
                compute_verifier_code_hash(self.repo_root)


if __name__ == "__main__":
    unittest.main()
