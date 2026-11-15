# -*- coding: utf-8 -*-
"""來源證據分類、本機 evidence-dir 讀取（支援 txt 與 pypdf 抽字）及敏感資料隔離。"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from .hashing import make_json_pointer, sha256_bytes, sha256_canonical, sha256_text

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover
    PdfReader = None  # type: ignore[assignment]


BROKER_KEYWORDS: tuple[str, ...] = (
    "證券",
    "投顧",
    "投信",
    "券商",
    "個別券商",
    "研究部",
    "狼友小站",
    "broker",
    "securities",
    "capital",
    "investment",
    "research note",
)

RESTRICTED_NOTE_KEYWORDS: tuple[str, ...] = (
    "不公開",
    "內部授權",
    "受限",
    "restricted",
    "confidential",
    "proprietary",
)


def classify_source_category(source: dict[str, Any]) -> str:
    """
    清楚區分四類證據與第三方子類別：
    - official: 官方財報／法說／監管公告
    - third-party/broker: 第三方券商／投顧研究報告
    - third-party/fact: 一般第三方公開事實（如行情網站、公開逐字稿）
    - market_consensus: 具名市場統計共識
    - research_inference: 自建研究推論與模型
    """
    ev_class = str(source.get("evidenceClass") or "")
    if ev_class == "official":
        return "official"
    if ev_class == "market_consensus":
        return "market_consensus"
    if ev_class == "research_inference":
        return "research_inference"
    if ev_class == "third_party_fact":
        combined = " ".join(
            str(source.get(field) or "") for field in ("provider", "title", "notes", "id")
        ).lower()
        if any(kw.lower() in combined for kw in BROKER_KEYWORDS):
            return "third-party/broker"
        return "third-party/fact"
    return ev_class or "unknown"


def is_restricted_source(source: dict[str, Any], detailed_category: str) -> bool:
    """判斷來源是否屬於禁止公開複製原文的受限／券商資料。"""
    if detailed_category == "third-party/broker":
        return True
    notes = str(source.get("notes") or "").lower()
    return any(kw.lower() in notes for kw in RESTRICTED_NOTE_KEYWORDS)


def extract_pdf_text(pdf_path: Path) -> str:
    """使用 pypdf 從本機 PDF 證據檔抽取纯文字，不複製或修改原始檔。"""
    if PdfReader is None:
        raise RuntimeError("未安裝 pypdf，無法抽取 PDF 文字；請安裝 requirements-verification.txt。")
    reader = PdfReader(str(pdf_path))
    pages_text: list[str] = []
    for index, page in enumerate(reader.pages):
        extracted = page.extract_text() or ""
        pages_text.append(f"[Page {index + 1}]\n{extracted.strip()}")
    return "\n\n".join(pages_text).strip()


def _find_evidence_file_for_source(
    source: dict[str, Any],
    search_dirs: list[Path],
) -> Path | None:
    """依 source ID 或 attachment 在允許的本機證據目錄中尋找 txt/pdf 檔案。"""
    source_id = str(source.get("id") or "").strip()
    if not source_id or not re.match(r"^[A-Za-z0-9_.-]+$", source_id):
        return None

    candidates: list[str] = []
    attachment = source.get("attachment")
    if isinstance(attachment, str) and attachment.strip():
        candidates.append(attachment.strip())
    for ext in (".txt", ".pdf", ".md"):
        candidates.append(f"{source_id}{ext}")

    for base_dir in search_dirs:
        if not base_dir.is_dir():
            continue
        base_resolved = base_dir.resolve()
        for rel_name in candidates:
            target = (base_resolved / rel_name).resolve()
            # 確保不會跨越指定證據目錄邊界
            try:
                target.relative_to(base_resolved)
            except ValueError:
                continue
            if target.is_file() and target.suffix.lower() in (".txt", ".pdf", ".md"):
                return target
    return None


def inspect_sources_and_evidence(
    pkg: dict[str, Any],
    root_dir: str | Path,
    slug: str,
    evidence_dir: str | Path | None = None,
    pkg_rel_file: str | None = None,
) -> dict[str, Any]:
    """
    檢查 package 中所有 sources 的證據分類與本機原始證據可用性。
    回傳：
    - checks: 逐筆來源的驗證結果（含 file, jsonPointer, sha256, status）
    - publicSourceRecords: 可寫入公開報告/證書的去識別化紀錄（不含敏感原文）
    - internalExcerpts: 僅供本機 Gemini 非互動審查使用的摘錄字典
    - missingRequiredSources: 缺少必要原始證據的 source IDs
    - evidenceHash: 綁定所有來源定義與本機證據檔案雜湊的複合 SHA-256
    """
    root = Path(root_dir)
    rel_file = pkg_rel_file or f"research/{slug}/research-package.json"
    search_dirs: list[Path] = []
    if evidence_dir is not None:
        search_dirs.append(Path(evidence_dir))
    default_sources_dir = root / "research" / slug / "sources"
    if default_sources_dir.is_dir():
        search_dirs.append(default_sources_dir)

    sources = pkg.get("sources") if isinstance(pkg.get("sources"), list) else []
    checks: list[dict[str, Any]] = []
    public_records: list[dict[str, Any]] = []
    internal_excerpts: dict[str, dict[str, Any]] = {}
    missing_required_sources: list[str] = []
    evidence_hash_entries: list[list[str]] = []

    category_counts: dict[str, int] = {
        "official": 0,
        "third-party/broker": 0,
        "third-party/fact": 0,
        "market_consensus": 0,
        "research_inference": 0,
    }

    for idx, src in enumerate(sources):
        if not isinstance(src, dict):
            continue
        src_id = str(src.get("id") or f"index-{idx}")
        ev_class = str(src.get("evidenceClass") or "unknown")
        detailed_cat = classify_source_category(src)
        if detailed_cat in category_counts:
            category_counts[detailed_cat] += 1
        restricted = is_restricted_source(src, detailed_cat)
        pointer = make_json_pointer("sources", idx)
        node_hash = sha256_canonical(src)

        matched_file = _find_evidence_file_for_source(src, search_dirs)
        has_url = bool(isinstance(src.get("url"), str) and src.get("url").strip())

        if ev_class == "research_inference":
            status = "PASS"
            message = f"來源 {src_id} 為研究推論模型（research_inference），無須外部原始檔。"
            file_hash = node_hash
            text_hash = node_hash
            char_count = 0
            file_type = "model"
        elif matched_file is not None:
            raw_bytes = matched_file.read_bytes()
            file_hash = sha256_bytes(raw_bytes)
            file_type = matched_file.suffix.lower().lstrip(".")
            try:
                if matched_file.suffix.lower() == ".pdf":
                    extracted_text = extract_pdf_text(matched_file)
                else:
                    extracted_text = raw_bytes.decode("utf-8", errors="replace").strip()
                text_hash = sha256_text(extracted_text)
                char_count = len(extracted_text)
                if char_count > 0:
                    status = "PASS"
                    message = (
                        f"來源 {src_id} ({detailed_cat}) 已由本機 {file_type.upper()} 原始檔核對"
                        f"（{char_count} 字，SHA-256={file_hash[:12]}…）。"
                    )
                    internal_excerpts[src_id] = {
                        "sourceId": src_id,
                        "evidenceClass": ev_class,
                        "detailedCategory": detailed_cat,
                        "restricted": restricted,
                        "fileSha256": file_hash,
                        "textSha256": text_hash,
                        "excerpt": extracted_text[:4000],
                    }
                else:
                    status = "NOT_VERIFIED"
                    message = f"來源 {src_id} ({detailed_cat}) 的本機證據檔內容為空，標記為 NOT_VERIFIED。"
                    missing_required_sources.append(src_id)
            except Exception as exc:
                status = "NOT_VERIFIED"
                text_hash = ""
                char_count = 0
                message = f"來源 {src_id} ({detailed_cat}) 讀取本機證據檔失敗（{exc}），標記為 NOT_VERIFIED。"
                missing_required_sources.append(src_id)
        else:
            file_hash = ""
            text_hash = ""
            char_count = 0
            file_type = "missing"
            # 若無本機證據檔：
            # 1) 券商報告（third-party/broker）或無公開 URL 的來源，或呼叫端明確指定了 evidence_dir 時，屬缺少必要原始證據
            if detailed_cat == "third-party/broker" or not has_url or evidence_dir is not None:
                status = "NOT_VERIFIED"
                missing_required_sources.append(src_id)
                message = (
                    f"來源 {src_id} ({detailed_cat}) 未在本機提供原始證據檔（txt/pdf），"
                    "且不可複製受限券商原檔至公開 repo，標記為 NOT_VERIFIED。"
                )
            else:
                status = "NOT_VERIFIED"
                message = (
                    f"來源 {src_id} ({detailed_cat}) 僅登記公開 URL，未提供本機離線證據檔（txt/pdf），"
                    "原始內文核對標記為 NOT_VERIFIED。"
                )

        evidence_hash_entries.append([src_id, ev_class, detailed_cat, node_hash, file_hash, status])

        checks.append(
            {
                "id": f"source.evidence.{src_id}",
                "category": "source_evidence",
                "file": rel_file,
                "jsonPointer": pointer,
                "sha256": file_hash or node_hash,
                "status": status,
                "evidenceClass": ev_class,
                "detailedCategory": detailed_cat,
                "expected": "verified_local_evidence" if ev_class != "research_inference" else "research_inference",
                "actual": file_type if ev_class != "research_inference" else "research_inference",
                "message": message,
            }
        )

        public_records.append(
            {
                "sourceId": src_id,
                "jsonPointer": pointer,
                "evidenceClass": ev_class,
                "detailedCategory": detailed_cat,
                "restricted": restricted,
                "hasUrl": has_url,
                "hasLocalEvidenceFile": matched_file is not None,
                "fileType": file_type,
                "nodeSha256": node_hash,
                "fileSha256": file_hash or None,
                "textSha256": text_hash or None,
                "charCount": char_count,
                "status": status,
            }
        )

    return {
        "checks": checks,
        "publicSourceRecords": public_records,
        "internalExcerpts": internal_excerpts,
        "missingRequiredSources": missing_required_sources,
        "categoryCounts": category_counts,
        "evidenceHash": sha256_canonical(evidence_hash_entries),
    }
