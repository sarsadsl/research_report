import type { FinancialActual, Forecast, SignalSnapshot, SignalStatus } from "./types";

export function cagr(start: number, end: number, years: number) {
  if (start <= 0 || end <= 0 || years <= 0) return null;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

export function overallSignal(signals: SignalSnapshot[]): "green" | "yellow" | "red" {
  if (!signals.length) return "yellow";
  const score: Record<SignalStatus, number> = { red: -1, yellow: 0, green: 1 };
  const average = signals.reduce((sum, item) => sum + score[item.status], 0) / signals.length;
  if (average >= 0.5) return "green";
  if (average <= -0.35) return "red";
  return "yellow";
}

export function findForecast(forecasts: Forecast[], year: number, scenario: string) {
  return forecasts.find((item) => item.fiscalYear === year && item.scenario === scenario);
}

export function latestActual(actuals: FinancialActual[]) {
  return [...actuals].sort((a, b) => b.period.localeCompare(a.period))[0];
}

export function formatSignalLabel(status: "green" | "yellow" | "red") {
  return status === "green" ? "綠燈" : status === "red" ? "紅燈" : "黃燈";
}
