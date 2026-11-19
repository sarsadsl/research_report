const SCALE_FACTORS = {
  unit: 1,
  thousand: 1_000,
  million: 1_000_000,
  billion: 1_000_000_000,
};

const BASIS_INPUTS = {
  basic: {
    numeratorKind: "parentProfitForEPS",
    denominatorKind: "weightedAverageOrdinaryShares",
  },
  diluted: {
    numeratorKind: "dilutedProfitForEPS",
    denominatorKind: "weightedAverageDilutedShares",
  },
};

function roundHalfUp(value, decimals) {
  const factor = 10 ** decimals;
  const rounded = Math.sign(value) * Math.floor(Math.abs(value) * factor + 0.500000001) / factor;
  return Number(rounded.toFixed(decimals));
}

export function verifyEpsRecord(record, sources) {
  const period = record?.period ?? null;
  const id = record?.id ?? null;
  if (record?.epsCalculation == null) {
    return {
      id,
      period,
      status: typeof record?.eps === "number" ? "NOT_VERIFIED" : "NOT_APPLICABLE",
      reason: typeof record?.eps === "number" ? "EPS calculation inputs are missing" : undefined,
    };
  }

  const calculation = record.epsCalculation;
  const errors = [];
  const expected = BASIS_INPUTS[calculation.basis];
  if (!expected) errors.push("basis must be basic or diluted");
  if (typeof calculation.accountingBasis !== "string" || !calculation.accountingBasis.trim()) errors.push("accountingBasis is required");
  if (typeof record.eps !== "number" || !Number.isFinite(record.eps)) errors.push("reported EPS is missing or invalid");
  if (!Number.isInteger(calculation.roundingDecimals) || calculation.roundingDecimals < 0 || calculation.roundingDecimals > 4) {
    errors.push("roundingDecimals must be an integer from 0 to 4");
  }
  if (calculation.roundingMode !== "half-up") errors.push("roundingMode must be half-up");

  const numerator = calculation.numerator;
  const denominator = calculation.denominator;
  if (!numerator || !Number.isFinite(numerator.value)) errors.push("numerator value is missing or invalid");
  if (!denominator || !Number.isFinite(denominator.value) || denominator.value <= 0) errors.push("denominator value must be greater than zero");
  if (numerator && !Object.hasOwn(SCALE_FACTORS, numerator.scale)) errors.push("numerator scale is unsupported");
  if (denominator && !Object.hasOwn(SCALE_FACTORS, denominator.scale)) errors.push("denominator scale is unsupported");
  if (expected && numerator?.kind !== expected.numeratorKind) errors.push(`basis ${calculation.basis} requires numerator kind ${expected.numeratorKind}`);
  if (expected && denominator?.kind !== expected.denominatorKind) errors.push(`basis ${calculation.basis} requires denominator kind ${expected.denominatorKind}`);
  if (numerator && record.currency && numerator.currency !== record.currency) errors.push("numerator currency must match the actual row currency");

  for (const [label, input] of [["numerator", numerator], ["denominator", denominator]]) {
    if (!input) continue;
    if (typeof input.label !== "string" || !input.label.trim()) errors.push(`${label} label is required`);
    if (typeof input.location !== "string" || !input.location.trim()) errors.push(`${label} source location is required`);
    if (typeof input.sourceId !== "string" || !input.sourceId.trim()) errors.push(`${label} sourceId is required`);
    if (Array.isArray(sources)) {
      const source = sources.find((candidate) => candidate.id === input.sourceId);
      if (!source) errors.push(`${label} references unknown source ${input.sourceId}`);
      else if (source.evidenceClass && source.evidenceClass !== "official") errors.push(`${label} source ${input.sourceId} must be official for reported actual EPS`);
      if (!record.sourceIds?.includes(input.sourceId)) errors.push(`${label} source ${input.sourceId} must also appear in actual sourceIds`);
    }
  }

  let computedEps;
  let roundedEps;
  if (errors.length === 0) {
    const numeratorValue = numerator.value * SCALE_FACTORS[numerator.scale];
    const denominatorValue = denominator.value * SCALE_FACTORS[denominator.scale];
    computedEps = numeratorValue / denominatorValue;
    roundedEps = roundHalfUp(computedEps, calculation.roundingDecimals);
    if (!Number.isFinite(computedEps)) errors.push("computed EPS is not finite");
    else if (Math.abs(roundedEps - record.eps) > 1e-9) {
      errors.push(`computed EPS ${roundedEps} does not match reported EPS ${record.eps}`);
    }
  }

  return {
    id,
    period,
    status: errors.length ? "FAIL" : "PASS",
    ...(computedEps === undefined ? {} : { computedEps: Number(computedEps.toFixed(8)), roundedEps }),
    reportedEps: record.eps ?? null,
    errors,
  };
}

export function verifyEpsDataset({ records, sources, company }) {
  if (!Array.isArray(records)) throw new Error("EPS verification data must contain a records array");
  if (!Array.isArray(sources)) throw new Error("EPS verification data must contain a sources array");
  const checks = records.map((record) => verifyEpsRecord(record, sources))
    .filter((check) => check.status !== "NOT_APPLICABLE");
  const accountingBases = new Set(records
    .map((record) => record?.epsCalculation?.accountingBasis)
    .filter((basis) => typeof basis === "string" && basis.trim()));
  const errors = accountingBases.size > 1
    ? [`mixed accountingBasis values in one EPS dataset: ${[...accountingBases].sort().join(", ")}`]
    : [];
  if (company?.accountingBasis && accountingBases.size === 1 && !accountingBases.has(company.accountingBasis)) {
    errors.push(`record accountingBasis does not match company basis ${company.accountingBasis}`);
  }
  const counts = {
    total: checks.length,
    pass: checks.filter((check) => check.status === "PASS").length,
    notVerified: checks.filter((check) => check.status === "NOT_VERIFIED").length,
    fail: checks.filter((check) => check.status === "FAIL").length + errors.length,
  };
  return {
    status: counts.fail ? "FAIL" : counts.notVerified ? "PARTIAL" : "PASS",
    counts,
    checks,
    errors,
  };
}
