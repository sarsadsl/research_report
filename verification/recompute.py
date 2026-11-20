# -*- coding: utf-8 -*-
"""獨立研究驗證系統的財務數值重算模組（純函式、無外部 I/O 副作用）。"""

from __future__ import annotations

import math
from typing import Any

from .hashing import POLICY_SPEC, make_json_pointer, sha256_canonical

SCALE_FACTORS: dict[str, float] = {
    "unit": 1.0,
    "thousand": 1_000.0,
    "million": 1_000_000.0,
    "billion": 1_000_000_000.0,
}

STRUCTURED_EPS_KEYS: tuple[str, ...] = (
    "eps",
    "targetEps",
    "valuationEps",
    "forwardEps",
    "normalizedEps",
    "reportedEps",
    "baseEps",
)

STRUCTURED_MULTIPLE_KEYS: tuple[str, ...] = (
    "multiple",
    "peMultiple",
    "targetPe",
    "pe",
    "targetMultiple",
    "valuationMultiple",
)

STRUCTURED_PRICE_KEYS: tuple[str, ...] = (
    "fairValue",
    "targetPrice",
    "impliedPrice",
    "reasonablePrice",
    "valuationPrice",
    "price",
)


def _is_finite_number(value: Any) -> bool:
    """判斷值是否為有限的 int 或 float（排除 bool）。"""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    return math.isfinite(float(value))


def _round_num(value: float | int | None, digits: int = 4) -> float | int | None:
    """將數值四捨五入至指定小數位數以利序列化。"""
    if value is None or not _is_finite_number(value):
        return None
    rounded = round(float(value), digits)
    if rounded.is_integer():
        return int(rounded)
    return rounded


def _default_pkg_file(pkg: dict[str, Any], pkg_rel_file: str | None = None) -> str:
    """推導預設的 package 相對檔案路徑。"""
    if isinstance(pkg_rel_file, str) and pkg_rel_file.strip():
        return pkg_rel_file.strip()
    report = pkg.get("report") if isinstance(pkg.get("report"), dict) else {}
    company = pkg.get("company") if isinstance(pkg.get("company"), dict) else {}
    slug = str(report.get("slug") or company.get("slug") or "unknown").strip()
    return f"research/{slug}/research-package.json"


def _extract_source_ids(*nodes: Any) -> list[str]:
    """從一或多個節點提取並去重保序的 sourceIds 清單。"""
    seen: set[str] = set()
    result: list[str] = []
    for node in nodes:
        if not isinstance(node, dict):
            continue
        raw_ids = node.get("sourceIds")
        if not isinstance(raw_ids, list):
            continue
        for sid in raw_ids:
            if isinstance(sid, str) and sid.strip() and sid not in seen:
                seen.add(sid)
                result.append(sid)
    return result


def _convert_scale(
    value: float,
    from_scale: str | None,
    to_scale: str | None,
) -> float | None:
    """將數值由 from_scale 換算至 to_scale；若單位未知則回傳 None。"""
    s_from = str(from_scale or "unit")
    s_to = str(to_scale or "unit")
    if s_from not in SCALE_FACTORS or s_to not in SCALE_FACTORS:
        return None
    if s_from == s_to:
        return float(value)
    return float(value) * (SCALE_FACTORS[s_from] / SCALE_FACTORS[s_to])


def _evaluate_evidence_availability(
    source_ids: list[str],
    evidence_availability: Any,
) -> tuple[bool, list[str]]:
    """
    評估指定 source_ids 的必要證據可用性。
    回傳 (是否全數可用, 缺少或未驗證的 source_ids)。
    支援：
    - None：僅檢查 source_ids 是否非空
    - inspect_sources_and_evidence 回傳之 dict（含 missingRequiredSources / publicSourceRecords）
    - dict[source_id, bool | str | dict]
    - set / list / tuple（代表已驗證可用的 source_id 集合）
    """
    if not source_ids:
        return False, ["<missing_source_ids>"]

    if evidence_availability is None:
        return True, []

    if isinstance(evidence_availability, dict):
        # 情況 1：inspect_sources_and_evidence 的回傳結構
        if (
            "missingRequiredSources" in evidence_availability
            or "publicSourceRecords" in evidence_availability
            or "checks" in evidence_availability
        ):
            missing_req = {
                str(sid)
                for sid in (evidence_availability.get("missingRequiredSources") or [])
                if isinstance(sid, str)
            }
            known_ids: set[str] = set()
            explicitly_blocked: set[str] = set()
            for rec in evidence_availability.get("publicSourceRecords") or []:
                if isinstance(rec, dict) and isinstance(rec.get("sourceId"), str):
                    sid = rec["sourceId"]
                    known_ids.add(sid)
                    if rec.get("status") == "BLOCKED":
                        explicitly_blocked.add(sid)
            unavailable: list[str] = []
            for sid in source_ids:
                if sid in missing_req or sid in explicitly_blocked:
                    unavailable.append(sid)
                elif known_ids and sid not in known_ids:
                    unavailable.append(sid)
            return len(unavailable) == 0, unavailable

        # 情況 2：一般 source_id -> 狀態映射
        unavailable = []
        for sid in source_ids:
            if sid not in evidence_availability:
                unavailable.append(sid)
                continue
            status_val = evidence_availability[sid]
            if status_val is False or status_val is None:
                unavailable.append(sid)
            elif isinstance(status_val, str) and status_val.upper() in (
                "NOT_VERIFIED",
                "BLOCKED",
                "MISSING",
                "FAIL",
                "FALSE",
            ):
                unavailable.append(sid)
            elif isinstance(status_val, dict):
                st = str(status_val.get("status") or "").upper()
                avail = status_val.get("available")
                if avail is False or st in ("NOT_VERIFIED", "BLOCKED", "MISSING", "FAIL"):
                    unavailable.append(sid)
        return len(unavailable) == 0, unavailable

    if isinstance(evidence_availability, (set, list, tuple, frozenset)):
        allowed = {str(x) for x in evidence_availability}
        unavailable = [sid for sid in source_ids if sid not in allowed]
        return len(unavailable) == 0, unavailable

    return True, []


def _build_check(
    *,
    check_id: str,
    category: str,
    file_path: str,
    json_pointer: str,
    expected: Any,
    actual: Any,
    status: str,
    message: str,
    source_ids: list[str],
    diff: float | None = None,
    tolerance: float | None = None,
    node_for_hash: Any = None,
) -> dict[str, Any]:
    """建立格式統一且可標準化 JSON 序列化的單一檢核結果。"""
    if status not in ("PASS", "BLOCKED", "NOT_VERIFIED"):
        raise ValueError(f"不合法的檢核狀態: {status}")

    norm_expected = _round_num(expected) if _is_finite_number(expected) else expected
    norm_actual = _round_num(actual) if _is_finite_number(actual) else actual
    norm_diff = _round_num(diff, 6) if _is_finite_number(diff) else None
    norm_tol = _round_num(tolerance, 6) if _is_finite_number(tolerance) else None

    hash_payload = (
        node_for_hash
        if node_for_hash is not None
        else {
            "id": check_id,
            "jsonPointer": json_pointer,
            "expected": norm_expected,
            "actual": norm_actual,
            "sourceIds": source_ids,
        }
    )

    return {
        "id": check_id,
        "category": category,
        "file": file_path,
        "jsonPointer": json_pointer,
        "sha256": sha256_canonical(hash_payload),
        "expected": norm_expected,
        "actual": norm_actual,
        "diff": norm_diff,
        "tolerance": norm_tol,
        "status": status,
        "message": message,
        "sourceIds": list(source_ids),
    }


def _finalize_pass_or_not_verified(
    source_ids: list[str],
    evidence_availability: Any,
    pass_message: str,
) -> tuple[str, str]:
    """
    當數值重算落於容差內時，確認關聯證據是否可用；
    若缺少必要來源證據，維持 NOT_VERIFIED（絕不將 NOT_VERIFIED 轉為 PASS）。
    """
    evidence_ok, missing_sids = _evaluate_evidence_availability(source_ids, evidence_availability)
    if not evidence_ok:
        missing_str = ", ".join(missing_sids)
        return (
            "NOT_VERIFIED",
            f"{pass_message}（惟關聯來源證據 [{missing_str}] 缺失或未驗證，依政策維持 NOT_VERIFIED）。",
        )
    return "PASS", pass_message


