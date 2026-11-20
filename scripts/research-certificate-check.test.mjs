import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import {
  collectAffectedResearchSlugs,
  verifyChangedResearchCertificates,
} from "./research-certificate-check.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "research-cert-scope-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const slug of ["alpha-1111", "beta-2222"]) {
    const dir = path.join(root, "research", slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "research-package.json"), "{}\n", "utf8");
  }
  return root;
}

test("certificate scope maps changed package/report files and ignores unregistered templates", async (t) => {
  const root = await fixture(t);
  assert.deepEqual(
    collectAffectedResearchSlugs([
      "research/alpha-1111/research-package.json",
      "research/alpha-1111/sources/source.txt",
      "public/research/reports/alpha-1111.html",
      "public/research/reports/alpha-1111-template.html",
      "app/research/page.tsx",
    ], root),
    ["alpha-1111"],
  );
});

test("changed report certificates are verified once per slug in sorted order", async (t) => {
  const root = await fixture(t);
  const calls = [];
  const result = await verifyChangedResearchCertificates({
    root,
    files: [
      "research/beta-2222/manifest.json",
      "research/alpha-1111/research-package.json",
      "research/beta-2222/verification-certificate.json",
    ],
    env: { RESEARCH_VERIFICATION_PUBLIC_KEY: "public-only" },
    verify: async (args) => {
      calls.push(args.slug);
      return {
        ok: true,
        certificate: { payload: { status: "PASS" } },
        summary: { keyId: `key-${args.slug}` },
      };
    },
  });
  assert.deepEqual(calls, ["alpha-1111", "beta-2222"]);
  assert.deepEqual(result.map((item) => item.status), ["PASS", "PASS"]);
});

test("certificate scope fails closed if any changed package certificate fails", async (t) => {
  const root = await fixture(t);
  await assert.rejects(
    verifyChangedResearchCertificates({
      root,
      files: ["research/alpha-1111/research-package.json", "research/beta-2222/manifest.json"],
      verify: async ({ slug }) => {
        if (slug === "alpha-1111") {
          return { ok: true, certificate: { payload: { status: "PASS" } } };
        }
        throw new Error("bad signature");
      },
    }),
    /bad signature/,
  );
});

test("a reported successful verifier must still return a passing signed certificate", async (t) => {
  const root = await fixture(t);
  await assert.rejects(
    verifyChangedResearchCertificates({
      root,
      files: ["research/alpha-1111/research-package.json"],
      verify: async () => ({ ok: true, certificate: { payload: { status: "BLOCKED" } } }),
    }),
    /did not pass/,
  );
});
