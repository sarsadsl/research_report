# -*- coding: utf-8 -*-
"""獨立 Gemini 審查介面模組（gemini_review）之本機離線確定性單元測試。"""

from __future__ import annotations

import copy
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from typing import Any, Callable, Mapping, Sequence

from .gemini_review import (
    DEFAULT_GEMINI_MODEL,
    GeminiReviewError,
    REVIEW_STATUS_BLOCKED,
    REVIEW_STATUS_PASS,
    REVIEW_STATUS_PASS_WITH_P2,
    build_agy_review_command,
    build_safe_env,
    evaluate_findings_decision,
    resolve_json_pointer,
    run_gemini_review,
    split_review_context_into_batches,
    unwrap_agy_json_output,
    validate_and_normalize_finding,
    validate_review_context,
    verify_agy_model_available,
    verify_disclosure_location,
)


def _make_synthetic_context() -> dict[str, Any]:
    """建立小型合成 review_context，不含任何真實來源或受限材料。"""
    return {
        "company": {
            "id": "synth-co",
            "slug": "synth-9999",
            "ticker": "9999.TW",
            "name": "合成測試股份有限公司",
        },
        "package": {
            "schemaVersion": "1.0.0",
            "packageVersion": "1.0.0",
            "asOfDate": "2026-11-15",
            "company": {
                "id": "synth-co",
                "slug": "synth-9999",
                "ticker": "9999.TW",
                "name": "合成測試股份有限公司",
            },
            "report": {
                "slug": "synth-9999",
                "version": "1.0.0",
                "title": "合成測試研究報告",
            },
            "dashboard": {
                "estimateNote": "2026Q4 資本支出係依管理層法說會區間中位數推估，存在季節性尾差限制。",
            },
            "actuals": [
                {
                    "id": "act-2026Q3",
                    "period": "2026Q3",
                    "revenue": 1000.0,
                    "grossMargin": 35.0,
                    "sourceIds": ["src-q3-fs"],
                }
            ],
            "claims": [
                {
                    "id": "claim-001",
                    "statement": "2026Q3 營收為 1,000 百萬元，毛利率 35.0%。",
                    "sourceIds": ["src-q3-fs", "src-ir-deck"],
                }
            ],
            "sources": [
                {"id": "src-q3-fs", "title": "合成 2026Q3 財報"},
                {"id": "src-ir-deck", "title": "合成法說會簡報"},
            ],
        },
        "deterministicChecks": {
            "status": "PASS",
            "checks": [
                {"id": "schema.package.valid", "status": "PASS"},
            ],
        },
        "reportSections": [
            {
                "id": "sec-overview",
                "title": "投資結論與財務摘要",
                "content": "本公司 2026Q3 營收 1,000 百萬元；單一供應商集中風險已於風險章節揭露。",
                "sourceIds": ["src-q3-fs"],
            },
            {
                "id": "sec-risks",
                "title": "關鍵風險與揭露事項",
                "content": "次要假設限制：部分設備交期預估仰賴單一法人說明會口頭指引。",
                "sourceIds": ["src-ir-deck"],
            },
        ],
        "sourceEvidence": [
            {
                "id": "src-q3-fs",
                "available": True,
                "availability": "available",
                "excerpt": "SYNTHETIC_EXCERPT_Q3_FS: 2026Q3 營業收入 1,000 百萬元，毛利率 35.0%。",
            },
            {
                "id": "src-ir-deck",
                "available": True,
                "availability": "available",
                "excerpt": "SYNTHETIC_EXCERPT_IR_DECK: 2026Q4 資本支出維持區間中位數預估。",
            },
            {
                "id": "src-extra-note",
                "required": False,
                "available": True,
                "availability": "available",
                "excerpt": "SYNTHETIC_EXCERPT_EXTRA: 補充產業背景備註。",
            },
        ],
    }


def _make_valid_finding_dict(**overrides: Any) -> dict[str, Any]:
    """建立符合必填欄位的預設合成 finding 字典。"""
    base: dict[str, Any] = {
        "claim": "2026Q4 資本支出預估假設",
        "file": "research/synth-9999/research-package.json",
        "jsonPointer": "/dashboard/estimateNote",
        "sourceIds": ["src-ir-deck"],
        "sourceLocation": "第 12 頁資本支出指引表",
        "expected": "應明確標註為管理層區間中位數推估",
        "actual": "已標註為管理層法說會區間中位數推估",
        "difference": "僅有約 0.1% 四捨五入尾差",
        "severity": "P2",
        "risk": "次要假設尾差風險，不影響核心結論",
        "disclosureLocation": "/dashboard/estimateNote",
        "remediation": "維持現有 estimateNote 揭露即可",
    }
    base.update(overrides)
    return base