def recompute_monthly_revenue_checks(
    pkg: dict[str, Any],
    evidence_availability: Any = None,
    pkg_rel_file: str | None = None,
) -> list[dict[str, Any]]:
    """
    重算月營收項目：
    1. 月營收 MoM（僅當存在可配對之前一個月份時才計）。
    2. 月營收 YoY（僅當存在可配對之上一年同月份時才計）。
    3. 完整季度（3 個月齊備）月營收合計對比該季 actual revenue。
    """
    file_path = _default_pkg_file(pkg, pkg_rel_file)
    tolerances = POLICY_SPEC["tolerances"]
    mom_yoy_tol = float(tolerances["momYoyPctPoints"])
    bridge_abs_tol = float(tolerances["pretaxBridgeAbsolute"])

    raw_monthly = pkg.get("monthlyRevenue")
    monthly_list = raw_monthly if isinstance(raw_monthly, list) else []
    checks: list[dict[str, Any]] = []

    # 建立 (year, month) -> (idx, item) 索引
    by_ym: dict[tuple[int, int], tuple[int, dict[str, Any]]] = {}
    for idx, item in enumerate(monthly_list):
        if not isinstance(item, dict):
            continue
        year = item.get("year")
        month = item.get("month")
        if (
            isinstance(year, int)
            and not isinstance(year, bool)
            and isinstance(month, int)
            and not isinstance(month, bool)
            and 1 <= month <= 12
        ):
            by_ym[(year, month)] = (idx, item)

    # 1 & 2: 逐筆檢核可配對之 MoM 與 YoY
    for idx, item in enumerate(monthly_list):
        if not isinstance(item, dict):
            continue
        year = item.get("year")
        month = item.get("month")
        if (
            not isinstance(year, int)
            or isinstance(year, bool)
            or not isinstance(month, int)
            or isinstance(month, bool)
            or not (1 <= month <= 12)
        ):
            continue

        row_id = str(item.get("id") or f"{year}-{month:02d}")
        curr_rev = item.get("revenue")
        curr_curr = str(item.get("currency") or "")
        curr_scale = str(item.get("scale") or "unit")

        # --- MoM 重算（僅存在前月時才計）---
        prev_ym = (year - 1, 12) if month == 1 else (year, month - 1)
        if prev_ym in by_ym:
            _, prev_item = by_ym[prev_ym]
            prev_rev = prev_item.get("revenue")
            prev_curr = str(prev_item.get("currency") or "")
            prev_scale = str(prev_item.get("scale") or "unit")
            actual_mom = item.get("mom")
            mom_ptr = make_json_pointer("monthlyRevenue", idx, "mom")
            sids = _extract_source_ids(item, prev_item)

            prev_rev_converted = (
                _convert_scale(float(prev_rev), prev_scale, curr_scale)
                if _is_finite_number(prev_rev)
                else None
            )

            if (
                not _is_finite_number(curr_rev)
                or prev_rev_converted is None
                or prev_rev_converted <= 0
                or (curr_curr and prev_curr and curr_curr != prev_curr)
            ):
                checks.append(
                    _build_check(
                        check_id=f"monthly_revenue.mom.{row_id}",
                        category="monthly_revenue_mom",
                        file_path=file_path,
                        json_pointer=mom_ptr,
                        expected=None,
                        actual=actual_mom,
                        status="NOT_VERIFIED",
                        message=f"{year}年{month}月 MoM 缺少有效當月或前月營收基準（或幣別不一致），標記為 NOT_VERIFIED。",
                        source_ids=sids,
                        tolerance=mom_yoy_tol,
                        node_for_hash=item,
                    )
                )
            else:
                expected_mom = ((float(curr_rev) - prev_rev_converted) / prev_rev_converted) * 100.0
                if not _is_finite_number(actual_mom):
                    checks.append(
                        _build_check(
                            check_id=f"monthly_revenue.mom.{row_id}",
                            category="monthly_revenue_mom",
                            file_path=file_path,
                            json_pointer=mom_ptr,
                            expected=expected_mom,
                            actual=actual_mom,
                            status="NOT_VERIFIED",
                            message=f"{year}年{month}月存在可配對前月營收，惟 mom 欄位為空值，標記為 NOT_VERIFIED。",
                            source_ids=sids,
                            tolerance=mom_yoy_tol,
                            node_for_hash=item,
                        )
                    )
                else:
                    diff = abs(float(actual_mom) - expected_mom)
                    if diff > mom_yoy_tol + 1e-9:
                        status = "BLOCKED"
                        msg = (
                            f"{year}年{month}月營收 MoM 重算為 {expected_mom:.2f}%，與記載值 {float(actual_mom):.2f}% "
                            f"差異 {diff:.2f} 個百分點，超過容差 {mom_yoy_tol} 個百分點。"
                        )
                    else:
                        status, msg = _finalize_pass_or_not_verified(
                            sids,
                            evidence_availability,
                            f"{year}年{month}月營收 MoM 重算為 {expected_mom:.2f}%，與記載值 {float(actual_mom):.2f}% 相符（誤差 {diff:.4f}pp <= {mom_yoy_tol}pp）。",
                        )
                    checks.append(
                        _build_check(
                            check_id=f"monthly_revenue.mom.{row_id}",
                            category="monthly_revenue_mom",
                            file_path=file_path,
                            json_pointer=mom_ptr,
                            expected=expected_mom,
                            actual=float(actual_mom),
                            diff=diff,
                            tolerance=mom_yoy_tol,
                            status=status,
                            message=msg,
                            source_ids=sids,
                            node_for_hash=item,
                        )
                    )

        # --- YoY 重算（僅存在上一年同月時才計）---
        prev_year_ym = (year - 1, month)
        if prev_year_ym in by_ym:
            _, prev_y_item = by_ym[prev_year_ym]
            prev_y_rev = prev_y_item.get("revenue")
            prev_y_curr = str(prev_y_item.get("currency") or "")
            prev_y_scale = str(prev_y_item.get("scale") or "unit")
            actual_yoy = item.get("yoy")
            yoy_ptr = make_json_pointer("monthlyRevenue", idx, "yoy")
            sids = _extract_source_ids(item, prev_y_item)

            prev_y_converted = (
                _convert_scale(float(prev_y_rev), prev_y_scale, curr_scale)
                if _is_finite_number(prev_y_rev)
                else None
            )

            if (
                not _is_finite_number(curr_rev)
                or prev_y_converted is None
                or prev_y_converted <= 0
                or (curr_curr and prev_y_curr and curr_curr != prev_y_curr)
            ):
                checks.append(
                    _build_check(
                        check_id=f"monthly_revenue.yoy.{row_id}",
                        category="monthly_revenue_yoy",
                        file_path=file_path,
                        json_pointer=yoy_ptr,
                        expected=None,
                        actual=actual_yoy,
                        status="NOT_VERIFIED",
                        message=f"{year}年{month}月 YoY 缺少有效當月或去年同月營收基準（或幣別不一致），標記為 NOT_VERIFIED。",
                        source_ids=sids,
                        tolerance=mom_yoy_tol,
                        node_for_hash=item,
                    )
                )
            else:
                expected_yoy = ((float(curr_rev) - prev_y_converted) / prev_y_converted) * 100.0
                if not _is_finite_number(actual_yoy):
                    checks.append(
                        _build_check(
                            check_id=f"monthly_revenue.yoy.{row_id}",
                            category="monthly_revenue_yoy",
                            file_path=file_path,
                            json_pointer=yoy_ptr,
                            expected=expected_yoy,
                            actual=actual_yoy,
                            status="NOT_VERIFIED",
                            message=f"{year}年{month}月存在去年同月營收，惟 yoy 欄位為空值，標記為 NOT_VERIFIED。",
                            source_ids=sids,
                            tolerance=mom_yoy_tol,
                            node_for_hash=item,
                        )
                    )
                else:
                    diff = abs(float(actual_yoy) - expected_yoy)
                    if diff > mom_yoy_tol + 1e-9:
                        status = "BLOCKED"
                        msg = (
                            f"{year}年{month}月營收 YoY 重算為 {expected_yoy:.2f}%，與記載值 {float(actual_yoy):.2f}% "
                            f"差異 {diff:.2f} 個百分點，超過容差 {mom_yoy_tol} 個百分點。"
                        )
                    else:
                        status, msg = _finalize_pass_or_not_verified(
                            sids,
                            evidence_availability,
                            f"{year}年{month}月營收 YoY 重算為 {expected_yoy:.2f}%，與記載值 {float(actual_yoy):.2f}% 相符（誤差 {diff:.4f}pp <= {mom_yoy_tol}pp）。",
                        )
                    checks.append(
                        _build_check(
                            check_id=f"monthly_revenue.yoy.{row_id}",
                            category="monthly_revenue_yoy",
                            file_path=file_path,
                            json_pointer=yoy_ptr,
                            expected=expected_yoy,
                            actual=float(actual_yoy),
                            diff=diff,
                            tolerance=mom_yoy_tol,
                            status=status,
                            message=msg,
                            source_ids=sids,
                            node_for_hash=item,
                        )
                    )

    # 3: 完整季度月資料合計對比該季 actual revenue
    raw_actuals = pkg.get("actuals")
    actuals_list = raw_actuals if isinstance(raw_actuals, list) else []

    for act_idx, act in enumerate(actuals_list):
        if not isinstance(act, dict):
            continue
        fy = act.get("fiscalYear")
        q = act.get("quarter")
        if (
            not isinstance(fy, int)
            or isinstance(fy, bool)
            or not isinstance(q, int)
            or isinstance(q, bool)
            or q not in (1, 2, 3, 4)
        ):
            continue

        q_months = [(fy, (q - 1) * 3 + m_offset) for m_offset in (1, 2, 3)]
        if not all(ym in by_ym for ym in q_months):
            # 僅在擁有完整 3 個月月營收資料時執行季度合計對比
            continue

        act_id = str(act.get("id") or act.get("period") or f"{fy}Q{q}")
        act_rev = act.get("revenue")
        act_curr = str(act.get("currency") or "")
        act_scale = str(act.get("scale") or "unit")
        act_ptr = make_json_pointer("actuals", act_idx, "revenue")

        month_items = [by_ym[ym][1] for ym in q_months]
        sids = _extract_source_ids(act, *month_items)

        converted_months: list[float] = []
        valid_months = True
        for m_item in month_items:
            m_rev = m_item.get("revenue")
            m_curr = str(m_item.get("currency") or "")
            m_scale = str(m_item.get("scale") or "unit")
            if not _is_finite_number(m_rev) or (act_curr and m_curr and act_curr != m_curr):
                valid_months = False
                break
            conv = _convert_scale(float(m_rev), m_scale, act_scale)
            if conv is None:
                valid_months = False
                break
            converted_months.append(conv)

        if not valid_months or not _is_finite_number(act_rev) or sum(converted_months) <= 0:
            expected_sum = sum(converted_months) if valid_months else None
            checks.append(
                _build_check(
                    check_id=f"quarterly_revenue.reconciliation.{act_id}",
                    category="quarterly_revenue_reconciliation",
                    file_path=file_path,
                    json_pointer=act_ptr,
                    expected=expected_sum,
                    actual=act_rev,
                    status="NOT_VERIFIED",
                    message=f"{fy}Q{q} 季度月營收合計對比缺少有效 actual revenue 或單月營收輸入，標記為 NOT_VERIFIED。",
                    source_ids=sids,
                    tolerance=mom_yoy_tol,
                    node_for_hash=act,
                )
            )
            continue

        expected_q_rev = sum(converted_months)
        abs_diff = abs(float(act_rev) - expected_q_rev)
        pct_diff = (abs_diff / abs(expected_q_rev)) * 100.0
        allowed_abs = max(bridge_abs_tol, abs(expected_q_rev) * (mom_yoy_tol / 100.0))

        if pct_diff > mom_yoy_tol + 1e-9 and abs_diff > bridge_abs_tol + 1e-9:
            status = "BLOCKED"
            msg = (
                f"{fy}Q{q} 完整三個月營收合計為 {expected_q_rev:.2f}，與該季 actual revenue {float(act_rev):.2f} "
                f"相差 {abs_diff:.2f}（{pct_diff:.2f}%），超過容差（{mom_yoy_tol}% / {allowed_abs:.2f}）。"
            )
        else:
            status, msg = _finalize_pass_or_not_verified(
                sids,
                evidence_availability,
                f"{fy}Q{q} 完整三個月營收合計為 {expected_q_rev:.2f}，與該季 actual revenue {float(act_rev):.2f} 相符（差異 {pct_diff:.4f}%）。",
            )

        checks.append(
            _build_check(
                check_id=f"quarterly_revenue.reconciliation.{act_id}",
                category="quarterly_revenue_reconciliation",
                file_path=file_path,
                json_pointer=act_ptr,
                expected=expected_q_rev,
                actual=float(act_rev),
                diff=pct_diff,
                tolerance=mom_yoy_tol,
                status=status,
                message=msg,
                source_ids=sids,
                node_for_hash=act,
            )
        )

    return checks


