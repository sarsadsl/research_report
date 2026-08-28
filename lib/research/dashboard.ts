import { cagr, findForecast, overallSignal } from "./calculations";
import type { Forecast, ResearchDetail } from "./types";

export function buildResearchDashboard(data: ResearchDetail) {
  const config = data.dashboard;
  const actuals = [...data.actuals].sort((a,b) => b.period.localeCompare(a.period));
  const monthlyRevenue = [...data.monthlyRevenue].sort((a,b) => a.year-b.year || a.month-b.month);
  const forecasts = Object.fromEntries(config.headlineForecastYears.map((year) => [year, findForecast(data.forecasts, year, config.forecastScenario)]));
  const focus = config.monthlyRevenue;
  const cumulativeRevenue = monthlyRevenue
    .filter((row) => row.year === focus.focusYear && row.month <= focus.cumulativeThroughMonth)
    .reduce((sum,row) => sum + row.revenue, 0);
  const cagrCards = config.cagrCards.map((card) => {
    const forecast = findForecast(data.forecasts, card.targetYear, config.forecastScenario);
    const value = forecast?.[card.field] as number|null|undefined;
    return { ...card, value: value == null ? null : cagr(card.baseValue, value, card.years) };
  });
  return {
    config,
    latestActual: actuals[0],
    forecasts: forecasts as Record<number, Forecast|undefined>,
    forecastRangeLabel: `${Math.min(...config.headlineForecastYears)}F / ${Math.max(...config.headlineForecastYears)}F 情境`,
    overallSignal: overallSignal(data.signals),
    monthlyRevenue,
    latestMonthlyRevenue: monthlyRevenue.at(-1),
    maxMonthlyRevenue: Math.max(1, ...monthlyRevenue.map((row) => row.revenue)),
    cumulativeRevenue,
    cumulativeLabel: `${focus.focusYear}/01–${String(focus.cumulativeThroughMonth).padStart(2,"0")} 累計`,
    cagrCards,
  };
}
