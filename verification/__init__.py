# -*- coding: utf-8 -*-
"""獨立研究驗證系統套件（Independent Research Verification Package）。"""

from __future__ import annotations

from .cli import main, run_cli, run_map_source_command, run_review_command, run_validate_command
from .evidence import (
    classify_source_category,
    extract_html_text,
    extract_pdf_text,
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
    run_gemini_review,
    validate_review_context,
    verify_agy_model_available,
)
from .hashing import (
    POLICY_SPEC,
    VERIFICATION_POLICY_VERSION,
    canonical_json,
    compute_policy_hash,
    compute_verifier_code_hash,
    make_json_pointer,
    resolve_json_pointer,
    sha256_bytes,
    sha256_canonical,
    sha256_file,
    sha256_text,
)
from .locators import load_source_locators, write_source_locator
from .recompute import run_financial_recompute
from .validator import validate_research_package

__all__ = [
    "DEFAULT_GEMINI_MODEL",
    "GeminiReviewError",
    "GeminiReviewResult",
    "POLICY_SPEC",
    "REVIEW_STATUS_BLOCKED",
    "REVIEW_STATUS_PASS",
    "REVIEW_STATUS_PASS_WITH_P2",
    "VERIFICATION_POLICY_VERSION",
    "canonical_json",
    "classify_source_category",
    "compute_policy_hash",
    "compute_verifier_code_hash",
    "extract_pdf_text",
    "extract_html_text",
    "inspect_sources_and_evidence",
    "is_restricted_source",
    "load_source_locators",
    "main",
    "make_json_pointer",
    "resolve_json_pointer",
    "run_cli",
    "run_map_source_command",
    "run_financial_recompute",
    "run_gemini_review",
    "run_review_command",
    "run_validate_command",
    "sha256_bytes",
    "sha256_canonical",
    "sha256_file",
    "sha256_text",
    "validate_research_package",
    "validate_review_context",
    "verify_agy_model_available",
    "write_source_locator",
]
