# Research Style Guide

## Visual direction

Use a professional institutional/sell-side research style:
- clear information hierarchy;
- restrained palette;
- high-density tables only where comparison requires them;
- KPI cards, charts, bridges, scenario tables, and traffic-light signals where they improve comprehension;
- generous page safety margins.

## Content priority

1. data correctness;
2. no overlap, overflow, or clipping;
3. readability;
4. visual quality;
5. fewer pages.

Page count is content-driven and is never a fixed target.

## Required chart/table metadata

Every chart and table must provide:
- title;
- unit and currency/scale where relevant;
- covered period;
- source or source group;
- estimate label when applicable.

Official, third-party factual, market consensus, and research inference content must be visually distinguishable without relying only on color.

## Dashboard

The Dashboard is a 30-second view and should normally contain:
- company/ticker/as-of date;
- thesis summary;
- overall signal;
- manifest-selected KPIs;
- recent operating trend;
- key scenarios;
- catalysts and risks;
- clear link to the Full Report.

It does not embed the Full Report.

## Full Report

The Full Report:
- uses ordered, manifest-driven sections;
- supports previous/next navigation and page navigation;
- supports Fit, 50%, 75%, 100%, and 125% zoom;
- may add pages rather than compress unreadable content;
- keeps conclusions and source labels with the material they qualify.

## Responsive behavior

- Desktop preserves the intended research-page composition.
- Mobile prioritizes readable reflow and touch targets over imitation of desktop paper dimensions.
- Horizontal scrolling is allowed only for tables/charts that cannot be meaningfully reflowed.
- No essential information may depend on hover.

## Accessibility

- Text and status indicators meet usable contrast.
- Red/yellow/green states also include text labels or symbols.
- Navigation is keyboard operable.
- Charts include an accessible label and a tabular or textual equivalent for material data.
- Focus states remain visible.

## Standalone output

Standalone HTML must:
- retain the same content and design tokens as the website Full Report;
- contain or inline every required local asset;
- make no required network request;
- open from a local file;
- exclude development/debug controls and obsolete pagination scripts.
