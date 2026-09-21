# Full Research — Institutional Report Override

## Product context

The Full Research reader is a 14-chapter institutional equity research document. It prioritizes comparison, evidence provenance, and decision logic over dashboard-like summaries. The presentation is 95% sell-side research paper and 5% analyst working notes.

## Visual direction

- Warm paper canvas: `#F4F0E7`, report sheet: `#FAF8F2`.
- Ink: `#172536`; primary navy: `#244D70`; muted blue: `#6E96B5`.
- Research green: `#6C9475`; marker yellow: `#E7C752`; risk red: `#B9675F`.
- Border: `rgba(40,55,65,.16)`; muted text: `#77736B`.
- Corners stay between 0–4px. Only the report sheet receives a subtle shadow.
- No gradients, glass effects, large rounded cards, dashboard badges, or decorative slogans.

## Typography and information architecture

- Chinese headings use `Noto Serif TC`; body uses `Noto Sans TC` with local fallbacks.
- Financial values use tabular numerals and a serif display face for major figures.
- Every chapter shares one page header, editorial chapter number, evidence rail, and footer.
- Page 1 leads with company identity and the current investment signal before metrics.
- Actual, estimate, consensus, and inference always use explicit text labels; color is secondary.
- Tables use thin rules, restrained headers, and horizontal scrolling when required.

## Annotation policy

Annotations are limited to one evidence-bearing note per page. They may explain causality, identify an anomaly, ask a concrete validation question, or distinguish fact from estimate/inference. Decorative slogans are prohibited. Chapter 14 has no handwritten annotation.

## Responsive behavior

- Desktop uses a paper-page reader with a slim numeric chapter rail.
- Tablet fits the paper width without adding a dashboard shell.
- Mobile reflows the active chapter into a single-column reading document instead of shrinking an A4 sheet.
- Touch targets are at least 44px, tables scroll horizontally, and keyboard chapter navigation remains available.
- Motion is limited to subtle 150–250ms state changes and is disabled by `prefers-reduced-motion`.