def recompute_actual_margin_checks(
    pkg: dict[str, Any],
    evidence_availability: Any = None,
    pkg_rel_file: str | None = None,
) -> list[dict[str, Any]]:
    """
    重算 actuals 的三率（grossMargin / operatingMargin / netMargin）：
    - 由 grossProfit / operatingIncome / netIncome 除以 revenue * 100 重算。
    - 容差取 POLICY_SPEC["tolerances"]["marginPctPoints"]。
    - 同步檢核 earningsQuality.periods 的稅前損益橋接（operatingIncome + nonOperatingNet = pretaxIncome）。
    """
    file_path = _default_pkg_file(pkg, pkg_rel_file)
    tolerances = POLICY_SPEC["tolerances"]
    margin_tol = float(tolerances["marginPctPoints"])
    bridge_rel_tol = float(tolerances["pretaxBridgeRelative"])
    bridge_abs_tol = float(tolerances["pretaxBridgeAbsolute"])

    raw_actuals = pkg.get("actuals")
    actuals_list = raw_actuals if isinstance(raw_actuals, list) else []
    checks: list[dict[str, Any]] = []

    margin_specs: tuple[tuple[str, str, str, str], ...] = (
        ("grossMargin", "grossProfit", "gross_margin", "毛利率"),
        ("operatingMargin", "operatingIncome", "operating_margin", "營業利益率"),
        ("netMargin", "netIncome", "net_margin", "淨利率"),
    )

    for act_idx, act in enumerate(actuals_list):
        if not isinstance(act, dict):
            continue
        act_id = str(act.get("id") or act.get("period") or f"index-{act_idx}")
        period_label = str(act.get("period") or act_id)
        rev = act.get("revenue")
        sids = _extract_source_ids(act)

        for margin_key, income_key, slug_key, label_zh in margin_specs:
            inc_val = act.get(income_key)
            margin_val = act.get(margin_key)
            ptr = make_json_pointer("actuals", act_idx, margin_key)

            can_compute_expected = (
                _is_finite_number(rev) and float(rev) != 0.0 and _is_finite_number(inc_val)
            )
            expected_margin = (
                (float(inc_val) / float(rev)) * 100.0 if can_compute_expected else None
            )

            if not can_compute_expected or not _is_finite_number(margin_val):
                checks.append(
                    _build_check(
                        check_id=f"actual.{slug_key}.{act_id}",
                        category="actual_margin",
                        file_path=file_path,
                        json_pointer=ptr,
                        expected=expected_margin,
                        actual=margin_val,
                        status="NOT_VERIFIED",
                        message=f"期間 {period_label} 之{label_zh}（{margin_key}）缺少 {income_key}、revenue 或目標比率輸入，標記為 NOT_VERIFIED。",
                        source_ids=sids,
                        tolerance=margin_tol,
                        node_for_hash=act,
                    )
                )
                continue

            assert expected_margin is not None
            diff = abs(float(margin_val) - expected_margin)
            if diff > margin_tol + 1e-9:
                status = "BLOCKED"
                msg = (
                    f"期間 {period_label} 之{label_zh}（{margin_key}）重算為 {expected_margin:.2f}%，"
                    f"與記載值 {float(margin_val):.2f}% 差異 {diff:.2f} 個百分點，超過容差 {margin_tol} 個百分點。"
                )
            else:
                status, msg = _finalize_pass_or_not_verified(
                    sids,
                    evidence_availability,
                    f"期間 {period_label} 之{label_zh}（{margin_key}）重算為 {expected_margin:.2f}%，與記載值 {float(margin_val):.2f}% 相符（誤差 {diff:.4f}pp <= {margin_tol}pp）。",
                )

            checks.append(
                _build_check(
                    check_id=f"actual.{slug_key}.{act_id}",
                    category="actual_margin",
                    file_path=file_path,
                    json_pointer=ptr,
                    expected=expected_margin,
                    actual=float(margin_val),
                    diff=diff,
                    tolerance=margin_tol,
                    status=status,
                    message=msg,
                    source_ids=sids,
                    node_for_hash=act,
                )
            )

    # 檢核 earningsQuality.periods 稅前損益橋接（operatingIncome + nonOperatingNet == pretaxIncome）
    eq = pkg.get("earningsQuality") if isinstance(pkg.get("earningsQuality"), dict) else {}
    eq_periods = eq.get("periods") if isinstance(eq.get("periods"), list) else []
    for eq_idx, eq_p in enumerate(eq_periods):
        if not isinstance(eq_p, dict):
            continue
        eq_id = str(eq_p.get("id") or eq_p.get("period") or f"index-{eq_idx}")
        period_label = str(eq_p.get("period") or eq_id)
        op_inc = eq_p.get("operatingIncome")
        non_op = eq_p.get("nonOperatingNet")
        pretax = eq_p.get("pretaxIncome")
        ptr = make_json_pointer("earningsQuality", "periods", eq_idx, "pretaxIncome")
        sids = _extract_source_ids(eq_p)

        if (
            not _is_finite_number(op_inc)
            or not _is_finite_number(non_op)
            or not _is_finite_number(pretax)
        ):
            expected_pretax = (
                float(op_inc) + float(non_op)
                if (_is_finite_number(op_inc) and _is_finite_number(non_op))
                else None
            )
            checks.append(
                _build_check(
                    check_id=f"eq.pretax_bridge.{eq_id}",
                    category="eq_pretax_bridge",
                    file_path=file_path,
                    json_pointer=ptr,
                    expected=expected_pretax,
                    actual=pretax,
                    status="NOT_VERIFIED",
                    message=f"EQ 期間 {period_label} 稅前損益橋接缺少 operatingIncome、nonOperatingNet 或 pretaxIncome，標記為 NOT_VERIFIED。",
                    source_ids=sids,
                    tolerance=bridge_abs_tol,
                    node_for_hash=eq_p,
                )
            )
            continue

        expected_pretax = float(op_inc) + float(non_op)
        abs_diff = abs(float(pretax) - expected_pretax)
        allowed_diff = max(bridge_abs_tol, abs(expected_pretax) * bridge_rel_tol)
        if abs_diff > allowed_diff + 1e-9:
            status = "BLOCKED"
            msg = (
                f"EQ 期間 {period_label} 稅前淨利重算（營業利益 + 業外淨額）為 {expected_pretax:.2f}，"
                f"與記載 pretaxIncome {float(pretax):.2f} 相差 {abs_diff:.2f}，超過容差 {allowed_diff:.2f}。"
            )
        else:
            status, msg = _finalize_pass_or_not_verified(
                sids,
                evidence_availability,
                f"EQ 期間 {period_label} 稅前損益橋接重算為 {expected_pretax:.2f}，與記載值 {float(pretax):.2f} 相符（差異 {abs_diff:.4f} <= {allowed_diff:.4f}）。",
            )

        checks.append(
            _build_check(
                check_id=f"eq.pretax_bridge.{eq_id}",
                category="eq_pretax_bridge",
                file_path=file_path,
                json_pointer=ptr,
                expected=expected_pretax,
                actual=float(pretax),
                diff=abs_diff,
                tolerance=allowed_diff,
                status=status,
                message=msg,
                source_ids=sids,
                node_for_hash=eq_p,
            )
        )

    return checks