def _wrap_model_findings(
    findings: list[dict[str, Any]],
    *,
    batch_id: str = "batch-001",
    wrapper_status: str = "SUCCESS",
) -> str:
    """將 findings 封裝為 Agy `--output-format json` 之嚴格 JSON 字串。"""
    inner = {
        "schemaVersion": "1.0.0",
        "batchId": batch_id,
        "reviewedScope": {
            "sectionIds": ["sec-overview", "sec-risks"],
            "collections": ["report", "dashboard", "actuals", "claims", "sources"],
            "sourceIds": ["src-ir-deck", "src-q3-fs"],
        },
        "summary": "合成單元測試批次審查完成",
        "findings": findings,
    }
    wrapper = {
        "status": wrapper_status,
        "response": json.dumps(inner, ensure_ascii=False),
    }
    return json.dumps(wrapper, ensure_ascii=False)


def _make_fake_runner(
    *,
    version_stdout: str = "agy 0.2.5\n",
    version_rc: int = 0,
    models_stdout: str | None = None,
    models_rc: int = 0,
    review_responder: Callable[[Sequence[str], dict[str, Any]], subprocess.CompletedProcess[str]] | None = None,
    recorded_calls: list[dict[str, Any]] | None = None,
) -> Callable[..., subprocess.CompletedProcess[str]]:
    """建立可注入的確定性假執行器（絕不呼叫真實 Agy CLI 或外部網路）。"""
    effective_models_stdout = (
        models_stdout
        if models_stdout is not None
        else json.dumps({"models": [DEFAULT_GEMINI_MODEL, "gemini-4-argon-low"]})
    )

    def _runner(args: Sequence[str], **kwargs: Any) -> subprocess.CompletedProcess[str]:
        cmd_list = list(args)
        cwd_str = kwargs.get("cwd")
        cwd_snapshot: dict[str, Any] = {}
        if isinstance(cwd_str, str) and cwd_str:
            cwd_path = Path(cwd_str)
            cwd_snapshot = {
                "exists": cwd_path.exists(),
                "is_dir": cwd_path.is_dir(),
                "entries": list(cwd_path.iterdir()) if cwd_path.is_dir() else None,
                "name": cwd_path.name,
            }
        if recorded_calls is not None:
            recorded_calls.append(
                {
                    "args": cmd_list,
                    "kwargs": dict(kwargs),
                    "cwd_snapshot": cwd_snapshot,
                }
            )

        if "--version" in cmd_list:
            return subprocess.CompletedProcess(
                args=cmd_list,
                returncode=version_rc,
                stdout=version_stdout,
                stderr="" if version_rc == 0 else "version failed",
            )
        if len(cmd_list) >= 2 and cmd_list[1] == "models":
            return subprocess.CompletedProcess(
                args=cmd_list,
                returncode=models_rc,
                stdout=effective_models_stdout,
                stderr="" if models_rc == 0 else "models failed",
            )
        if review_responder is not None:
            return review_responder(cmd_list, kwargs)

        default_stdout = _wrap_model_findings([])
        return subprocess.CompletedProcess(
            args=cmd_list,
            returncode=0,
            stdout=default_stdout,
            stderr="",
        )

    return _runner


