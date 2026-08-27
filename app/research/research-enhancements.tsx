"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type RevenuePoint = { label: string; month: number; revenue: number; mom: string; yoy: string };

export default function ResearchEnhancements() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/research/") || pathname.includes("/reports/")) return;

    const embedded = document.querySelector('iframe[src*="/research/reports/"]')?.closest("section");
    if (embedded?.parentNode) embedded.parentNode.removeChild(embedded);

    const title = Array.from(document.querySelectorAll<HTMLHeadingElement>("h2.sectionTitle"))
      .find((node) => node.textContent?.trim() === "月營收");
    const scope = title?.parentElement;
    const table = scope?.querySelector("table");
    if (!scope || !table || scope.querySelector(".revenueChartPanel")) return;

    const points: RevenuePoint[] = Array.from(table.querySelectorAll<HTMLTableRowElement>("tbody tr"))
      .map((row) => {
        const cells = row.querySelectorAll<HTMLTableCellElement>("td");
        const label = cells[0]?.textContent?.trim() ?? "";
        const revenue = Number(cells[1]?.textContent?.replace(/,/g, "").trim());
        const month = Number(label.split("/")[1]);
        return {
          label,
          month,
          revenue,
          mom: cells[2]?.textContent?.trim() ?? "—",
          yoy: cells[3]?.textContent?.trim() ?? "—",
        };
      })
      .filter((point) => Number.isFinite(point.revenue) && Number.isFinite(point.month));

    if (points.length < 2) return;

    const maxRevenue = Math.max(...points.map((point) => point.revenue), 1);
    const h1Revenue = points.filter((point) => point.month <= 6)
      .reduce((sum, point) => sum + point.revenue, 0);
    const latest = points[points.length - 1];

    const panel = document.createElement("div");
    panel.className = "revenueChartPanel";
    panel.innerHTML = `
      <div class="revenueChartHeader">
        <div>
          <div class="revenueChartEyebrow">2026 MONTHLY REVENUE</div>
          <div class="revenueChartTitle">月營收趨勢</div>
        </div>
        <div class="revenueChartStats">
          <span><b>${(h1Revenue / 100).toFixed(2)} 億</b><small>1–6月累計</small></span>
          <span><b>${(latest.revenue / 100).toFixed(2)} 億</b><small>${latest.label} · YoY ${latest.yoy}</small></span>
        </div>
      </div>
      <div class="revenueChartScroll">
        <div class="revenueChart" role="img" aria-label="2026 年月營收柱狀圖"></div>
      </div>`;

    const chart = panel.querySelector<HTMLDivElement>(".revenueChart");
    if (!chart) return;

    points.forEach((point, index) => {
      const column = document.createElement("div");
      column.className = "revenueBarColumn";
      const value = document.createElement("div");
      value.className = "revenueBarValue";
      value.textContent = `${(point.revenue / 100).toFixed(2)}億`;
      const track = document.createElement("div");
      track.className = "revenueBarTrack";
      const bar = document.createElement("div");
      bar.className = `revenueBar${index === points.length - 1 ? " latest" : ""}`;
      bar.style.height = `${Math.max(8, (point.revenue / maxRevenue) * 100)}%`;
      bar.title = `${point.label}：${point.revenue.toFixed(1)} 百萬，MoM ${point.mom}，YoY ${point.yoy}`;
      const month = document.createElement("div");
      month.className = "revenueBarMonth";
      month.textContent = `${point.month}月`;
      track.appendChild(bar);
      column.appendChild(value);
      column.appendChild(track);
      column.appendChild(month);
      chart.appendChild(column);
    });

    scope.insertBefore(panel, table);
    return () => {
      if (panel.parentNode) panel.parentNode.removeChild(panel);
    };
  }, [pathname]);

  return null;
}