def _compute_eps_from_explicit_inputs(
    net_income_attributable: float,
    weighted_average_shares: float,
    income_scale: str | None = "million",
    shares_scale: str | None = None,
) -> float:
    """
    由明確輸入之歸母淨利與加權平均股數計算 EPS（元／股）。
    絕不引用或反推目標 EPS。
    """
    inc_scale = str(income_scale or "unit")
    if shares_scale and str(shares_scale) in SCALE_FACTORS and inc_scale in SCALE_FACTORS:
        factor = SCALE_FACTORS[inc_scale] / SCALE_FACTORS[str(shares_scale)]
        return (float(net_income_attributable) * factor) / float(weighted_average_shares)

    # 若未額外指定 sharesScale：
    # 當 shares >= 1,000,000 且 income_scale 非 unit 時，代表 shares 以「股（unit）」為單位；
    # 否則代表 shares 與 net_income_attributable 採相同 scale（例如百萬元除以百萬股、千元除以千股）。
    if float(weighted_average_shares) >= 1_000_000.0 and inc_scale != "unit":
        inc_factor = SCALE_FACTORS.get(inc_scale, 1.0)
        return (float(net_income_attributable) * inc_factor) / float(weighted_average_shares)

    return float(net_income_attributable) / float(weighted_average_shares)


