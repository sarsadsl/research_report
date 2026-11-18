# -*- coding: utf-8 -*-
"""Tests for private local source paths, hash pinning, and output redaction."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from .evidence import inspect_sources_and_evidence
from .hashing import sha256_bytes
from .locators import load_source_locators, write_source_locator


class SourceLocatorTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="source_locator_test_")
        self.root = Path(self.temp.name)
        self.slug = "acme-1234"
        self.evidence_path = (
            self.root / "research" / self.slug / "sources" / "official-filing.html"
        )
        self.evidence_path.parent.mkdir(parents=True, exist_ok=True)
        self.evidence_path.write_text(
            "<html><body><h1>Quarterly filing</h1><p>Gross margin 34.0%</p>"
            "<script>DO_NOT_EXTRACT_SECRET</script></body></html>",
            encoding="utf-8",
        )
        self.pkg = {
            "sources": [
                {
                    "id": "src-official",
                    "evidenceClass": "official",
                    "provider": "Company",
                    "title": "Quarterly filing",
                    "url": "https://example.invalid/filing",
                }
            ]
        }

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _register(self) -> dict:
        return write_source_locator(
            self.root,
            self.slug,
            "src-official",
            "research/acme-1234/sources/official-filing.html",
            access="public",
            drive_file_id="1AbCdEfGhIjKlMnOpQrStUvWxYz",
            drive_name="Official filing copy.html",
        )

    def test_locator_hashes_saved_html_and_redacts_drive_metadata(self) -> None:
        registered = self._register()
        report = inspect_sources_and_evidence(self.pkg, self.root, self.slug)

        source_check = next(c for c in report["checks"] if c["id"] == "source.evidence.src-official")
        self.assertEqual(source_check["status"], "PASS")
        self.assertIn("Gross margin 34.0%", report["internalExcerpts"]["src-official"]["excerpt"])
        self.assertNotIn("DO_NOT_EXTRACT_SECRET", report["internalExcerpts"]["src-official"]["excerpt"])
        self.assertEqual(
            report["publicSourceRecords"][0]["fileSha256"],
            sha256_bytes(self.evidence_path.read_bytes()),
        )
        self.assertNotIn("driveFileId", json.dumps(report, ensure_ascii=False))
        self.assertNotIn("Official filing copy.html", json.dumps(report, ensure_ascii=False))
        self.assertNotIn(str(self.evidence_path), json.dumps(report, ensure_ascii=False))
        self.assertEqual(registered["path"], "research/acme-1234/sources/official-filing.html")
        self.assertTrue(registered["manifestPath"].startswith(".research-verification/"))

    def test_changed_evidence_after_mapping_is_blocked(self) -> None:
        self._register()
        self.evidence_path.write_text("<html><body>changed source</body></html>", encoding="utf-8")

        report = inspect_sources_and_evidence(self.pkg, self.root, self.slug)
        source_check = next(c for c in report["checks"] if c["id"] == "source.evidence.src-official")
        self.assertEqual(source_check["status"], "BLOCKED")
        self.assertIn("locator_hash_mismatch", source_check["message"])

    def test_mapping_rejects_paths_outside_approved_evidence_directories(self) -> None:
        outside = self.root / "outside.pdf"
        outside.write_bytes(b"not an evidence path")
        with self.assertRaisesRegex(ValueError, "path_outside_allowed_evidence_directories"):
            write_source_locator(
                self.root,
                self.slug,
                "src-official",
                "outside.pdf",
                access="public",
            )

    def test_private_evidence_cannot_be_mapped_from_public_sources_directory(self) -> None:
        with self.assertRaisesRegex(
            ValueError,
            "private_evidence_must_use_restricted_or_local_only_directory",
        ):
            write_source_locator(
                self.root,
                self.slug,
                "src-official",
                "research/acme-1234/sources/official-filing.html",
                access="restricted",
            )

    def test_mapping_rejects_parent_segments_even_when_they_resolve_inside_allowed_root(self) -> None:
        restricted_file = (
            self.root / "research" / self.slug / "restricted" / "restricted-source.pdf"
        )
        restricted_file.parent.mkdir(parents=True, exist_ok=True)
        restricted_file.write_bytes(b"synthetic restricted evidence")
        with self.assertRaisesRegex(ValueError, "path_must_be_canonical_relative_path"):
            write_source_locator(
                self.root,
                self.slug,
                "src-official",
                "research/acme-1234/sources/../restricted/restricted-source.pdf",
                access="public",
            )

    def test_tampered_manifest_path_is_blocked_without_fallback(self) -> None:
        self._register()
        manifest = self.root / ".research-verification" / self.slug / "source-locations.json"
        doc = json.loads(manifest.read_text(encoding="utf-8"))
        doc["sources"]["src-official"]["path"] = "research/acme-1234/sources/../../../../outside.pdf"
        manifest.write_text(json.dumps(doc), encoding="utf-8")

        locators, _, error = load_source_locators(self.root, self.slug, {"src-official"})
        self.assertEqual(locators, {})
        self.assertEqual(error, "manifest_evidence_path_invalid")
        report = inspect_sources_and_evidence(self.pkg, self.root, self.slug)
        self.assertEqual(
            next(c for c in report["checks"] if c["id"] == "evidence.source_locator_manifest.valid")[
                "status"
            ],
            "BLOCKED",
        )


if __name__ == "__main__":
    unittest.main()
