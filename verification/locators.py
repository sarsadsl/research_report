# -*- coding: utf-8 -*-
"""Local-only source locator registry for reproducible evidence verification."""

from __future__ import annotations

import json
import os
from pathlib import Path, PurePosixPath, PureWindowsPath
import re
import tempfile
from typing import Any

from .hashing import sha256_bytes, sha256_canonical


MANIFEST_VERSION = "1.0.0"
MANIFEST_NAME = "source-locations.json"
ALLOWED_ACCESS = {"public", "restricted", "internal"}
ALLOWED_EVIDENCE_SUFFIXES = {".txt", ".pdf", ".md", ".html", ".htm"}
SOURCE_ID_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+$")
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SHA256_PATTERN = re.compile(r"^[a-f0-9]{64}$")
DRIVE_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{10,200}$")
MAX_MANIFEST_BYTES = 1024 * 1024


def manifest_path(root: Path, slug: str) -> Path:
    return root / ".research-verification" / slug / MANIFEST_NAME


def _allowed_evidence_roots(root: Path, slug: str) -> tuple[Path, ...]:
    return (
        root / "research" / slug / "sources",
        root / "research" / slug / "restricted",
        root / ".research-verification" / slug / "evidence",
    )


def _under_path(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent.resolve())
        return True
    except (OSError, ValueError):
        return False


def _resolve_safe_evidence_path(root: Path, slug: str, raw_path: Any) -> Path | None:
    if not isinstance(raw_path, str) or not raw_path.strip() or "\\" in raw_path:
        return None
    posix_path = PurePosixPath(raw_path)
    if posix_path.is_absolute() or PureWindowsPath(raw_path).is_absolute():
        return None
    if posix_path.as_posix() != raw_path:
        return None
    if any(part in ("", ".", "..") for part in posix_path.parts):
        return None

    candidate = root.joinpath(*posix_path.parts)
    try:
        resolved = candidate.resolve()
        resolved.relative_to(root)
    except (OSError, RuntimeError, ValueError):
        return None
    if resolved.suffix.lower() not in ALLOWED_EVIDENCE_SUFFIXES:
        return None

    for allowed_root in _allowed_evidence_roots(root, slug):
        try:
            if allowed_root.is_symlink():
                continue
            allowed_resolved = allowed_root.resolve()
            allowed_resolved.relative_to(root)
            resolved.relative_to(allowed_resolved)
            return resolved
        except (OSError, RuntimeError, ValueError):
            continue
    return None