def recompute_eps_checks(
    pkg: dict[str, Any],
    evidence_availability: Any = None,
    pkg_rel_file: str | None = None,
) -> list[dict[str, Any]]:
    """
    重算 EPS：
    - 只在有歸母淨利（netIncomeAttributable / 明確配對淨利）與 weightedAverageShares 明確輸入時重算。
    - 缺分母（weightedAverageShares 為 None 或 <= 0）或分子回 NOT_VERIFIED，絕不反推 shares。
    - 容差取 POLICY_SPEC["tolerances"]["epsCurrencyUnits"]。
    """
    file_path = _default_pkg_file(pkg, pkg_rel_file)
    eps_tol = float(POLICY_SPEC["tolerances"]["epsCurrencyUnits"])

    raw_actuals = pkg.get("actuals")
    actuals_list = raw_actuals if isinstance(raw_actuals, list) else []
    eq = pkg.get("earningsQuality") if isinstance(pkg.get("earningsQuality"), dict) else {}
    eq_periods = eq.get("periods") if isinstance(eq.get("periods"), list) else []

    # 建立 period -> (eq_idx, eq_period) 索引
    eq_by_period: dict[str, tuple[int, dict[str, Any]]] = {}
    for eq_idx, eq_p in enumerate(eq_periods):
        if isinstance(eq_p, dict) and isinstance(eq_p.get("period"), str):
            eq_by_period[eq_p["period"].strip()] = (eq_idx, eq_p)

    checks: list[dict[str, Any]] = []
    checked_eq_indices: set[int] = set()

    # 1. 檢核 actuals 中的每一筆 EPS
    for act_idx, act in enumerate(actuals_list):
        if not isinstance(act, dict):
            continue
        act_id = str(act.get("id") or act.get("period") or f"index-{act_idx}")
        period_str = str(act.get("period") or "").strip()
        act_eps = act.get("eps")
        act_scale = str(act.get("scale") or "unit")
        act_curr = str(act.get("currency") or "")
        ptr = make_json_pointer("actuals", act_idx, "eps")

        matched_eq: dict[str, Any] | None = None
        if period_str and period_str in eq_by_period:
            matched_eq_idx, matched_eq = eq_by_period[period_str]
            checked_eq_indices.add(matched_eq_idx)

        sids = _extract_source_ids(act, matched_eq)

        # 取得明確的 weightedAverageShares（絕不反推）
        shares_val: Any = act.get("weightedAverageShares")
        shares_scale: str | None = act.get("sharesScale") if isinstance(act.get("sharesScale"), str) else None
        calc_scale = act_scale

        if not _is_finite_number(shares_val) and matched_eq is not None:
            eq_curr = str(matched_eq.get("currency") or "")
            if not act_curr or not eq_curr or act_curr == eq_curr:
                shares_val = matched_eq.get("weightedAverageShares")
                if isinstance(matched_eq.get("sharesScale"), str):
                    shares_scale = matched_eq.get("sharesScale")
                calc_scale = str(matched_eq.get("scale") or act_scale)

        # 取得明確的歸母淨利
        net_inc_attr: Any = act.get("netIncomeAttributable")
        if _is_finite_number(net_inc_attr):
            net_inc_for_calc = _convert_scale(float(net_inc_attr), act_scale, calc_scale)
        elif matched_eq is not None and _is_finite_number(matched_eq.get("netIncomeAttributable")):
            eq_scale = str(matched_eq.get("scale") or calc_scale)
            net_inc_for_calc = _convert_scale(
                float(matched_eq["netIncomeAttributable"]),
                eq_scale,
                calc_scale,
            )
        elif _is_finite_number(act.get("weightedAverageShares")):
            # 當 actual 節點本身直接提供 weightedAverageShares 時，允許使用同節點之 netIncome
            raw_ni = act.get("netIncome")
            net_inc_for_calc = (
                _convert_scale(float(raw_ni), act_scale, calc_scale)
                if _is_finite_number(raw_ni)
                else None
            )
        else:
            net_inc_for_calc = None

        if (
            not _is_finite_number(shares_val)
            or float(shares_val) <= 0.0
            or net_inc_for_calc is None
            or not _is_finite_number(act_eps)
        ):
            expected_eps = (
                _compute_eps_from_explicit_inputs(
                    net_inc_for_calc,
                    float(shares_val),
                    income_scale=calc_scale,
                    shares_scale=shares_scale,
                )
                if (
                    net_inc_for_calc is not None
                    and _is_finite_number(shares_val)
                    and float(shares_val) > 0.0
                )
                else None
            )
            checks.append(
                _build_check(
                    check_id=f"actual.eps.{act_id}",
                    category="eps_recompute",
                    file_path=file_path,
                    json_pointer=ptr,
                    expected=expected_eps,
                    actual=act_eps,
                    status="NOT_VERIFIED",
                    message=(
                        f"期間 {period_str or act_id} 之 EPS 缺少明確 weightedAverageShares 分母或歸母淨利輸入，"
                        "依政策絕不反推股數，標記為 NOT_VERIFIED。"
                    ),
                    source_ids=sids,
                    tolerance=eps_tol,
                    node_for_hash=act,
                )
            )
            continue

        expected_eps = _compute_eps_from_explicit_inputs(
            net_inc_for_calc,
            float(shares_val),
            income_scale=calc_scale,
            shares_scale=shares_scale,
        )
        diff = abs(float(act_eps) - expected_eps)
        if diff > eps_tol + 1e-9:
            status = "BLOCKED"
            msg = (
                f"期間 {period_str or act_id} 之 EPS 由歸母淨利與加權平均股數重算為 {expected_eps:.2f}，"
                f"與記載值 {float(act_eps):.2f} 相差 {diff:.2f} 元，超過容差 {eps_tol} 元。"
            )
        else:
            status, msg = _finalize_pass_or_not_verified(
                sids,
                evidence_availability,
                f"期間 {period_str or act_id} 之 EPS 重算為 {expected_eps:.2f}，與記載值 {float(act_eps):.2f} 相符（誤差 {diff:.4f} <= {eps_tol}）。",
            )

        checks.append(
            _build_check(
                check_id=f"actual.eps.{act_id}",
                category="eps_recompute",
                file_path=file_path,
                json_pointer=ptr,
                expected=expected_eps,
                actual=float(act_eps),
                diff=diff,
                tolerance=eps_tol,
                status=status,
                message=msg,
                source_ids=sids,
                node_for_hash=act,
            )
        )

    # 2. 檢核 earningsQuality.periods 中的 reportedEps
    for eq_idx, eq_p in enumerate(eq_periods):
        if not isinstance(eq_p, dict):
            continue
        eq_id = str(eq_p.get("id") or eq_p.get("period") or f"index-{eq_idx}")
        period_str = str(eq_p.get("period") or eq_id)
        rep_eps = eq_p.get("reportedEps")
        net_inc_attr = eq_p.get("netIncomeAttributable")
        shares_val = eq_p.get("weightedAverageShares")
        eq_scale = str(eq_p.get("scale") or "unit")
        shares_scale = eq_p.get("sharesScale") if isinstance(eq_p.get("sharesScale"), str) else None
        ptr = make_json_pointer("earningsQuality", "periods", eq_idx, "reportedEps")
        sids = _extract_source_ids(eq_p)

        if (
            not _is_finite_number(shares_val)
            or float(shares_val) <= 0.0
            or not _is_finite_number(net_inc_attr)
            or not _is_finite_number(rep_eps)
        ):
            expected_eps = (
                _compute_eps_from_explicit_inputs(
                    float(net_inc_attr),
                    float(shares_val),
                    income_scale=eq_scale,
                    shares_scale=shares_scale,
                )
                if (
                    _is_finite_number(net_inc_attr)
                    and _is_finite_number(shares_val)
                    and float(shares_val) > 0.0
                )
                else None
            )
            checks.append(
                _build_check(
                    check_id=f"eq.eps.{eq_id}",
                    category="eps_recompute",
                    file_path=file_path,
                    json_pointer=ptr,
                    expected=expected_eps,
                    actual=rep_eps,
                    status="NOT_VERIFIED",
                    message=(
                        f"EQ 期間 {period_str} 之 reportedEps 缺少明確 weightedAverageShares 分母或 netIncomeAttributable，"
                        "依政策絕不反推股數，標記為 NOT_VERIFIED。"
                    ),
                    source_ids=sids,
                    tolerance=eps_tol,
                    node_for_hash=eq_p,
                )
            )
            continue

        expected_eps = _compute_eps_from_explicit_inputs(
            float(net_inc_attr),
            float(shares_val),
            income_scale=eq_scale,
            shares_scale=shares_scale,
        )
        diff = abs(float(rep_eps) - expected_eps)
        if diff > eps_tol + 1e-9:
            status = "BLOCKED"
            msg = (
                f"EQ 期間 {period_str} 之 reportedEps 重算為 {expected_eps:.2f}，"
                f"與記載值 {float(rep_eps):.2f} 相差 {diff:.2f} 元，超過容差 {eps_tol} 元。"
            )
        else:
            status, msg = _finalize_pass_or_not_verified(
                sids,
                evidence_availability,
                f"EQ 期間 {period_str} 之 reportedEps 重算為 {expected_eps:.2f}，與記載值 {float(rep_eps):.2f} 相符（誤差 {diff:.4f} <= {eps_tol}）。",
            )

        checks.append(
            _build_check(
                check_id=f"eq.eps.{eq_id}",
                category="eps_recompute",
                file_path=file_path,
                json_pointer=ptr,
                expected=expected_eps,
                actual=float(rep_eps),
                diff=diff,
                tolerance=eps_tol,
                status=status,
                message=msg,
                source_ids=sids,
                node_for_hash=eq_p,
            )
        )

    return checks


