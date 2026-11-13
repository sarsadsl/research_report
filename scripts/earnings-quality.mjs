export const EQ01_EFFECTIVE_DATE = "2026-11-13";

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);
const ratio = (numerator, denominator) => isNumber(numerator) && isNumber(denominator) && Math.abs(denominator) > 1e-8
  ? Math.abs(numerator) / Math.abs(denominator) : null;

export function evaluateEarningsQuality(eq) {
  if (!eq) return { requiresL2: false, reasons: [] };
  const reasons = [];
  const add = (reason) => { if (!reasons.includes(reason)) reasons.push(reason); };
  const periods = [...(eq.periods ?? [])].sort((a, b) => a.period.localeCompare(b.period));
  for (const row of periods) {
    const nonOpRatio = ratio(row.nonOperatingNet, row.pretaxIncome);
    const threshold = row.periodType === "quarter" ? 0.15 : 0.10;
    if (nonOpRatio !== null && nonOpRatio >= threshold) add("NON_OPERATING_SHARE:" + row.period);
    if (isNumber(row.pretaxIncome) && Math.abs(row.pretaxIncome) < 1e-8 && isNumber(row.nonOperatingNet) && row.nonOperatingNet !== 0) {
      add("NEAR_ZERO_PRETAX:" + row.period);
    }
    if (isNumber(row.shareholdersEquity) && row.shareholdersEquity !== 0) {
      const equityImpact = row.adjustments.reduce((sum, adj) => sum + (isNumber(adj.equityImpact) ? Math.abs(adj.equityImpact) : 0), 0);
      if (equityImpact / Math.abs(row.shareholdersEquity) >= 0.05) add("EQUITY_IMPACT:" + row.period);
    }
    if (isNumber(row.reportedEps) && Math.abs(row.reportedEps) > 1e-8) {
      for (const adj of row.adjustments) {
        if (isNumber(adj.epsImpact) && Math.abs(adj.epsImpact / row.reportedEps) >= 0.1) add("EPS_IMPACT:" + row.period);
      }
    }
    if (isNumber(row.pretaxIncome) && Math.abs(row.pretaxIncome) > 1e-8) {
      for (const adj of row.adjustments) {
        if (adj.realization === "unrealized" && isNumber(adj.pretaxAmount) && Math.abs(adj.pretaxAmount / row.pretaxIncome) >= 0.05) {
          add("UNREALIZED_SHARE:" + row.period);
        }
      }
    }
  }
  for (const flag of eq.qualitativeFlags ?? []) add("QUALITATIVE:" + flag);
  for (const kind of ["quarter", "annual", "ytd"]) {
    const rows = periods.filter((p) => p.periodType === kind);
    for (let i = 1; i < rows.length; i++) {
      const previous = rows[i - 1], current = rows[i];
      if (!isNumber(previous.nonOperatingNet) || !isNumber(current.nonOperatingNet)) continue;
      const change = Math.abs(current.nonOperatingNet - previous.nonOperatingNet);
      if (Math.abs(previous.nonOperatingNet) < 1e-8 || change / Math.abs(previous.nonOperatingNet) < 0.5) continue;
      const materialToPretax = isNumber(current.pretaxIncome) && Math.abs(current.pretaxIncome) > 1e-8 && change / Math.abs(current.pretaxIncome) >= 0.05;
      const materialToRevenue = isNumber(current.revenue) && Math.abs(current.revenue) > 1e-8 && change / Math.abs(current.revenue) >= 0.01;
      if (materialToPretax || materialToRevenue) add("NON_OPERATING_VOLATILITY:" + current.period);
    }
  }
  return { requiresL2: reasons.length > 0, reasons };
}