def load_source_locators(
    root_dir: str | Path,
    slug: str,
    known_source_ids: set[str],
) -> tuple[dict[str, dict[str, Any]], str, str | None]:
    """Load and validate the ignored local locator map without exposing its metadata."""
    root = Path(root_dir).resolve()
    if not SLUG_PATTERN.fullmatch(slug):
        return {}, sha256_canonical({}), "manifest_slug_invalid"
    path = manifest_path(root, slug)
    try:
        verification_root = (root / ".research-verification").resolve()
        verification_root.relative_to(root)
        path.resolve().relative_to(verification_root)
    except (OSError, RuntimeError, ValueError):
        return {}, sha256_canonical({}), "manifest_path_invalid"

    if path.is_symlink():
        return {}, sha256_canonical({}), "manifest_path_invalid"
    if not path.exists():
        return {}, sha256_canonical({}), None

    try:
        if path.stat().st_size > MAX_MANIFEST_BYTES:
            return {}, sha256_canonical({}), "manifest_too_large"
        raw = path.read_bytes()
        doc = json.loads(raw.decode("utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return {}, "", "manifest_unreadable"

    raw_hash = sha256_bytes(raw)
    if not isinstance(doc, dict) or set(doc) != {"schemaVersion", "slug", "sources"}:
        return {}, raw_hash, "manifest_shape_invalid"
    if doc.get("schemaVersion") != MANIFEST_VERSION or doc.get("slug") != slug:
        return {}, raw_hash, "manifest_identity_invalid"
    source_items = doc.get("sources")
    if not isinstance(source_items, dict):
        return {}, raw_hash, "manifest_sources_invalid"

    normalized: dict[str, dict[str, Any]] = {}
    for source_id, entry in source_items.items():
        if not isinstance(source_id, str) or not SOURCE_ID_PATTERN.fullmatch(source_id):
            return {}, raw_hash, "manifest_source_id_invalid"
        if source_id not in known_source_ids:
            return {}, raw_hash, "manifest_unknown_source_id"
        if not isinstance(entry, dict):
            return {}, raw_hash, "manifest_entry_invalid"
        allowed_fields = {"path", "sha256", "access", "driveFileId", "driveName"}
        if not set(entry).issubset(allowed_fields) or not {"path", "sha256", "access"}.issubset(entry):
            return {}, raw_hash, "manifest_entry_shape_invalid"
        if not isinstance(entry.get("sha256"), str) or not SHA256_PATTERN.fullmatch(entry["sha256"]):
            return {}, raw_hash, "manifest_hash_invalid"
        if entry.get("access") not in ALLOWED_ACCESS:
            return {}, raw_hash, "manifest_access_invalid"
        if "driveFileId" in entry and (
            not isinstance(entry["driveFileId"], str)
            or not DRIVE_ID_PATTERN.fullmatch(entry["driveFileId"])
        ):
            return {}, raw_hash, "manifest_drive_id_invalid"
        if "driveName" in entry and not isinstance(entry["driveName"], str):
            return {}, raw_hash, "manifest_drive_name_invalid"

        resolved = _resolve_safe_evidence_path(root, slug, entry.get("path"))
        if resolved is None:
            return {}, raw_hash, "manifest_evidence_path_invalid"
        if entry["access"] in {"restricted", "internal"} and _under_path(
            resolved, root / "research" / slug / "sources"
        ):
            return {}, raw_hash, "manifest_private_evidence_in_public_sources"
        normalized[source_id] = {
            **entry,
            "resolvedPath": resolved,
        }

    return normalized, raw_hash, None


def write_source_locator(
    root_dir: str | Path,
    slug: str,
    source_id: str,
    source_path: str | Path,
    *,
    access: str,
    drive_file_id: str | None = None,
    drive_name: str | None = None,
) -> dict[str, Any]:
    """Record one local evidence file and its Drive locator in the ignored registry."""
    root = Path(root_dir).resolve()
    if not SLUG_PATTERN.fullmatch(slug):
        raise ValueError("invalid_slug")
    if not SOURCE_ID_PATTERN.fullmatch(source_id):
        raise ValueError("invalid_source_id")
    if access not in ALLOWED_ACCESS:
        raise ValueError("invalid_access")
    if drive_file_id is not None and not DRIVE_ID_PATTERN.fullmatch(drive_file_id):
        raise ValueError("invalid_drive_id")
    if drive_name is not None and (not drive_name.strip() or len(drive_name) > 500):
        raise ValueError("invalid_drive_name")

    candidate = Path(source_path)
    raw = str(source_path)
    if candidate.is_absolute():
        raise ValueError("path_must_be_repo_relative")
    if "\\" in raw:
        raise ValueError("path_must_use_repo_relative_posix_format")
    pure_raw = PurePosixPath(raw)
    if pure_raw.as_posix() != raw or pure_raw.is_absolute() or any(
        part in ("", ".", "..") for part in pure_raw.parts
    ):
        raise ValueError("path_must_be_canonical_relative_path")
    try:
        resolved = (root / raw).resolve()
    except (OSError, RuntimeError) as exc:
        raise ValueError("path_resolution_failed") from exc

    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise ValueError("path_outside_repository") from exc
    if not resolved.is_file():
        raise ValueError("evidence_file_missing")
    if resolved.suffix.lower() not in ALLOWED_EVIDENCE_SUFFIXES:
        raise ValueError("evidence_file_type_unsupported")

    allowed = False
    for allowed_root in _allowed_evidence_roots(root, slug):
        try:
            if allowed_root.is_symlink():
                continue
            resolved.relative_to(allowed_root.resolve())
            allowed = True
            break
        except (OSError, RuntimeError, ValueError):
            continue
    if not allowed:
        raise ValueError("path_outside_allowed_evidence_directories")
    if access in {"restricted", "internal"} and _under_path(
        resolved, root / "research" / slug / "sources"
    ):
        raise ValueError("private_evidence_must_use_restricted_or_local_only_directory")

    rel_path = resolved.relative_to(root).as_posix()
    target = manifest_path(root, slug)
    try:
        verification_root = (root / ".research-verification").resolve()
        verification_root.relative_to(root)
        target.resolve().relative_to(verification_root)
    except (OSError, RuntimeError, ValueError) as exc:
        raise ValueError("manifest_path_invalid") from exc

    existing: dict[str, Any] = {"schemaVersion": MANIFEST_VERSION, "slug": slug, "sources": {}}
    if target.exists():
        try:
            if target.stat().st_size > MAX_MANIFEST_BYTES:
                raise ValueError("existing_manifest_too_large")
            loaded = json.loads(target.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ValueError("existing_manifest_unreadable") from exc
        if (
            not isinstance(loaded, dict)
            or loaded.get("schemaVersion") != MANIFEST_VERSION
            or loaded.get("slug") != slug
            or not isinstance(loaded.get("sources"), dict)
        ):
            raise ValueError("existing_manifest_invalid")
        existing = loaded

    entry: dict[str, Any] = {
        "path": rel_path,
        "sha256": sha256_bytes(resolved.read_bytes()),
        "access": access,
    }
    if drive_file_id:
        entry["driveFileId"] = drive_file_id
    if drive_name:
        entry["driveName"] = drive_name.strip()
    existing["sources"][source_id] = entry

    target.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(existing, ensure_ascii=False, indent=2) + "\n"
    fd, temp_name = tempfile.mkstemp(prefix=f".{MANIFEST_NAME}.", suffix=".tmp", dir=target.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(serialized)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, target)
    except Exception:
        Path(temp_name).unlink(missing_ok=True)
        raise

    return {
        "path": rel_path,
        "sha256": entry["sha256"],
        "access": access,
        "manifestPath": target.relative_to(root).as_posix(),
    }