def _find_disclosed_base_metric(
    pkg: dict[str, Any],
    field: str,
    base_year: int,
) -> tuple[float | None, str | None, dict[str, Any] | None]:
    """
    在 actuals 或 earningsQuality.periods（或基礎年度 segments/forecasts）尋找 baseYear 的揭露基準值。
    回傳 (數值, scale, 來源節點)。
    """
    raw_actuals = pkg.get("actuals")
    actuals_list = raw_actuals if isinstance(raw_actuals, list) else []

    # 1. 優先尋找 actuals 中 fiscalYear == base_year 且 quarter is None 的全年紀錄
    annual_candidates = [
        act
        for act in actuals_list
        if isinstance(act, dict)
        and act.get("fiscalYear") == base_year
        and act.get("quarter") is None
    ]
    if not annual_candidates:
        year_tokens = {str(base_year), f"{base_year}A", f"FY{base_year}", f"{base_year}FY"}
        annual_candidates = [
            act
            for act in actuals_list
            if isinstance(act, dict)
            and act.get("fiscalYear") == base_year
            and str(act.get("period") or "").strip() in year_tokens
        ]

    for act in annual_candidates:
        val = act.get(field)
        if _is_finite_number(val):
            return float(val), str(act.get("scale") or "unit"), act

    # 2. 尋找 earningsQuality.periods 中的年度揭露資料
    eq = pkg.get("earningsQuality") if isinstance(pkg.get("earningsQuality"), dict) else {}
    eq_periods = eq.get("periods") if isinstance(eq.get("periods"), list) else []
    eq_field_map: dict[str, tuple[str, ...]] = {
        "revenue": ("revenue",),
        "netIncome": ("netIncomeAttributable",),
        "eps": ("reportedEps", "normalizedEps"),
    }
    year_tokens = {str(base_year), f"{base_year}A", f"FY{base_year}", f"{base_year}FY"}
    for eq_p in eq_periods:
        if not isinstance(eq_p, dict):
            continue
        p_str = str(eq_p.get("period") or "").strip()
        p_type = str(eq_p.get("periodType") or "")
        if p_type == "annual" or p_str in year_tokens:
            if p_str in year_tokens or p_str.startswith(str(base_year)):
                for cand_key in eq_field_map.get(field, (field,)):
                    val = eq_p.get(cand_key)
                    if _is_finite_number(val):
                        return float(val), str(eq_p.get("scale") or "unit"), eq_p

    # 3. 若為 optoShare，可檢查 base_year 的 segments（非估計之實際值）或對應年份紀錄
    if field == "optoShare":
        segments = pkg.get("segments") if isinstance(pkg.get("segments"), list) else []
        for seg in segments:
            if not isinstance(seg, dict):
                continue
            p_str = str(seg.get("period") or "").strip()
            seg_name = str(seg.get("segment") or "").lower()
            if p_str in year_tokens and ("opto" in seg_name or "光電" in seg_name or "光學" in seg_name):
                val = seg.get("share")
                if _is_finite_number(val):
                    return float(val), str(seg.get("scale") or "unit"), seg

    return None, None, None


def _find_target_forecast_metric(
    pkg: dict[str, Any],
    field: str,
    target_year: int,
    scenario: str,
) -> tuple[float | None, str | None, dict[str, Any] | None]:
    """在 forecasts 中尋找 targetYear 與對應 scenario 的預測值。"""
    raw_forecasts = pkg.get("forecasts")
    forecasts_list = raw_forecasts if isinstance(raw_forecasts, list) else []

    year_matches = [
        fc
        for fc in forecasts_list
        if isinstance(fc, dict) and fc.get("fiscalYear") == target_year
    ]
    if not year_matches:
        return None, None, None

    scenario_matches = [
        fc for fc in year_matches if str(fc.get("scenario") or "").strip() == scenario
    ]
    chosen = scenario_matches[0] if scenario_matches else (year_matches[0] if len(year_matches) == 1 else None)
    if chosen is None:
        return None, None, None

    val = chosen.get(field)
    if not _is_finite_number(val):
        return None, str(chosen.get("scale") or "unit"), chosen
    return float(val), str(chosen.get("scale") or "unit"), chosen


def recompute_cagr_checks(
    pkg: dict[str, Any],
    evidence_availability: Any = None,
    pkg_rel_file: str | None = None,
) -> list[dict[str, Any]]:
    """
    重算 dashboard.cagrCards：
    - 連結至 baseYear 的 actual / EQ disclosed data 與 targetYear 的 target forecast。
    - 核對 baseValue、years (targetYear - baseYear) 並重算 CAGR。
    - 缺數值回 NOT_VERIFIED，差異超過容差回 BLOCKED。
    """
    file_path = _default_pkg_file(pkg, pkg_rel_file)
    tolerances = POLICY_SPEC["tolerances"]
    cagr_tol = float(tolerances["cagrPctPoints"])
    eps_tol = float(tolerances["epsCurrencyUnits"])
    margin_tol = float(tolerances["marginPctPoints"])

    dashboard = pkg.get("dashboard") if isinstance(pkg.get("dashboard"), dict) else {}
    default_scenario = str(dashboard.get("forecastScenario") or "base").strip()
    raw_cards = dashboard.get("cagrCards")
    cards_list = raw_cards if isinstance(raw_cards, list) else []

    checks: list[dict[str, Any]] = []
    if not cards_list:
        checks.append(
            _build_check(
                check_id="cagr.cards.missing",
                category="cagr_recompute",
                file_path=file_path,
                json_pointer=make_json_pointer("dashboard", "cagrCards"),
                expected="non_empty_cagr_cards",
                actual=None,
                status="NOT_VERIFIED",
                message="dashboard.cagrCards 為空或缺失，無法執行 CAGR 重算，標記為 NOT_VERIFIED。",
                source_ids=[],
                tolerance=cagr_tol,
                node_for_hash=dashboard,
            )
        )
        return checks

    monetary_fields = {"revenue", "netIncome"}

    for idx, card in enumerate(cards_list):
        if not isinstance(card, dict):
            continue
        field = str(card.get("field") or f"card-{idx}")
        base_year = card.get("baseYear")
        target_year = card.get("targetYear")
        card_base_val = card.get("baseValue")
        card_years = card.get("years")
        scenario = str(card.get("scenario") or default_scenario).strip()
        ptr = make_json_pointer("dashboard", "cagrCards", idx)
        check_id = f"cagr.{field}.{base_year}_{target_year}.{idx}"

        if (
            not isinstance(base_year, int)
            or isinstance(base_year, bool)
            or not isinstance(target_year, int)
            or isinstance(target_year, bool)
        ):
            checks.append(
                _build_check(
                    check_id=check_id,
                    category="cagr_recompute",
                    file_path=file_path,
                    json_pointer=ptr,
                    expected=None,
                    actual=None,
                    status="NOT_VERIFIED",
                    message=f"CAGR 卡片 {field} 缺少有效整數 baseYear 或 targetYear，標記為 NOT_VERIFIED。",
                    source_ids=_extract_source_ids(card),
                    tolerance=cagr_tol,
                    node_for_hash=card,
                )
            )
            continue

        disclosed_val, disclosed_scale, base_node = _find_disclosed_base_metric(pkg, field, base_year)
        target_val, target_scale, target_node = _find_target_forecast_metric(
            pkg, field, target_year, scenario
        )
        sids = _extract_source_ids(card, base_node, target_node)

        # 檢查必要數值是否齊備
        if (
            disclosed_val is None
            or target_val is None
            or not _is_finite_number(card_base_val)
            or not _is_finite_number(card_years)
        ):
            checks.append(
                _build_check(
                    check_id=check_id,
                    category="cagr_recompute",
                    file_path=file_path,
                    json_pointer=ptr,
                    expected=None,
                    actual=card_base_val,
                    status="NOT_VERIFIED",
                    message=(
                        f"CAGR 卡片 {field}（{base_year}->{target_year}）缺少基準年實際／EQ 揭露值、"
                        "目標年預測值或卡片輸入值，標記為 NOT_VERIFIED。"
                    ),
                    source_ids=sids,
                    tolerance=cagr_tol,
                    node_for_hash=card,
                )
            )
            continue

        expected_years = float(target_year - base_year)
        if expected_years <= 0 or float(card_years) <= 0:
            checks.append(
                _build_check(
                    check_id=check_id,
                    category="cagr_recompute",
                    file_path=file_path,
                    json_pointer=ptr,
                    expected=expected_years,
                    actual=card_years,
                    status="BLOCKED" if expected_years <= 0 else "NOT_VERIFIED",
                    message=f"CAGR 卡片 {field}（{base_year}->{target_year}）之期間年數不合法（expected={expected_years}, actual={card_years}）。",
                    source_ids=sids,
                    tolerance=cagr_tol,
                    node_for_hash=card,
                )
            )
            continue

        # 對齊金額單位
        if field in monetary_fields:
            disclosed_in_target_scale = _convert_scale(disclosed_val, disclosed_scale, target_scale)
            if disclosed_in_target_scale is None:
                disclosed_in_target_scale = disclosed_val
        else:
            disclosed_in_target_scale = disclosed_val

        if disclosed_in_target_scale <= 0 or target_val <= 0 or float(card_base_val) <= 0:
            checks.append(
                _build_check(
                    check_id=check_id,
                    category="cagr_recompute",
                    file_path=file_path,
                    json_pointer=ptr,
                    expected=None,
                    actual=card_base_val,
                    status="NOT_VERIFIED",
                    message=f"CAGR 卡片 {field}（{base_year}->{target_year}）基準值或目標值非正數，無法計算複合年增率，標記為 NOT_VERIFIED。",
                    source_ids=sids,
                    tolerance=cagr_tol,
                    node_for_hash=card,
                )
            )
            continue

        # 計算由 disclosed base 與 target forecast 得出的真值 CAGR (%)
        expected_cagr_pct = (
            (target_val / disclosed_in_target_scale) ** (1.0 / expected_years) - 1.0
        ) * 100.0

        # 計算由卡片自身 baseValue 與 years 得出的隱含 CAGR (%)
        card_base_for_calc = float(card_base_val)
        if (
            field in monetary_fields
            and disclosed_scale != target_scale
            and abs(card_base_for_calc - disclosed_val) <= 1e-6
        ):
            converted_card_base = _convert_scale(card_base_for_calc, disclosed_scale, target_scale)
            if converted_card_base is not None and converted_card_base > 0:
                card_base_for_calc = converted_card_base

        card_implied_cagr_pct = (
            (target_val / card_base_for_calc) ** (1.0 / float(card_years)) - 1.0
        ) * 100.0

        # 若卡片另有明確宣告之 cagr / cagrPct / value 欄位則優先與之比對
        explicit_cagr: float | None = None
        for c_key in ("cagr", "cagrPct", "reportedCagr", "value"):
            if _is_finite_number(card.get(c_key)):
                explicit_cagr = float(card[c_key])
                break

        actual_cagr_pct = explicit_cagr if explicit_cagr is not None else card_implied_cagr_pct
        cagr_diff = abs(actual_cagr_pct - expected_cagr_pct)

        # 同步檢查 baseValue 與 disclosed_val 是否一致，以及 years 是否等於 targetYear - baseYear
        years_mismatch = abs(float(card_years) - expected_years) > 1e-6
        base_diff_raw = min(
            abs(float(card_base_val) - disclosed_val),
            abs(float(card_base_val) - disclosed_in_target_scale),
        )
        if field == "eps":
            base_mismatch = base_diff_raw > eps_tol + 1e-9
        elif field in ("grossMargin", "optoShare"):
            base_mismatch = base_diff_raw > margin_tol + 1e-9
        else:
            rel_base_diff = (base_diff_raw / abs(disclosed_in_target_scale)) * 100.0
            base_mismatch = rel_base_diff > cagr_tol + 1e-9

        if years_mismatch or base_mismatch or cagr_diff > cagr_tol + 1e-9:
            status = "BLOCKED"
            reasons: list[str] = []
            if years_mismatch:
                reasons.append(f"years 記載為 {card_years}（應為 {expected_years:.0f}）")
            if base_mismatch:
                reasons.append(
                    f"baseValue 記載為 {float(card_base_val):.2f}（與 {base_year} 揭露值 {disclosed_in_target_scale:.2f} 不符）"
                )
            if cagr_diff > cagr_tol + 1e-9:
                reasons.append(
                    f"CAGR 重算為 {expected_cagr_pct:.2f}%，與卡片數值 {actual_cagr_pct:.2f}% 相差 {cagr_diff:.2f}pp（超過容差 {cagr_tol}pp）"
                )
            msg = f"CAGR 卡片 {field}（{base_year}->{target_year}）檢核未通過：" + "；".join(reasons) + "。"
        else:
            status, msg = _finalize_pass_or_not_verified(
                sids,
                evidence_availability,
                (
                    f"CAGR 卡片 {field}（{base_year}->{target_year}）已連結基準年揭露值 {disclosed_in_target_scale:.2f} "
                    f"與目標年預測值 {target_val:.2f}，重算 CAGR 為 {expected_cagr_pct:.2f}%，核對相符。"
                ),
            )

        checks.append(
            _build_check(
                check_id=check_id,
                category="cagr_recompute",
                file_path=file_path,
                json_pointer=ptr,
                expected=expected_cagr_pct,
                actual=actual_cagr_pct,
                diff=cagr_diff,
                tolerance=cagr_tol,
                status=status,
                message=msg,
                source_ids=sids,
                node_for_hash=card,
            )
        )

    return checks


