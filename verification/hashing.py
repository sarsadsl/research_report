# -*- coding: utf-8 -*-
"""獨立研究驗證系統的雜湊與標準化 JSON 工具。"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from typing import Any

VERIFICATION_POLICY_VERSION = "1.0.0"

# 驗證政策規格（任何規則、容差或阻擋條件變更皆會改變 policyHash，使舊證書失效）
POLICY_SPEC: dict[str, Any] = {
    "policyVersion": VERIFICATION_POLICY_VERSION,
    "jsonSchemaDraft": "https://json-schema.org/draft/2020-12/schema",
    "defaultGeminiModel": "gemini-4-argon-high",
    "tolerances": {
        "marginPctPoints": 0.15,
        "momYoyPctPoints": 0.15,
        "epsCurrencyUnits": 0.02,
        "cagrPctPoints": 0.15,
        "valuationCurrencyUnits": 0.15,
        "pretaxBridgeRelative": 0.001,
        "pretaxBridgeAbsolute": 0.5,
    },
    "rules": {
        "epsRequiresNetIncomeAndWeightedShares": True,
        "missingInputsStatus": "NOT_VERIFIED",
        "noGuessingOrZeroFill": True,
        "p0Blocks": True,
        "p1Blocks": True,
        "p2RequiresLocatableReportDisclosure": True,
        "p3MaxReReviews": 1,
        "missingRequiredSourceBlocks": True,
        "geminiFailureBlocksWithoutEligibleFallback": True,
        "agyPrimaryCodexTransportFallbackOnly": True,
        "fallbackRequiresNoFindingsOrPartialResponse": True,
    },
}

VERIFIER_CODE_FILES: tuple[str, ...] = (
    "verification/__init__.py",
    "verification/hashing.py",
    "verification/evidence.py",
    "verification/locators.py",
    "verification/recompute.py",
    "verification/gemini_review.py",
    "verification/auto_review.py",
    "verification/codex_review.py",
    "verification/validator.py",
    "verification/cli.py",
    "verification/__main__.py",
    "requirements-verification.txt",
    "research_system/schemas/research-manifest-v1.schema.json",
    "research_system/schemas/research-package-v1.schema.json",
    "scripts/earnings-quality.mjs",
    "scripts/research-lib.mjs",
    "scripts/research-certificate.mjs",
    "scripts/research-certificate-check.mjs",
    "scripts/research-import-lib.mjs",
    "scripts/research-import.mjs",
    "scripts/research-publish-lib.mjs",
    "scripts/research-publish.mjs",
    "scripts/report-qc.mjs",
    "scripts/ci-scope.mjs",
    "package.json",
    "package-lock.json",
    ".github/workflows/research-quality-pr.yml",
    ".github/workflows/deploy-cloudflare.yml",
)


def _normalize_number(value: float) -> int | float:
    """將整數值的 float 轉為 int，對齊 JavaScript JSON.stringify 行為。"""
    if math.isfinite(value) and value.is_integer():
        return int(value)
    return value


def canonical_json(value: Any) -> str:
    """產生與 scripts/research-lib.mjs canonicalJson 完全一致的標準化 JSON 字串。"""
    if value is None or isinstance(value, (bool, str, int)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, float):
        return json.dumps(_normalize_number(value), ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(canonical_json(item) for item in value) + "]"
    if isinstance(value, dict):
        sorted_keys = sorted(value.keys())
        pairs = [
            f"{json.dumps(str(key), ensure_ascii=False, separators=(',', ':'))}:{canonical_json(value[key])}"
            for key in sorted_keys
            if value[key] is not None or key in value
        ]
        return "{" + ",".join(pairs) + "}"
    raise TypeError(f"不支援的標準化 JSON 型別: {type(value)!r}")


def sha256_bytes(data: bytes) -> str:
    """計算原始位元組的 SHA-256 十六進位雜湊值。"""
    return hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    """計算 UTF-8 字串的 SHA-256 十六進位雜湊值。"""
    return sha256_bytes(text.encode("utf-8"))


def sha256_canonical(value: Any) -> str:
    """計算資料結構經標準化 JSON 序列化後的 SHA-256 雜湊值。"""
    if isinstance(value, str):
        return sha256_text(value)
    return sha256_text(canonical_json(value))


def sha256_file(path: str | Path) -> str:
    """計算檔案原始位元組的 SHA-256 雜湊值。"""
    return sha256_bytes(Path(path).read_bytes())


def compute_policy_hash() -> str:
    """計算驗證政策規格的 SHA-256 雜湊值。"""
    return sha256_canonical(POLICY_SPEC)


def compute_verifier_code_hash(root_dir: str | Path) -> str:
    """計算目前實際執行之驗證器、發布閘門與政策檔案的複合 SHA-256。

    `root_dir` 保留相容既有呼叫端；雜湊來源固定取自此 Python 模組實際載入的專案，
    避免驗證外部測試 fixture 時把 fixture 目錄誤當成執行程式碼來源。任何列出的執行檔
    缺少時直接失敗，不能以略過缺檔的雜湊簽發或驗證憑證。
    """
    del root_dir
    root = Path(__file__).resolve().parent.parent
    entries: list[list[str]] = []
    for rel_path in sorted(VERIFIER_CODE_FILES):
        full_path = root / rel_path
        if not full_path.is_file():
            raise FileNotFoundError(f"Required verifier code file is missing: {rel_path}")
        normalized_bytes = full_path.read_bytes().replace(b"\r\n", b"\n")
        entries.append([rel_path, sha256_bytes(normalized_bytes)])
    return sha256_canonical(entries)


def encode_json_pointer_token(token: str | int) -> str:
    """依 RFC 6901 編碼單一 JSON Pointer token。"""
    text = str(token)
    return text.replace("~", "~0").replace("/", "~1")


def make_json_pointer(*tokens: str | int) -> str:
    """依 RFC 6901 建立 JSON Pointer 字串（如 '/actuals/0/eps'）。"""
    if not tokens:
        return ""
    return "/" + "/".join(encode_json_pointer_token(t) for t in tokens)


def resolve_json_pointer(document: Any, pointer: str) -> tuple[bool, Any]:
    """解析 RFC 6901 JSON Pointer，回傳 (是否成功定位, 對應節點值)。"""
    if pointer in ("", "#"):
        return True, document
    cleaned = pointer
    if "#" in cleaned:
        cleaned = cleaned.split("#", 1)[1]
    if not cleaned:
        return True, document
    if not cleaned.startswith("/"):
        return False, None
    current = document
    for raw_token in cleaned.lstrip("/").split("/"):
        token = raw_token.replace("~1", "/").replace("~0", "~")
        if isinstance(current, list):
            try:
                idx = int(token)
            except ValueError:
                return False, None
            if idx < 0 or idx >= len(current):
                return False, None
            current = current[idx]
        elif isinstance(current, dict):
            if token not in current:
                return False, None
            current = current[token]
        else:
            return False, None
    return True, current