class GeminiReviewTestCase(unittest.TestCase):
    """驗證獨立 Gemini 審查模組之環境隔離、輸入驗證、批次拆分與嚴重度判定邏輯。"""

    def test_safe_env_allowlist_strips_credentials_and_points_temp_to_isolated_dir(self) -> None:
        """
        測試 1：安全環境變數白名單必須剔除無關變數與 API/雲端憑證，並將 TEMP/TMP/TMPDIR 指向隔離臨時目錄。
        """
        with tempfile.TemporaryDirectory(prefix="test_safe_env_") as tmp_dir:
            dirty_env = {
                "PATH": "/usr/local/bin:/usr/bin",
                "SYSTEMROOT": "C:\\Windows",
                "USERPROFILE": "C:\\Users\\Tester",
                "HOME": "/home/tester",
                "AGY_HOME": "C:\\Users\\Tester\\.agy",
                # 無關自訂變數與敏感憑證
                "UNRELATED_CUSTOM_VAR": "should_be_stripped",
                "OPENAI_API_KEY": "sk-secret-openai-key",
                "ANTHROPIC_API_KEY": "sk-ant-secret",
                "GITHUB_TOKEN": "ghp_secret_token",
                "CLOUDFLARE_API_TOKEN": "cf_secret_token",
                "WRANGLER_SEND_METRICS": "false",
                "AWS_SECRET_ACCESS_KEY": "aws_secret",
                "DATABASE_URL": "postgres://user:pass@localhost/db",
                "MY_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----",
                "TEMP": "C:\\OldTemp",
                "TMP": "C:\\OldTmp",
            }
            safe_env = build_safe_env(dirty_env, temp_dir=tmp_dir)

            # 允許之基本環境變數保留
            self.assertEqual(safe_env.get("PATH"), "/usr/local/bin:/usr/bin")
            self.assertEqual(safe_env.get("SYSTEMROOT"), "C:\\Windows")
            self.assertEqual(safe_env.get("AGY_HOME"), "C:\\Users\\Tester\\.agy")

            # 敏感憑證與非白名單變數全數剔除
            for forbidden_key in (
                "UNRELATED_CUSTOM_VAR",
                "OPENAI_API_KEY",
                "ANTHROPIC_API_KEY",
                "GITHUB_TOKEN",
                "CLOUDFLARE_API_TOKEN",
                "WRANGLER_SEND_METRICS",
                "AWS_SECRET_ACCESS_KEY",
                "DATABASE_URL",
                "MY_PRIVATE_KEY",
            ):
                self.assertNotIn(forbidden_key, safe_env)

            # TEMP / TMP / TMPDIR 指向隔離臨時目錄，且強制設定非互動安全旗標
            self.assertEqual(safe_env["TEMP"], str(tmp_dir))
            self.assertEqual(safe_env["TMP"], str(tmp_dir))
            self.assertEqual(safe_env["TMPDIR"], str(tmp_dir))
            self.assertEqual(safe_env["NO_COLOR"], "1")
            self.assertEqual(safe_env["CI"], "true")
            self.assertEqual(safe_env["TERM"], "dumb")

    def test_runner_receives_shell_false_stdin_devnull_and_temporary_empty_cwd(self) -> None:
        """
        測試 2：注入的 runner 必須收到 shell=False、stdin=subprocess.DEVNULL，以及全新且為空的臨時工作目錄。
        """
        recorded_calls: list[dict[str, Any]] = []
        dirty_env = {
            "PATH": "/usr/bin",
            "OPENAI_API_KEY": "sk-never-leak",
            "CLOUDFLARE_API_TOKEN": "cf-never-leak",
        }
        runner = _make_fake_runner(recorded_calls=recorded_calls)
        ctx = _make_synthetic_context()

        result = run_gemini_review(
            ctx,
            agy_bin="fake-agy-binary",
            base_env=dirty_env,
            runner=runner,
        )
        self.assertEqual(result.status, REVIEW_STATUS_PASS)
        self.assertTrue(result.ok)
        # 至少包含 `--version`、`models` 與 1 次批次審查呼叫
        self.assertEqual(len(recorded_calls), 3)

        for call in recorded_calls:
            kwargs = call["kwargs"]
            snap = call["cwd_snapshot"]
            env = kwargs["env"]

            self.assertIs(kwargs["shell"], False)
            self.assertEqual(kwargs["stdin"], subprocess.DEVNULL)
            self.assertTrue(snap["exists"])
            self.assertTrue(snap["is_dir"])
            self.assertEqual(snap["entries"], [])
            self.assertTrue(snap["name"].startswith("agy-gemini-review-"))
            # 執行完畢後臨時目錄應已自動清除
            self.assertFalse(Path(kwargs["cwd"]).exists())

            # runner 收到的環境變數中 TEMP/TMP 必須等於該次臨時空目錄，且不含憑證
            self.assertEqual(env["TEMP"], kwargs["cwd"])
            self.assertEqual(env["TMP"], kwargs["cwd"])
            self.assertNotIn("OPENAI_API_KEY", env)
            self.assertNotIn("CLOUDFLARE_API_TOKEN", env)

        # 驗證審查命令參數格式
        review_cmd = recorded_calls[2]["args"]
        expected_prefix = build_agy_review_command(
            "fake-agy-binary",
            review_cmd[review_cmd.index("-p") + 1],
            model=DEFAULT_GEMINI_MODEL,
        )
        self.assertEqual(review_cmd, expected_prefix)

    def test_missing_agy_or_model_or_model_list_failure_is_blocked(self) -> None:
        """
        測試 3：找不到 Agy 執行檔、`agy --version` 失敗、`agy models` 失敗或不含指定模型時，一律阻擋（BLOCKED）。
        """
        ctx = _make_synthetic_context()

        # 情境 A：runner 拋出 FileNotFoundError（模擬 Agy 執行檔不存在）
        def _missing_bin_runner(args: Sequence[str], **kwargs: Any) -> subprocess.CompletedProcess[str]:
            raise FileNotFoundError(f"No such file: {args[0]}")

        with self.assertRaises(GeminiReviewError) as err_ctx:
            verify_agy_model_available(
                agy_bin="nonexistent-agy-bin",
                base_env={"PATH": ""},
                runner=_missing_bin_runner,
            )
        self.assertEqual(err_ctx.exception.code, "AGY_NOT_FOUND")

        res_missing = run_gemini_review(
            ctx,
            agy_bin="nonexistent-agy-bin",
            base_env={"PATH": ""},
            runner=_missing_bin_runner,
        )
        self.assertEqual(res_missing.status, REVIEW_STATUS_BLOCKED)
        self.assertFalse(res_missing.ok)
        self.assertEqual(res_missing.summary.get("errorCode"), "AGY_NOT_FOUND")

        # 情境 B：`agy models` 非零退出
        runner_models_fail = _make_fake_runner(models_rc=2, models_stdout="")
        with self.assertRaises(GeminiReviewError) as err_models_fail:
            verify_agy_model_available(
                agy_bin="fake-agy",
                base_env={"PATH": ""},
                runner=runner_models_fail,
            )
        self.assertEqual(err_models_fail.exception.code, "AGY_MODELS_FAILED")

        # 情境 C：`agy models` 清單不含目標模型（僅有前綴子字串 gemini-4 不得誤判為 gemini-4-argon-high）
        runner_wrong_model = _make_fake_runner(
            models_stdout=json.dumps({"models": ["gemini-4", "gemini-4-argon-low", "claude-3"]})
        )
        with self.assertRaises(GeminiReviewError) as err_wrong_model:
            verify_agy_model_available(
                model="gemini-4-argon-high",
                agy_bin="fake-agy",
                base_env={"PATH": ""},
                runner=runner_wrong_model,
            )
        self.assertEqual(err_wrong_model.exception.code, "MODEL_NOT_AVAILABLE")

        res_wrong_model = run_gemini_review(
            ctx,
            model="gemini-4-argon-high",
            agy_bin="fake-agy",
            base_env={"PATH": ""},
            runner=runner_wrong_model,
        )
        self.assertEqual(res_wrong_model.status, REVIEW_STATUS_BLOCKED)
        self.assertFalse(res_wrong_model.ok)
        self.assertEqual(res_wrong_model.summary.get("errorCode"), "MODEL_NOT_AVAILABLE")

    def test_missing_or_unavailable_required_evidence_is_blocked(self) -> None:
        """
        測試 4：當必要來源缺失、available=False、availability='unavailable' 或缺少摘錄文字時，必須阻擋（BLOCKED）。
        """
        # 情境 A：package 引用的必要 sourceId 未出現在 sourceEvidence 中
        ctx_missing_src = _make_synthetic_context()
        ctx_missing_src["sourceEvidence"] = [
            ev for ev in ctx_missing_src["sourceEvidence"] if ev["id"] != "src-ir-deck"
        ]
        with self.assertRaises(GeminiReviewError) as err_missing:
            validate_review_context(ctx_missing_src)
        self.assertEqual(err_missing.exception.code, "REQUIRED_SOURCE_MISSING")
        self.assertIn("src-ir-deck", err_missing.exception.details["missingSourceIds"])

        # 情境 B：必要來源標示為 available=False
        ctx_unavail_bool = _make_synthetic_context()
        ctx_unavail_bool["sourceEvidence"][0]["available"] = False
        with self.assertRaises(GeminiReviewError) as err_unavail_bool:
            validate_review_context(ctx_unavail_bool)
        self.assertEqual(err_unavail_bool.exception.code, "REQUIRED_SOURCE_UNAVAILABLE")
        self.assertIn("src-q3-fs", err_unavail_bool.exception.details["unavailableSourceIds"])

        # 情境 C：必要來源標示為 availability="unavailable"
        ctx_unavail_str = _make_synthetic_context()
        del ctx_unavail_str["sourceEvidence"][0]["available"]
        ctx_unavail_str["sourceEvidence"][0]["availability"] = "unavailable"
        with self.assertRaises(GeminiReviewError) as err_unavail_str:
            validate_review_context(ctx_unavail_str)
        self.assertEqual(err_unavail_str.exception.code, "REQUIRED_SOURCE_UNAVAILABLE")

        # 情境 D：必要來源缺少 excerpt 摘錄內容
        ctx_empty_excerpt = _make_synthetic_context()
        ctx_empty_excerpt["sourceEvidence"][1]["excerpt"] = "   "
        res_blocked = run_gemini_review(
            ctx_empty_excerpt,
            agy_bin="fake-agy",
            base_env={"PATH": ""},
            runner=_make_fake_runner(),
        )
        self.assertEqual(res_blocked.status, REVIEW_STATUS_BLOCKED)
        self.assertFalse(res_blocked.ok)
        self.assertEqual(res_blocked.summary.get("errorCode"), "REQUIRED_SOURCE_UNAVAILABLE")

    def test_malformed_wrapper_non_success_invalid_finding_fields_and_severity_are_blocked(self) -> None:
        """
        測試 5：毀損 JSON、含 Markdown code fence、wrapper status != SUCCESS、finding 欄位缺漏或非法 severity 一律阻擋。
        """
        ctx = _make_synthetic_context()

        # 5-1: Markdown code fence 必須拒絕
        with self.assertRaises(GeminiReviewError) as err_fence:
            unwrap_agy_json_output("```json\n{\"status\": \"SUCCESS\", \"findings\": []}\n```")
        self.assertEqual(err_fence.exception.code, "MARKDOWN_CODE_FENCE_REJECTED")

        # 5-2: 內層 response 含 Markdown code fence 亦必須拒絕
        wrapped_fence = json.dumps(
            {"status": "SUCCESS", "response": "```json\n{\"findings\": []}\n```"}
        )
        with self.assertRaises(GeminiReviewError) as err_inner_fence:
            unwrap_agy_json_output(wrapped_fence)
        self.assertEqual(err_inner_fence.exception.code, "MARKDOWN_CODE_FENCE_REJECTED")

        # 5-3: 非嚴格 JSON 或語法錯誤
        with self.assertRaises(GeminiReviewError) as err_malformed:
            unwrap_agy_json_output("{\"status\": \"SUCCESS\", \"response\": ")
        self.assertIn(
            err_malformed.exception.code,
            ("NON_STRICT_JSON_OBJECT", "INVALID_JSON_SYNTAX"),
        )

        # 5-4: wrapper status 不為 SUCCESS（例如 ERROR 或 TIMEOUT）
        with self.assertRaises(GeminiReviewError) as err_status:
            unwrap_agy_json_output(
                json.dumps({"status": "ERROR", "response": json.dumps({"findings": []})})
            )
        self.assertEqual(err_status.exception.code, "AGY_WRAPPER_STATUS_NOT_SUCCESS")

        # 5-5: finding 缺少必填欄位（如缺 remediation 與 sourceLocation）
        incomplete_finding = _make_valid_finding_dict()
        del incomplete_finding["remediation"]
        del incomplete_finding["sourceLocation"]
        with self.assertRaises(GeminiReviewError) as err_missing_fields:
            validate_and_normalize_finding(
                incomplete_finding,
                batch_id="batch-001",
                review_context=ctx,
                model=DEFAULT_GEMINI_MODEL,
                agy_version="0.2.5",
                reviewed_at_utc="2026-11-15T00:00:00Z",
                prompt_sha256="abc",
                response_sha256="def",
            )
        self.assertEqual(err_missing_fields.exception.code, "FINDING_MISSING_REQUIRED_FIELDS")
        self.assertIn("remediation", err_missing_fields.exception.details["missingFields"])
        self.assertIn("sourceLocation", err_missing_fields.exception.details["missingFields"])

        # 5-6: finding severity 非法（如 P4 或 HIGH）
        bad_sev_finding = _make_valid_finding_dict(severity="P4")
        with self.assertRaises(GeminiReviewError) as err_bad_sev:
            validate_and_normalize_finding(
                bad_sev_finding,
                batch_id="batch-001",
                review_context=ctx,
                model=DEFAULT_GEMINI_MODEL,
                agy_version="0.2.5",
                reviewed_at_utc="2026-11-15T00:00:00Z",
                prompt_sha256="abc",
                response_sha256="def",
            )
        self.assertEqual(err_bad_sev.exception.code, "INVALID_FINDING_SEVERITY")

        # 5-7: 透過 run_gemini_review 整合驗證：當模型回傳非 SUCCESS wrapper 時整體為 BLOCKED
        runner_non_success = _make_fake_runner(
            review_responder=lambda args, kw: subprocess.CompletedProcess(
                args=list(args),
                returncode=0,
                stdout=_wrap_model_findings([], wrapper_status="FAILED"),
                stderr="",
            )
        )
        res_non_success = run_gemini_review(
            ctx,
            agy_bin="fake-agy",
            base_env={"PATH": ""},
            runner=runner_non_success,
        )
        self.assertEqual(res_non_success.status, REVIEW_STATUS_BLOCKED)
        self.assertFalse(res_non_success.ok)
        self.assertEqual(res_non_success.summary.get("errorCode"), "AGY_WRAPPER_STATUS_NOT_SUCCESS")

    def test_severity_decision_p0_p1_block_p2_requires_resolvable_disclosure_and_p3_passes(self) -> None:
        """
        測試 6：
        - P0 / P1 一律 BLOCKED（不論是否提供 disclosureLocation）；
        - P2 僅在 disclosureLocation 可定位於實際提供的 package / report 文字時為 PASS_WITH_P2，否則 BLOCKED；
        - P3 記錄於 p3_notes 但不阻擋（PASS）。
        """
        ctx = _make_synthetic_context()

        def _run_with_findings(findings_list: list[dict[str, Any]]):
            runner = _make_fake_runner(
                review_responder=lambda args, kw: subprocess.CompletedProcess(
                    args=list(args),
                    returncode=0,
                    stdout=_wrap_model_findings(findings_list),
                    stderr="",
                )
            )
            return run_gemini_review(
                ctx,
                agy_bin="fake-agy",
                base_env={"PATH": ""},
                runner=runner,
            )

        # 情境 A：P0 永遠阻擋（即使給了有效的 disclosureLocation）
        res_p0 = _run_with_findings([
            _make_valid_finding_dict(severity="P0", disclosureLocation="/dashboard/estimateNote")
        ])
        self.assertEqual(res_p0.status, REVIEW_STATUS_BLOCKED)
        self.assertFalse(res_p0.ok)
        self.assertTrue(any("[P0]" in r for r in res_p0.blocked_reasons))

        # 情境 B：P1 永遠阻擋
        res_p1 = _run_with_findings([
            _make_valid_finding_dict(severity="P1", disclosureLocation="/dashboard/estimateNote")
        ])
        self.assertEqual(res_p1.status, REVIEW_STATUS_BLOCKED)
        self.assertFalse(res_p1.ok)
        self.assertTrue(any("[P1]" in r for r in res_p1.blocked_reasons))

        # 情境 C：P2 且 disclosureLocation 為有效 package JSON Pointer -> PASS_WITH_P2
        res_p2_pointer_ok = _run_with_findings([
            _make_valid_finding_dict(severity="P2", disclosureLocation="/dashboard/estimateNote")
        ])
        self.assertEqual(res_p2_pointer_ok.status, REVIEW_STATUS_PASS_WITH_P2)
        self.assertTrue(res_p2_pointer_ok.ok)
        self.assertTrue(res_p2_pointer_ok.findings[0].disclosureVerified)

        # 情境 D：P2 且 disclosureLocation 指向實際存在的報告章節與內文片段 -> PASS_WITH_P2
        res_p2_text_ok = _run_with_findings([
            _make_valid_finding_dict(
                severity="P2",
                disclosureLocation="sec-risks: 部分設備交期預估仰賴單一法人說明會口頭指引",
            )
        ])
        self.assertEqual(res_p2_text_ok.status, REVIEW_STATUS_PASS_WITH_P2)
        self.assertTrue(res_p2_text_ok.ok)
        self.assertTrue(res_p2_text_ok.findings[0].disclosureVerified)

        # 情境 E：P2 但 disclosureLocation 為 null 或指向不存在的路徑／文字 -> BLOCKED
        for bad_loc in (None, "null", "/dashboard/nonExistentField", "完全不存在於報告中的虛構揭露段落"):
            res_p2_bad = _run_with_findings([
                _make_valid_finding_dict(severity="P2", disclosureLocation=bad_loc)
            ])
            self.assertEqual(res_p2_bad.status, REVIEW_STATUS_BLOCKED, msg=f"bad_loc={bad_loc!r} 應為 BLOCKED")
            self.assertFalse(res_p2_bad.ok)
            self.assertFalse(res_p2_bad.findings[0].disclosureVerified)

        # 情境 F：僅有 P3 -> 狀態為 PASS，且記錄於 p3_notes 與 findings 中
        res_p3 = _run_with_findings([
            _make_valid_finding_dict(
                severity="P3",
                disclosureLocation=None,
                claim="表格標點符號建議統一全形",
            )
        ])
        self.assertEqual(res_p3.status, REVIEW_STATUS_PASS)
        self.assertTrue(res_p3.ok)
        self.assertEqual(len(res_p3.p3_notes), 1)
        self.assertEqual(res_p3.p3_notes[0].severity, "P3")
        self.assertEqual(res_p3.summary["p3Count"], 1)

    def test_agy_timeout_and_nonzero_exit_are_blocked(self) -> None:
        """
        測試 7：Agy 呼叫逾時（TimeoutExpired）或非零退出碼（returncode != 0）時必須阻擋（BLOCKED）。
        """
        ctx = _make_synthetic_context()

        # 情境 A：批次審查時拋出 subprocess.TimeoutExpired
        def _timeout_responder(args: Sequence[str], kwargs: Any) -> subprocess.CompletedProcess[str]:
            raise subprocess.TimeoutExpired(cmd=list(args), timeout=kwargs.get("timeout", 15))

        runner_timeout = _make_fake_runner(review_responder=_timeout_responder)
        res_timeout = run_gemini_review(
            ctx,
            agy_bin="fake-agy",
            timeout_seconds=15.0,
            base_env={"PATH": ""},
            runner=runner_timeout,
        )
        self.assertEqual(res_timeout.status, REVIEW_STATUS_BLOCKED)
        self.assertFalse(res_timeout.ok)
        self.assertEqual(res_timeout.summary.get("errorCode"), "AGY_TIMEOUT")

        # 情境 B：批次審查回傳非零 exit code
        def _nonzero_responder(args: Sequence[str], kwargs: Any) -> subprocess.CompletedProcess[str]:
            return subprocess.CompletedProcess(
                args=list(args),
                returncode=1,
                stdout="",
                stderr="fatal cli error",
            )

        runner_nonzero = _make_fake_runner(review_responder=_nonzero_responder)
        res_nonzero = run_gemini_review(
            ctx,
            agy_bin="fake-agy",
            base_env={"PATH": ""},
            runner=runner_nonzero,
        )
        self.assertEqual(res_nonzero.status, REVIEW_STATUS_BLOCKED)
        self.assertFalse(res_nonzero.ok)
        self.assertEqual(res_nonzero.summary.get("errorCode"), "AGY_CLI_NON_ZERO")
        self.assertEqual(len(res_nonzero.batches), 1)
        self.assertEqual(res_nonzero.batches[0].wrapper_status, "CLI_NON_ZERO")

    def test_batch_splitting_preserves_all_ids_rejects_overlarge_unit_and_blocks_incomplete_batches(self) -> None:
        """
        測試 8：
        - 批次拆分必須完整保留所有 sectionIds、package collections 與 sourceIds（含未被直接引用的額外 sourceEvidence）；
        - 當單一不可分割單元超過 max_prompt_chars 時必須拋出 GeminiReviewError（BLOCKED）；
        - 多批次執行時若後續批次失敗（無法完成全部批次涵蓋），整體必須為 BLOCKED。
        """
        ctx = _make_synthetic_context()
        # 擴充數個章節與 claims 以觸發多批次拆分
        for i in range(1, 6):
            sec_id = f"sec-extra-{i:02d}"
            ctx["reportSections"].append(
                {
                    "id": sec_id,
                    "title": f"擴充測試章節 {i}",
                    "content": ("合成章節內文驗證資料—" * 35) + f" [section={sec_id}]",
                    "sourceIds": ["src-q3-fs"],
                }
            )
            ctx["package"]["claims"].append(
                {
                    "id": f"claim-extra-{i:02d}",
                    "statement": ("合成主張內容核對文字—" * 25) + f" #{i}",
                    "sourceIds": ["src-ir-deck"],
                }
            )

        max_limit = 3600
        batches = split_review_context_into_batches(ctx, max_prompt_chars=max_limit)
        self.assertGreater(len(batches), 1, msg="預期應拆分為多個批次")

        covered_sections: set[str] = set()
        covered_collections: set[str] = set()
        covered_sources: set[str] = set()

        for idx, spec in enumerate(batches, start=1):
            self.assertEqual(spec.batch_index, idx)
            self.assertEqual(spec.total_batches, len(batches))
            self.assertLessEqual(spec.prompt_char_length, max_limit)
            self.assertEqual(spec.prompt_char_length, len(spec.prompt))
            covered_sections.update(spec.scope.get("sectionIds", []))
            covered_collections.update(spec.scope.get("collections", []))
            covered_sources.update(spec.scope.get("sourceIds", []))

        expected_sections = {sec["id"] for sec in ctx["reportSections"]}
        expected_sources = {src["id"] for src in ctx["sourceEvidence"]}
        expected_collections = {"report", "dashboard", "actuals", "claims", "sources"}

        self.assertEqual(covered_sections, expected_sections)
        self.assertEqual(covered_sources, expected_sources)
        self.assertEqual(covered_collections, expected_collections)

        # 情境 B：單一不可分割章節或來源證據超過 max_prompt_chars 時，必須阻擋（BATCH_SPLIT_EXCEEDS_LIMIT / SOURCE_EVIDENCE_TOO_LARGE）
        overlarge_ctx = _make_synthetic_context()
        overlarge_ctx["reportSections"][0]["content"] = "超長不可分割章節內容" * 400
        with self.assertRaises(GeminiReviewError) as err_overlarge:
            split_review_context_into_batches(overlarge_ctx, max_prompt_chars=2500)
        self.assertIn(
            err_overlarge.exception.code,
            ("BATCH_SPLIT_EXCEEDS_LIMIT", "SOURCE_EVIDENCE_TOO_LARGE"),
        )

        # 情境 C：多批次執行時，若第 2 批回應缺少 findings 陣列（造成批次涵蓋中斷），整體必須為 BLOCKED
        call_counter = {"review_calls": 0}

        def _partial_batch_responder(args: Sequence[str], kwargs: Any) -> subprocess.CompletedProcess[str]:
            call_counter["review_calls"] += 1
            if call_counter["review_calls"] == 1:
                return subprocess.CompletedProcess(
                    args=list(args),
                    returncode=0,
                    stdout=_wrap_model_findings([], batch_id="batch-001"),
                    stderr="",
                )
            # 第 2 批回傳缺少 findings 欄位的內層物件
            bad_inner = json.dumps({"status": "SUCCESS", "response": json.dumps({"batchId": "batch-002"})})
            return subprocess.CompletedProcess(
                args=list(args),
                returncode=0,
                stdout=bad_inner,
                stderr="",
            )

        res_partial = run_gemini_review(
            ctx,
            max_prompt_chars=max_limit,
            agy_bin="fake-agy",
            base_env={"PATH": ""},
            runner=_make_fake_runner(review_responder=_partial_batch_responder),
        )
        self.assertEqual(res_partial.status, REVIEW_STATUS_BLOCKED)
        self.assertFalse(res_partial.ok)
        self.assertEqual(res_partial.summary.get("errorCode"), "MISSING_FINDINGS_ARRAY")
        self.assertLess(len(res_partial.batches), len(batches))

    def test_resolve_json_pointer_and_verify_disclosure_location_helpers(self) -> None:
        """
        測試 9：驗證 RFC 6901 JSON Pointer 解析與 verify_disclosure_location 輔助函式之精確行為。
        """
        ctx = _make_synthetic_context()
        pkg = ctx["package"]

        ok_ptr, val_ptr = resolve_json_pointer(pkg, "/actuals/0/revenue")
        self.assertTrue(ok_ptr)
        self.assertEqual(val_ptr, 1000.0)

        bad_ptr, val_bad = resolve_json_pointer(pkg, "/actuals/99/revenue")
        self.assertFalse(bad_ptr)
        self.assertIsNone(val_bad)

        # 支援 `#/` 格式指標與直接文字子字串定位
        self.assertTrue(
            verify_disclosure_location(
                "research/synth-9999/research-package.json#/dashboard/estimateNote",
                ctx,
            )
        )
        self.assertTrue(verify_disclosure_location("單一供應商集中風險已於風險章節揭露", ctx))
        self.assertFalse(verify_disclosure_location("undisclosed", ctx))
        self.assertFalse(verify_disclosure_location("未揭露", ctx))


if __name__ == "__main__":
    unittest.main()