def _extract_first_key_value(
    node: dict[str, Any],
    candidate_keys: tuple[str, ...],
) -> tuple[str | None, Any]:
    """從字典中依序尋找第一個存在且非 None 的欄位名稱與值。"""
    for key in candidate_keys:
        if key in node and node[key] is not None:
            return key, node[key]
    return None, None


def _recompute_single_pe_node(
    *,
    pkg: dict[str, Any],
    val_node: dict[str, Any],
    pointer: str,
    check_id: str,
    file_path: str,
    evidence_availability: Any,
    fallback_source_ids: list[str],
) -> dict[str, Any]:
    """對單一 valuation 節點執行結構化 PE 估值重算。"""
    tolerances = POLICY_SPEC["tolerances"]
    val_tol = float(tolerances["valuationCurrencyUnits"])
    eps_tol = float(tolerances["epsCurrencyUnits"])

    eps_key, eps_val = _extract_first_key_value(val_node, STRUCTURED_EPS_KEYS)
    mult_key, mult_val = _extract_first_key_value(val_node, STRUCTURED_MULTIPLE_KEYS)
    price_key, price_val = _extract_first_key_value(val_node, STRUCTURED_PRICE_KEYS)

    sids = _extract_source_ids(val_node) or list(fallback_source_ids)

    # 若只有自由文字（如 notes）而無結構化 EPS 與 multiple 欄位，一律回 NOT_VERIFIED
    if not _is_finite_number(eps_val) or not _is_finite_number(mult_val):
        return _build_check(
            check_id=check_id,
            category="pe_valuation",
            file_path=file_path,
            json_pointer=pointer,
            expected=None,
            actual=price_val if _is_finite_number(price_val) else None,
            status="NOT_VERIFIED",
            message="PE valuation 僅含自由文字說明或缺少結構化 EPS 與 multiple 欄位，依政策不解析自由文字，標記為 NOT_VERIFIED。",
            source_ids=sids,
            tolerance=val_tol,
            node_for_hash=val_node,
        )

    if float(eps_val) <= 0.0 or float(mult_val) <= 0.0:
        return _build_check(
            check_id=check_id,
            category="pe_valuation",
            file_path=file_path,
            json_pointer=pointer,
            expected=None,
            actual=price_val if _is_finite_number(price_val) else None,
            status="NOT_VERIFIED",
            message=f"PE valuation 之結構化 {eps_key}={eps_val} 或 {mult_key}={mult_val} 非正數，標記為 NOT_VERIFIED。",
            source_ids=sids,
            tolerance=val_tol,
            node_for_hash=val_node,
        )

    expected_fair_value = float(eps_val) * float(mult_val)

    if not _is_finite_number(price_val):
        return _build_check(
            check_id=check_id,
            category="pe_valuation",
            file_path=file_path,
            json_pointer=pointer,
            expected=expected_fair_value,
            actual=None,
            status="NOT_VERIFIED",
            message=(
                f"PE valuation 已提供結構化 {eps_key}={float(eps_val):.2f} 與 {mult_key}={float(mult_val):.2f} "
                f"（推算合理價 {expected_fair_value:.2f}），惟缺少結構化合理價目標欄位，標記為 NOT_VERIFIED。"
            ),
            source_ids=sids,
            tolerance=val_tol,
            node_for_hash=val_node,
        )

    target_ptr = f"{pointer}/{price_key}" if price_key else pointer
    diff = abs(float(price_val) - expected_fair_value)

    # 若節點同時標註 epsBasis 與對應 period，檢查結構化 EPS 是否與 EQ period 揭露之對應基礎一致
    eps_basis = str(val_node.get("epsBasis") or "").strip()
    ref_period = str(val_node.get("period") or val_node.get("fiscalYear") or "").strip()
    basis_mismatch_msg = ""
    if eps_basis in ("reported", "normalized") and ref_period:
        eq = pkg.get("earningsQuality") if isinstance(pkg.get("earningsQuality"), dict) else {}
        for eq_p in eq.get("periods") or []:
            if isinstance(eq_p, dict) and str(eq_p.get("period") or "").strip() == ref_period:
                ref_key = "reportedEps" if eps_basis == "reported" else "normalizedEps"
                ref_eps = eq_p.get(ref_key)
                if _is_finite_number(ref_eps) and abs(float(eps_val) - float(ref_eps)) > eps_tol + 1e-9:
                    basis_mismatch_msg = (
                        f"（且結構化 {eps_key}={float(eps_val):.2f} 與 {ref_period} 之 {ref_key}={float(ref_eps):.2f} 不符）"
                    )
                break

    if diff > val_tol + 1e-9 or basis_mismatch_msg:
        status = "BLOCKED"
        msg = (
            f"PE valuation 由 {eps_key}={float(eps_val):.2f} × {mult_key}={float(mult_val):.2f} 重算合理價為 "
            f"{expected_fair_value:.2f}，與記載 {price_key}={float(price_val):.2f} 相差 {diff:.2f}"
            f"{basis_mismatch_msg}，超過容差 {val_tol}。"
        )
    else:
        status, msg = _finalize_pass_or_not_verified(
            sids,
            evidence_availability,
            (
                f"PE valuation 由 {eps_key}={float(eps_val):.2f} × {mult_key}={float(mult_val):.2f} 重算合理價為 "
                f"{expected_fair_value:.2f}，與記載 {price_key}={float(price_val):.2f} 相符（誤差 {diff:.4f} <= {val_tol}）。"
            ),
        )

    return _build_check(
        check_id=check_id,
        category="pe_valuation",
        file_path=file_path,
        json_pointer=target_ptr,
        expected=expected_fair_value,
        actual=float(price_val),
        diff=diff,
        tolerance=val_tol,
        status=status,
        message=msg,
        source_ids=sids,
        node_for_hash=val_node,
    )


