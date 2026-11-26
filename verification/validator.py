# -*- coding: utf-8 -*-
"""獨立研究驗證系統的 Package 結構、參照完整性、證據分類與財務重算整合驗證器。"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import re
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker

from .evidence import classify_source_category, inspect_sources_and_evidence
from .hashing import (
    VERIFICATION_POLICY_VERSION,
    canonical_json,
    compute_policy_hash,
    compute_verifier_code_hash,
    make_json_pointer,
    sha256_bytes,
    sha256_canonical,
)
from .recompute import run_financial_recompute

COLLECTIONS: tuple[str, ...] = (
    "actuals", "monthlyRevenue", "segments", "forecasts", "capacity",
    "catalysts", "risks", "signalRules", "signalSnapshots",
)
ALLOWED_PAYLOAD_REFS: frozenset[str] = frozenset(
    {"thesis", *COLLECTIONS, "sections", "sources", "claims", "earningsQuality"}
)
ALLOWED_EVIDENCE_CLASSES: frozenset[str] = frozenset(
    {"official", "third_party_fact", "market_consensus", "research_inference"}
)
FORECAST_ALLOWED_EVIDENCE_CLASSES: frozenset[str] = frozenset(
    {"research_inference", "market_consensus"}
)
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _make_check(
    check_id: str, category: str, file_path: str, json_pointer: str,
    status: str, message: str, expected: Any = None, actual: Any = None,
    source_ids: list[str] | None = None, node_for_hash: Any = None,
) -> dict[str, Any]:
    """建立格式統一且可標準化 JSON 序列化的驗證檢核項目。"""
    payload = node_for_hash if node_for_hash is not None else {
        "id": check_id, "file": file_path, "jsonPointer": json_pointer,
        "expected": expected, "actual": actual,
    }
    return {
        "id": check_id, "category": category, "file": file_path,
        "jsonPointer": json_pointer, "sha256": sha256_canonical(payload),
        "expected": expected, "actual": actual, "diff": None, "tolerance": None,
        "status": status, "message": message,
        "sourceIds": list(source_ids) if source_ids else [],
    }


def _validate_with_schema(
    instance: Any, schema: dict[str, Any], file_path: str, prefix: str
) -> list[dict[str, Any]]:
    """使用 Draft202012Validator 驗證 JSON 文件並轉換為標準檢核結果。"""
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors = sorted(
        validator.iter_errors(instance),
        key=lambda err: ([str(p) for p in err.absolute_path], err.message),
    )
    if not errors:
        return [
            _make_check(
                f"schema.{prefix}.valid", "schema", file_path, "", "PASS",
                f"{prefix} 通過 JSON Schema Draft 2020-12 驗證。",
                expected="valid_schema", actual="valid", node_for_hash=instance,
            )
        ]
    checks: list[dict[str, Any]] = []
    for idx, err in enumerate(errors):
        ptr = make_json_pointer(*err.absolute_path)
        act_val = err.validator_value if isinstance(err.validator_value, (str, int, float, bool)) else str(err.validator)
        checks.append(
            _make_check(
                f"schema.{prefix}.error.{idx}", "schema", file_path, ptr, "BLOCKED",
                f"{prefix} Schema 驗證失敗 ({ptr or '/'})：{err.message}",
                expected=err.validator, actual=act_val,
            )
        )
    return checks


def _validate_references_and_identity(
    manifest: dict[str, Any], pkg: dict[str, Any], slug: str, manifest_rel: str, pkg_rel: str
) -> list[dict[str, Any]]:
    """驗證跨檔案身分一致性、全域 ID 唯一性及 source/claim/payload 參照完整性。"""
    checks: list[dict[str, Any]] = []

    def block(cid: str, ptr: str, msg: str, exp: Any = None, act: Any = None, fpath: str = pkg_rel) -> None:
        checks.append(_make_check(cid, "reference_integrity", fpath, ptr, "BLOCKED", msg, exp, act))

    company = pkg.get("company") if isinstance(pkg.get("company"), dict) else {}
    report = pkg.get("report") if isinstance(pkg.get("report"), dict) else {}
    if (
        manifest.get("slug") != slug or company.get("slug") != slug or report.get("slug") != slug
        or manifest.get("ticker") != company.get("ticker")
        or manifest.get("market") != company.get("market")
        or manifest.get("reportVersion") != report.get("version")
    ):
        block(
            "reference.identity.mismatch", make_json_pointer("company"),
            "Manifest 與 Package 的 slug、ticker、market 或 reportVersion 不一致。",
            slug, company.get("slug"), manifest_rel,
        )

    sources_list = pkg.get("sources") if isinstance(pkg.get("sources"), list) else []
    claims_list = pkg.get("claims") if isinstance(pkg.get("claims"), list) else []
    source_ids = {str(r["id"]) for r in sources_list if isinstance(r, dict) and isinstance(r.get("id"), str)}
    claim_ids = {str(r["id"]) for r in claims_list if isinstance(r, dict) and isinstance(r.get("id"), str)}

    def check_src_claim_refs(node: dict[str, Any], label: str, ptr_tokens: tuple[str | int, ...]) -> None:
        for s_idx, sid in enumerate(node.get("sourceIds") or []):
            if sid not in source_ids:
                block(
                    f"reference.missing_source.{label}.{sid}",
                    make_json_pointer(*ptr_tokens, "sourceIds", s_idx),
                    f"{label} 引用不存在的 sourceId '{sid}'。", "existing_source_id", sid,
                )
        for c_idx, cid in enumerate(node.get("claimIds") or []):
            if cid not in claim_ids:
                block(
                    f"reference.missing_claim.{label}.{cid}",
                    make_json_pointer(*ptr_tokens, "claimIds", c_idx),
                    f"{label} 引用不存在的 claimId '{cid}'。", "existing_claim_id", cid,
                )

    global_ids: dict[str, str] = {}
    for col in (*COLLECTIONS, "sections", "sources", "claims"):
        for idx, row in enumerate(pkg.get(col) if isinstance(pkg.get(col), list) else []):
            if not isinstance(row, dict):
                continue
            rid = str(row.get("id") or f"index-{idx}")
            if rid in global_ids:
                block(
                    f"reference.duplicate_id.{col}.{rid}", make_json_pointer(col, idx, "id"),
                    f"ID '{rid}' 重複出現於 {global_ids[rid]} 與 {col}。", "unique_id", rid,
                )
            else:
                global_ids[rid] = col
            check_src_claim_refs(row, f"{col}.{rid}", (col, idx))

    for idx, claim in enumerate(claims_list):
        if not isinstance(claim, dict):
            continue
        cid = str(claim.get("id") or f"index-{idx}")
        for in_idx, in_cid in enumerate(claim.get("inputClaimIds") or []):
            if in_cid == cid:
                block(
                    f"reference.self_claim.{cid}", make_json_pointer("claims", idx, "inputClaimIds", in_idx),
                    f"claims.{cid} 不可自我依賴（inputClaimIds 包含自身）。", "non_self_claim_id", in_cid,
                )
            elif in_cid not in claim_ids:
                block(
                    f"reference.missing_input_claim.{cid}.{in_cid}",
                    make_json_pointer("claims", idx, "inputClaimIds", in_idx),
                    f"claims.{cid} 引用不存在的 inputClaimId '{in_cid}'。", "existing_claim_id", in_cid,
                )

    if isinstance(pkg.get("thesis"), dict):
        check_src_claim_refs(pkg["thesis"], "thesis", ("thesis",))

    dashboard = pkg.get("dashboard") if isinstance(pkg.get("dashboard"), dict) else {}
    for sub_col in ("demandOutlook", "competitorComparison"):
        for idx, row in enumerate(dashboard.get(sub_col) or []):
            if isinstance(row, dict):
                check_src_claim_refs(row, f"dashboard.{sub_col}.{row.get('id', idx)}", ("dashboard", sub_col, idx))
    if isinstance(dashboard.get("capexSensitivity"), dict):
        check_src_claim_refs(dashboard["capexSensitivity"], "dashboard.capexSensitivity", ("dashboard", "capexSensitivity"))

    eq = pkg.get("earningsQuality")
    if isinstance(eq, dict):
        seen_eq_ids: set[str] = set()
        for p_idx, period in enumerate(eq.get("periods") or []):
            if not isinstance(period, dict):
                continue
            pid = str(period.get("id") or f"index-{p_idx}")
            if pid in seen_eq_ids:
                block(
                    f"reference.duplicate_eq_period.{pid}",
                    make_json_pointer("earningsQuality", "periods", p_idx, "id"),
                    f"earningsQuality.periods 重複出現 period id '{pid}'。", "unique_period_id", pid,
                )
            seen_eq_ids.add(pid)
            check_src_claim_refs(period, f"eq.{pid}", ("earningsQuality", "periods", p_idx))
            seen_adj_ids: set[str] = set()
            for a_idx, adj in enumerate(period.get("adjustments") or []):
                if not isinstance(adj, dict):
                    continue
                aid = str(adj.get("id") or f"index-{a_idx}")
                if aid in seen_adj_ids:
                    block(
                        f"reference.duplicate_eq_adj.{pid}.{aid}",
                        make_json_pointer("earningsQuality", "periods", p_idx, "adjustments", a_idx, "id"),
                        f"earningsQuality.{pid} 重複出現 adjustment id '{aid}'。", "unique_adjustment_id", aid,
                    )
                seen_adj_ids.add(aid)
                check_src_claim_refs(adj, f"eq.{pid}.{aid}", ("earningsQuality", "periods", p_idx, "adjustments", a_idx))
        if isinstance(eq.get("l2"), dict):
            check_src_claim_refs(eq["l2"], "eq.l2", ("earningsQuality", "l2"))

    for s_idx, sec in enumerate(pkg.get("sections") or []):
        if not isinstance(sec, dict):
            continue
        sec_id = str(sec.get("id") or f"index-{s_idx}")
        for r_idx, ref in enumerate(sec.get("payloadRefs") or []):
            if ref not in ALLOWED_PAYLOAD_REFS or (ref == "earningsQuality" and not isinstance(eq, dict)):
                block(
                    f"reference.invalid_payload.{sec_id}.{ref}",
                    make_json_pointer("sections", s_idx, "payloadRefs", r_idx),
                    f"sections.{sec_id} 引用無效或不存在的 payloadRef '{ref}'。", "valid_payload_ref", ref,
                )

    if not checks:
        checks.append(
            _make_check(
                "reference.integrity.valid", "reference_integrity", pkg_rel, "", "PASS",
                "所有 sourceIds、claimIds、inputClaimIds 與 payloadRefs 參照完整性檢核通過。",
                expected="valid_references", actual="valid",
            )
        )
    return checks


def _validate_evidence_class_consistency(
    pkg: dict[str, Any], pkg_rel: str
) -> list[dict[str, Any]]:
    """
    獨立檢核 evidenceClass 與來源分類一致性：
    - 列出 sources/actuals/forecasts/segments/claims 上所有不合法或缺少的 evidenceClass；
    - official actual 必須有至少一個 official source；
    - forecast 僅允許 research_inference 或 market_consensus，不得標 official/third_party_fact；
    - market_consensus 不能由自建 model source (research_inference) 單獨支持；
    - official claim 需至少一個 official source；
    - third_party_fact 不自動視為 market_consensus；券商來源另標 third-party/broker 子類，保留原始 evidenceClass。
    """
    checks: list[dict[str, Any]] = []

    def block(
        cid: str, ptr: str, msg: str, exp: Any = None, act: Any = None, sids: list[str] | None = None
    ) -> None:
        checks.append(
            _make_check(cid, "evidence_consistency", pkg_rel, ptr, "BLOCKED", msg, exp, act, source_ids=sids)
        )

    sources_list = pkg.get("sources") if isinstance(pkg.get("sources"), list) else []
    source_map: dict[str, dict[str, Any]] = {}
    source_cat_map: dict[str, str] = {}

    for idx, src in enumerate(sources_list):
        if not isinstance(src, dict):
            continue
        sid = str(src.get("id") or f"index-{idx}")
        ev_class = src.get("evidenceClass")
        detailed_cat = classify_source_category(src)
        source_map[sid] = src
        source_cat_map[sid] = detailed_cat
        if not isinstance(ev_class, str) or ev_class not in ALLOWED_EVIDENCE_CLASSES:
            block(
                f"evidence_class.invalid.sources.{sid}",
                make_json_pointer("sources", idx, "evidenceClass"),
                f"sources.{sid} 的 evidenceClass 不合法或缺少（實際值：{ev_class!r}）。",
                sorted(ALLOWED_EVIDENCE_CLASSES),
                ev_class if isinstance(ev_class, (str, int, float, bool)) else None,
                [sid],
            )

    target_collections: tuple[str, ...] = ("actuals", "forecasts", "segments", "claims")
    for col in target_collections:
        rows = pkg.get(col) if isinstance(pkg.get(col), list) else []
        for idx, row in enumerate(rows):
            if not isinstance(row, dict):
                continue
            rid = str(row.get("id") or f"index-{idx}")
            ev_class = row.get("evidenceClass")
            raw_sids = row.get("sourceIds")
            sids = [str(s) for s in raw_sids if isinstance(s, str)] if isinstance(raw_sids, list) else []
            ptr = make_json_pointer(col, idx, "evidenceClass")

            if not isinstance(ev_class, str) or ev_class not in ALLOWED_EVIDENCE_CLASSES:
                block(
                    f"evidence_class.invalid.{col}.{rid}",
                    ptr,
                    f"{col}.{rid} 的 evidenceClass 不合法或缺少（實際值：{ev_class!r}）。",
                    sorted(ALLOWED_EVIDENCE_CLASSES),
                    ev_class if isinstance(ev_class, (str, int, float, bool)) else None,
                    sids,
                )
                continue

            ref_classes = [str(source_map[s].get("evidenceClass") or "") for s in sids if s in source_map]
            ref_cats = [source_cat_map[s] for s in sids if s in source_cat_map]

            if col == "forecasts" and ev_class not in FORECAST_ALLOWED_EVIDENCE_CLASSES:
                block(
                    f"evidence_class.forecast_disallowed.{rid}",
                    ptr,
                    f"forecasts.{rid} 為預測列，evidenceClass 僅允許 research_inference 或 market_consensus，不得標為 '{ev_class}'。",
                    sorted(FORECAST_ALLOWED_EVIDENCE_CLASSES),
                    ev_class,
                    sids,
                )

            if col == "actuals" and ev_class == "official":
                if not any(c == "official" for c in ref_classes):
                    block(
                        f"evidence_class.actual_official_missing_source.{rid}",
                        ptr,
                        f"actuals.{rid} 標記為 official，但未包含任何 official source。",
                        "at_least_one_official_source",
                        ref_cats or ref_classes,
                        sids,
                    )

            if col == "claims" and ev_class == "official":
                if not any(c == "official" for c in ref_classes):
                    block(
                        f"evidence_class.claim_official_missing_source.{rid}",
                        ptr,
                        f"claims.{rid} 標記為 official，但未包含任何 official source。",
                        "at_least_one_official_source",
                        ref_cats or ref_classes,
                        sids,
                    )

            if ev_class == "market_consensus":
                non_model_sids = [
                    s for s in sids
                    if s in source_map and str(source_map[s].get("evidenceClass") or "") != "research_inference"
                ]
                if not non_model_sids:
                    block(
                        f"evidence_class.market_consensus_model_only.{col}.{rid}",
                        ptr,
                        f"{col}.{rid} 標記為 market_consensus，不可由自建 model source (research_inference) 單獨支持。",
                        "non_research_inference_source_required",
                        ref_cats or ref_classes,
                        sids,
                    )
                elif not any(c == "market_consensus" for c in ref_classes):
                    block(
                        f"evidence_class.market_consensus_missing_source.{col}.{rid}",
                        ptr,
                        f"{col}.{rid} 標記為 market_consensus，但引用來源僅為 {ref_cats}（不可將 third_party_fact 或 third-party/broker 自動視為 market_consensus）。",
                        "at_least_one_market_consensus_source",
                        ref_cats,
                        sids,
                    )

    if not checks:
        checks.append(
            _make_check(
                "evidence_class.consistency.valid",
                "evidence_consistency",
                pkg_rel,
                "",
                "PASS",
                "所有 sources、actuals、forecasts、segments 與 claims 之 evidenceClass 一致性檢核通過。",
                expected="consistent_evidence_classes",
                actual="valid",
            )
        )
    return checks


SAFE_COMPANY_FIELDS: tuple[str, ...] = (
    "id", "ticker", "market", "name", "slug", "sector", "industry",
)


def _utc_timestamp() -> str:
    """回傳標準 ISO-8601 UTC 時間戳記。"""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _extract_safe_company(pkg: Any, fallback_slug: str) -> dict[str, str]:
    """提取公開安全的 company 識別資訊（僅保留 id/ticker/market/name/slug/sector/industry）。"""
    raw = pkg.get("company") if isinstance(pkg, dict) and isinstance(pkg.get("company"), dict) else {}
    safe: dict[str, str] = {}
    for key in SAFE_COMPANY_FIELDS:
        val = raw.get(key)
        if isinstance(val, str) and val.strip():
            safe[key] = val.strip()
        elif key == "slug" and isinstance(fallback_slug, str) and SLUG_PATTERN.match(fallback_slug):
            safe[key] = fallback_slug
        else:
            safe[key] = ""
    return safe


def _validate_report_profiles(
    profiles_doc: Any, slug: str, profiles_rel: str
) -> list[dict[str, Any]]:
    """檢核 report-profiles.json 結構：包含 profiles.full-research、output 路徑與正整數 expectedPages。"""
    expected_output = f"public/research/reports/{slug}.html"
    if not isinstance(profiles_doc, dict):
        return [
            _make_check(
                "profile.document.invalid", "profile", profiles_rel, "", "BLOCKED",
                "report-profiles.json 頂層結構必須為 JSON object。",
                expected="object", actual=type(profiles_doc).__name__,
            )
        ]

    profiles_obj = profiles_doc.get("profiles")
    full_research = profiles_obj.get("full-research") if isinstance(profiles_obj, dict) else None
    if not isinstance(full_research, dict):
        return [
            _make_check(
                "profile.full_research.missing", "profile", profiles_rel,
                make_json_pointer("profiles", "full-research"), "BLOCKED",
                "report-profiles.json 缺少有效的 profiles.full-research 定義。",
                expected="object", actual=None if full_research is None else type(full_research).__name__,
            )
        ]

    checks: list[dict[str, Any]] = []
    actual_output = full_research.get("output")
    if not isinstance(actual_output, str) or actual_output != expected_output:
        checks.append(
            _make_check(
                "profile.full_research.output_invalid", "profile", profiles_rel,
                make_json_pointer("profiles", "full-research", "output"), "BLOCKED",
                f"profiles.full-research.output 必須為 '{expected_output}'。",
                expected=expected_output,
                actual=actual_output if isinstance(actual_output, (str, int, float, bool)) else None,
            )
        )

    expected_pages = full_research.get("expectedPages")
    if isinstance(expected_pages, bool) or not isinstance(expected_pages, int) or expected_pages < 1:
        checks.append(
            _make_check(
                "profile.full_research.expected_pages_invalid", "profile", profiles_rel,
                make_json_pointer("profiles", "full-research", "expectedPages"), "BLOCKED",
                "profiles.full-research.expectedPages 必須為正整數（>= 1）。",
                expected="positive_integer",
                actual=expected_pages if isinstance(expected_pages, (str, int, float, bool)) else None,
            )
        )

    if not checks:
        checks.append(
            _make_check(
                "profile.full_research.valid", "profile", profiles_rel,
                make_json_pointer("profiles", "full-research"), "PASS",
                "report-profiles.json 的 profiles.full-research 設定（output 與 expectedPages）檢核通過。",
                expected={"output": expected_output, "expectedPages": expected_pages},
                actual={"output": actual_output, "expectedPages": expected_pages},
                node_for_hash=profiles_doc,
            )
        )
    return checks


def _build_error_response(slug: str, root: Path, check: dict[str, Any]) -> dict[str, Any]:
    """建立早期阻擋（如 slug 不合法或 JSON 讀取失敗）之標準回傳結構。"""
    p_hash = compute_policy_hash()
    v_hash = compute_verifier_code_hash(root)
    c_hash = sha256_canonical([check])
    hashes = {
        "manifestHash": "", "packageHash": "", "profileHash": "",
        "evidenceHash": "", "recomputeHash": "",
        "policyHash": p_hash, "verifierCodeHash": v_hash, "checksHash": c_hash,
    }
    counts = {"total": 1, "PASS": 0, "BLOCKED": 1, "NOT_VERIFIED": 0}
    summary = {
        "status": "BLOCKED", "ok": False, "counts": counts,
        "blockedCount": 1, "notVerifiedCount": 0, "missingRequiredSourcesCount": 0,
    }
    return {
        "schemaVersion": "1.0.0",
        "slug": str(slug),
        "status": "BLOCKED",
        "ok": False,
        "policyVersion": VERIFICATION_POLICY_VERSION,
        "packageVersion": "",
        "reportVersion": "",
        "asOfDate": "",
        "timestamp": _utc_timestamp(),
        "company": _extract_safe_company({}, str(slug)),
        "summary": summary,
        **hashes,
        "hashes": hashes,
        "counts": counts,
        "blockedIds": [check["id"]],
        "notVerifiedIds": [],
        "missingRequiredSources": [],
        "sourceCategories": {},
        "sources": [],
        "checks": [check],
    }


def _load_json_with_safe_error(
    root: Path, rel_path: str, check_id: str, category: str = "schema"
) -> tuple[Any, bytes | None, dict[str, Any] | None]:
    """安全讀取並解析 JSON 檔案；失敗時絕不輸出例外原文或絕對路徑，僅回傳相對路徑與泛化錯誤類別。"""
    try:
        raw_bytes = (root / rel_path).read_bytes()
    except FileNotFoundError:
        err_kind = "file_not_found"
    except OSError:
        err_kind = "io_error"
    else:
        try:
            text = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            err_kind = "encoding_error"
        else:
            try:
                return json.loads(text), raw_bytes, None
            except json.JSONDecodeError:
                err_kind = "invalid_json"

    return None, None, _make_check(
        check_id, category, rel_path, "", "BLOCKED",
        f"無法載入或解析 JSON 檔案 '{rel_path}'（錯誤類別：{err_kind}）。",
        expected="readable_valid_json", actual=err_kind,
    )


def validate_research_package(
    slug: str,
    root_dir: str | Path = ".",
    evidence_dir: str | Path | None = None,
) -> dict[str, Any]:
    """獨立驗證單一研究報告 Package（Schema、Profile、參照、證據與財務重算），回傳無內部摘錄之 JSON 安全結果。"""
    root = Path(root_dir)
    manifest_rel = f"research/{slug}/manifest.json"
    pkg_rel = f"research/{slug}/research-package.json"
    profiles_rel = f"research/{slug}/report-profiles.json"
    manifest_schema_rel = "research_system/schemas/research-manifest-v1.schema.json"
    pkg_schema_rel = "research_system/schemas/research-package-v1.schema.json"

    if not isinstance(slug, str) or not SLUG_PATTERN.match(slug):
        return _build_error_response(
            slug, root,
            _make_check(
                "package.slug.invalid", "schema", "research/invalid-slug/research-package.json", "", "BLOCKED",
                "不合法的 research slug 格式（須為 kebab-case 英數小寫）。",
                expected="kebab-case-slug", actual="invalid_slug",
            ),
        )

    for rel_file in (manifest_rel, pkg_rel, manifest_schema_rel, pkg_schema_rel):
        _, _, load_err = _load_json_with_safe_error(root, rel_file, "package.files.load_error", "schema")
        if load_err is not None:
            return _build_error_response(slug, root, load_err)

    manifest, _, _ = _load_json_with_safe_error(root, manifest_rel, "package.files.load_error", "schema")
    pkg, _, _ = _load_json_with_safe_error(root, pkg_rel, "package.files.load_error", "schema")
    manifest_schema, _, _ = _load_json_with_safe_error(root, manifest_schema_rel, "package.files.load_error", "schema")
    pkg_schema, _, _ = _load_json_with_safe_error(root, pkg_schema_rel, "package.files.load_error", "schema")

    profiles_doc, profiles_raw_bytes, profile_load_err = _load_json_with_safe_error(
        root, profiles_rel, "profile.file.load_error", "profile"
    )
    if profile_load_err is not None:
        profile_checks = [profile_load_err]
        profile_hash = ""
    else:
        profile_checks = _validate_report_profiles(profiles_doc, slug, profiles_rel)
        profile_hash = sha256_bytes(profiles_raw_bytes.replace(b"\r\n", b"\n")) if profiles_raw_bytes is not None else ""

    schema_checks = _validate_with_schema(manifest, manifest_schema, manifest_rel, "manifest") + _validate_with_schema(
        pkg, pkg_schema, pkg_rel, "package"
    )
    reference_checks = (
        _validate_references_and_identity(manifest, pkg, slug, manifest_rel, pkg_rel)
        if isinstance(manifest, dict) and isinstance(pkg, dict)
        else []
    )

    pkg_dict = pkg if isinstance(pkg, dict) else {}
    manifest_dict = manifest if isinstance(manifest, dict) else {}
    report_dict = pkg_dict.get("report") if isinstance(pkg_dict.get("report"), dict) else {}

    evidence_consistency_checks = (
        _validate_evidence_class_consistency(pkg_dict, pkg_rel)
        if isinstance(pkg, dict)
        else []
    )
    evidence_report = inspect_sources_and_evidence(
        pkg_dict, root_dir=root, slug=slug, evidence_dir=evidence_dir, pkg_rel_file=pkg_rel
    )
    recompute_report = run_financial_recompute(
        pkg_dict, evidence_availability=evidence_report, pkg_rel_file=pkg_rel
    )

    all_checks: list[dict[str, Any]] = (
        schema_checks + profile_checks + reference_checks + evidence_consistency_checks
        + list(evidence_report.get("checks") or [])
        + list(recompute_report.get("checks") or [])
    )

    counts = {"total": len(all_checks), "PASS": 0, "BLOCKED": 0, "NOT_VERIFIED": 0}
    blocked_ids: list[str] = []
    not_verified_ids: list[str] = []
    for chk in all_checks:
        st = str(chk.get("status") or "NOT_VERIFIED")
        counts[st] = counts.get(st, 0) + 1
        if st == "BLOCKED":
            blocked_ids.append(str(chk.get("id") or ""))
        elif st == "NOT_VERIFIED":
            not_verified_ids.append(str(chk.get("id") or ""))

    missing_req = list(evidence_report.get("missingRequiredSources") or [])
    if counts["BLOCKED"] > 0:
        overall_status = "BLOCKED"
    elif counts["NOT_VERIFIED"] > 0 or missing_req or counts["total"] == 0:
        overall_status = "NOT_VERIFIED"
    else:
        overall_status = "PASS"

    hashes = {
        "manifestHash": sha256_canonical(manifest),
        "packageHash": sha256_canonical(pkg),
        "profileHash": profile_hash,
        "evidenceHash": str(evidence_report.get("evidenceHash") or ""),
        "recomputeHash": str(recompute_report.get("recomputeHash") or ""),
        "policyHash": compute_policy_hash(),
        "verifierCodeHash": compute_verifier_code_hash(root),
        "checksHash": sha256_canonical(all_checks),
    }

    schema_version = str(pkg_dict.get("schemaVersion") or manifest_dict.get("schemaVersion") or "1.0.0")
    package_version = str(pkg_dict.get("packageVersion") or "")
    report_version = str(report_dict.get("version") or manifest_dict.get("reportVersion") or "")
    as_of_date = str(pkg_dict.get("asOfDate") or "")
    summary = {
        "status": overall_status,
        "ok": overall_status == "PASS",
        "counts": counts,
        "blockedCount": counts["BLOCKED"],
        "notVerifiedCount": counts["NOT_VERIFIED"],
        "missingRequiredSourcesCount": len(missing_req),
    }

    result: dict[str, Any] = {
        "schemaVersion": schema_version,
        "slug": slug,
        "status": overall_status,
        "ok": overall_status == "PASS",
        "policyVersion": VERIFICATION_POLICY_VERSION,
        "packageVersion": package_version,
        "reportVersion": report_version,
        "asOfDate": as_of_date,
        "timestamp": _utc_timestamp(),
        "company": _extract_safe_company(pkg_dict, slug),
        "summary": summary,
        **hashes,
        "hashes": hashes,
        "counts": counts,
        "blockedIds": blocked_ids,
        "notVerifiedIds": not_verified_ids,
        "missingRequiredSources": missing_req,
        "sourceCategories": dict(evidence_report.get("categoryCounts") or {}),
        "sources": list(evidence_report.get("publicSourceRecords") or []),
        "checks": all_checks,
    }
    canonical_json(result)
    return result
