# Research Report repository

- Follow the [Research Workflow](research_system/RESEARCH_WORKFLOW.md) for every new or updated Full Report. Work on a dedicated branch from current `origin/main` and preserve unrelated changes.
- Maintain the canonical package, official evidence, exact EPS inputs, and forecast assumptions before release. Resolve P0 and P1 findings. Disclose P2 findings at a verified report location and retain P3 findings in the audit record.
- Use `npm run research:release -- <slug>` for local review and QC. With publishing authorization, run `npm run research:release -- <slug> --publish` to use the signed GitHub and Cloudflare release process.
- Keep original restricted sources, private links, model transcripts, signing keys, and deployment credentials out of Git and model inputs. Store the key outside the repository.
- Preserve existing report and EPS regression checks. D1 and Worker deployment require CI and a valid Ed25519 certificate for the exact report bytes.