export function validateEarningsQuality(pkg, manifest, errors) {
  const eq = pkg.earningsQuality;
  const mustReview = manifest.output.fullReport && pkg.report.status === "published" && pkg.asOfDate >= EQ01_EFFECTIVE_DATE;
  if (!eq) {
    if (mustReview) errors.push("EQ-01: published full report requires earningsQuality for asOfDate >= " + EQ01_EFFECTIVE_DATE);
    return;
  }
  const prefix = "EQ-01";
  if (["FAIL", "NOT_RUN"].includes(eq.reviewStatus) && pkg.report.status === "published") {
    errors.push(prefix + ": published report cannot use " + eq.reviewStatus + " reviewStatus");
  }
  if (["PASS", "WARN"].includes(eq.reviewStatus) && (!eq.reviewer.trim() || !eq.reviewedAt)) {
    errors.push(prefix + ": PASS/WARN requires reviewer and reviewedAt");
  }
  if (!eq.periods.length) errors.push(prefix + ": at least one reviewed period is required");
  const countAnnual = eq.periods.filter((row) => row.periodType === "annual").length;
  const countQuarter = eq.periods.filter((row) => row.periodType === "quarter").length;
  if ((countAnnual < 3 || countQuarter < 4) && !eq.coverageNote.trim()) {
    errors.push(prefix + ": incomplete 3-year/4-quarter coverage requires coverageNote");
  }
  for (const row of eq.periods) {
    const name = prefix + "." + row.period;
    const { operatingIncome, nonOperatingNet, pretaxIncome } = row;
    if ([operatingIncome, nonOperatingNet, pretaxIncome].every(isNumber)) {
      const difference = Math.abs(operatingIncome + nonOperatingNet - pretaxIncome);
      if (difference > Math.max(0.5, Math.abs(pretaxIncome) * 0.001)) {
        errors.push(name + ": operatingIncome + nonOperatingNet must reconcile to pretaxIncome");
      }
    }
    if (isNumber(row.normalizedEps) && !isNumber(row.reportedEps)) {
      errors.push(name + ": normalizedEps requires reportedEps");
    }
    if (isNumber(row.normalizedEps) && row.adjustments.every((adj) => isNumber(adj.epsImpact)) && isNumber(row.reportedEps)) {
      const expected = row.reportedEps - row.adjustments.reduce((sum, adj) => sum + adj.epsImpact, 0);
      if (Math.abs(expected - row.normalizedEps) > 0.03) {
        errors.push(name + ": normalizedEps does not reconcile with signed epsImpact adjustments");
      }
    }
    if (row.adjustments.some((adj) => !isNumber(adj.epsImpact)) && isNumber(row.normalizedEps)) {
      errors.push(name + ": cannot certify normalizedEps with unknown adjustment epsImpact");
    }
    if (row.adjustments.some((adj) => adj.realization === "unrealized" && adj.category === "FVOCI" && isNumber(adj.epsImpact) && adj.epsImpact !== 0)) {
      errors.push(name + ": FVOCI valuation cannot be counted as a current-period EPS impact without documented recycling rules");
    }
    if (row.normalizedEps === null && !row.normalizationNote.trim()) {
      errors.push(name + ": missing normalizedEps requires normalizationNote (never fill missing values with zero)");
    }
  }
  const outcome = evaluateEarningsQuality(eq);
  if (outcome.requiresL2 && eq.l2.status !== "PASS" && pkg.report.status === "published") {
    errors.push(prefix + ": L2 is required (" + outcome.reasons.join(", ") + ") but l2.status is " + eq.l2.status);
  }
  if (eq.l2.status === "PASS" && (!eq.l2.summary.trim() || !eq.l2.sourceIds.length)) {
    errors.push(prefix + ": completed L2 requires a summary and source evidence");
  }
  if (pkg.report.status === "published" && !eq.valuation.doubleCountChecked) {
    errors.push(prefix + ": valuation must explicitly check for double deductions");
  }
  if (eq.valuation.epsBasis === "normalized" && eq.periods.every((row) => !isNumber(row.normalizedEps))) {
    errors.push(prefix + ": normalized EPS valuation basis requires a verified normalizedEps period");
  }
}