def recompute_pe_valuation_checks(
    pkg: dict[str, Any],
    evidence_availability: Any = None,
    pkg_rel_file: str | None = None,
) -> list[dict[str, Any]]:
    """
    重算 PE valuation 合理價：
    - 僅支援 package 存在結構化 EPS 與 multiple 欄位的值，計算合理價（EPS * multiple）。
    - 若只有自由文字（如 earningsQuality.valuation.notes），回 NOT_VERIFIED。
    - 容差取 POLICY_SPEC["tolerances"]["valuationCurrencyUnits"]。
    """
    file_path = _default_pkg_file(pkg, pkg_rel_file)
    val_tol = float(POLICY_SPEC["tolerances"]["valuationCurrencyUnits"])

    eq = pkg.get("earningsQuality") if isinstance(pkg.get("earningsQuality"), dict) else {}
    eq_l2 = eq.get("l2") if isinstance(eq.get("l2"), dict) else {}
    eq_periods = eq.get("periods") if isinstance(eq.get("periods"), list) else []
    fallback_sids = _extract_source_ids(eq_l2, *eq_periods)

    candidate_locations: list[tuple[str, str, dict[str, Any]]] = []
    if isinstance(eq.get("valuation"), dict):
        candidate_locations.append(
            ("valuation.pe.earnings_quality", make_json_pointer("earningsQuality", "valuation"), eq["valuation"])
        )
    if isinstance(pkg.get("valuation"), dict):
        candidate_locations.append(
            ("valuation.pe.root", make_json_pointer("valuation"), pkg["valuation"])
        )
    dashboard = pkg.get("dashboard") if isinstance(pkg.get("dashboard"), dict) else {}
    if isinstance(dashboard.get("valuation"), dict):
        candidate_locations.append(
            ("valuation.pe.dashboard", make_json_pointer("dashboard", "valuation"), dashboard["valuation"])
        )

    checks: list[dict[str, Any]] = []
    if not candidate_locations:
        checks.append(
            _build_check(
                check_id="valuation.pe.missing",
                category="pe_valuation",
                file_path=file_path,
                json_pointer=make_json_pointer("earningsQuality", "valuation"),
                expected=None,
                actual=None,
                status="NOT_VERIFIED",
                message="Package 未包含 valuation 結構化區塊，PE 估值合理價標記為 NOT_VERIFIED。",
                source_ids=fallback_sids,
                tolerance=val_tol,
            )
        )
        return checks

    for base_id, base_ptr, val_node in candidate_locations:
        # 若 valuation 節點內含 scenarios / targets / bands 結構化陣列，逐筆檢核
        sub_list_checked = False
        for list_key in ("scenarios", "targets", "bands", "items"):
            sub_items = val_node.get(list_key)
            if isinstance(sub_items, list) and sub_items:
                sub_list_checked = True
                for s_idx, sub_node in enumerate(sub_items):
                    if not isinstance(sub_node, dict):
                        continue
                    sub_id = str(sub_node.get("id") or sub_node.get("scenario") or s_idx)
                    sub_ptr = f"{base_ptr}/{list_key}/{s_idx}"
                    checks.append(
                        _recompute_single_pe_node(
                            pkg=pkg,
                            val_node=sub_node,
                            pointer=sub_ptr,
                            check_id=f"{base_id}.{sub_id}",
                            file_path=file_path,
                            evidence_availability=evidence_availability,
                            fallback_source_ids=_extract_source_ids(val_node) or fallback_sids,
                        )
                    )

        if not sub_list_checked:
            checks.append(
                _recompute_single_pe_node(
                    pkg=pkg,
                    val_node=val_node,
                    pointer=base_ptr,
                    check_id=base_id,
                    file_path=file_path,
                    evidence_availability=evidence_availability,
                    fallback_source_ids=fallback_sids,
                )
            )

    return checks


def recompute_financial_checks(
    pkg: dict[str, Any],
    evidence_availability: Any = None,
    pkg_rel_file: str | None = None,
) -> list[dict[str, Any]]:
    """
    執行完整財務重算並回傳可序列化的逐項 financial checks 清單：
    1. 月營收 MoM / YoY 與完整季度月營收合計對比。
    2. Actual 毛利率／營益率／淨利率重算與 EQ 稅前損益橋接。
    3. EPS 重算（需明確歸母淨利與加權平均股數，絕不反推股數）。
    4. Dashboard CAGR 卡片連結至基準年揭露值與目標年預測值重算。
    5. PE valuation 結構化合理價重算（僅自由文字時回 NOT_VERIFIED）。
    """
    checks: list[dict[str, Any]] = []
    checks.extend(recompute_monthly_revenue_checks(pkg, evidence_availability, pkg_rel_file))
    checks.extend(recompute_actual_margin_checks(pkg, evidence_availability, pkg_rel_file))
    checks.extend(recompute_eps_checks(pkg, evidence_availability, pkg_rel_file))
    checks.extend(recompute_cagr_checks(pkg, evidence_availability, pkg_rel_file))
    checks.extend(recompute_pe_valuation_checks(pkg, evidence_availability, pkg_rel_file))
    return checks


def run_financial_recompute(
    pkg: dict[str, Any],
    evidence_availability: Any = None,
    pkg_rel_file: str | None = None,
) -> dict[str, Any]:
    """
    執行完整財務重算並回傳彙總報告字典（含逐項 checks、狀態計數、阻擋清單與雜湊值）。
    """
    checks = recompute_financial_checks(pkg, evidence_availability, pkg_rel_file)
    counts: dict[str, int] = {
        "total": len(checks),
        "PASS": 0,
        "BLOCKED": 0,
        "NOT_VERIFIED": 0,
    }
    blocked_ids: list[str] = []
    not_verified_ids: list[str] = []

    for chk in checks:
        st = str(chk.get("status") or "NOT_VERIFIED")
        if st in counts:
            counts[st] += 1
        if st == "BLOCKED":
            blocked_ids.append(str(chk.get("id") or ""))
        elif st == "NOT_VERIFIED":
            not_verified_ids.append(str(chk.get("id") or ""))

    return {
        "checks": checks,
        "counts": counts,
        "blockedIds": blocked_ids,
        "notVerifiedIds": not_verified_ids,
        "hasBlocked": len(blocked_ids) > 0,
        "recomputeHash": sha256_canonical(checks),
    }
