// Source-grounded rate periods. Last checked against BOLI: 2026-09-30.
// Amounts are dollars/hour; end dates are inclusive. Never extrapolate a rate.
export const RATE_PERIODS = [
  { start: '2025-07-01', end: '2026-06-30', standard: 15.05, portland: 16.30, nonurban: 14.05 },
  { start: '2026-07-01', end: '2027-06-30', standard: 15.55, portland: 16.80, nonurban: 14.55 }
];
export const REGION_LABELS = {
  standard: 'Standard Oregon', portland: 'Portland Metro', nonurban: 'Nonurban counties'
};

// User input is the boundary: empty/unknown is not zero, and inclusion of
// break time must be resolved before adding it. No employer history is used.
export function estimate(input) {
  const missing = reason => ({ status: 'needs-input', reason });
  const unsupported = reason => ({ status: 'unsupported', reason });
  const start = new Date(`${input.workweekStart}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.workweekStart || '') ||
      !Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== input.workweekStart) {
    return missing('Enter the first day of the employer’s workweek (a real calendar date), not the payday.');
  }
  const fields = {
    actualHours: 'hours worked', weeks: 'number of identical weeks',
    unpaidMealMinutes: 'unpaid meal-period minutes', unpaidRestMinutes: 'unpaid rest-break minutes',
    cashPaid: 'gross wages paid by the employer', tips: 'tips'
  };
  const values = {};
  for (const [key, label] of Object.entries(fields)) {
    if (input[key] === '' || input[key] == null || !Number.isFinite(Number(input[key])) || Number(input[key]) < 0) {
      return missing(`Enter ${label}; use 0 only if you know there were none.`);
    }
    values[key] = Number(input[key]);
  }
  if (!Number.isInteger(values.weeks) || values.weeks < 1) {
    return missing('Use a whole number of identical weeks, at least 1. Calculate different weeks separately.');
  }
  const end = new Date(start.getTime() + (values.weeks * 7 - 1) * 86400000);
  if (!Number.isFinite(end.getTime())) return unsupported('That work period is outside the supported dates.');
  const workweekEnd = end.toISOString().slice(0, 10);
  const period = RATE_PERIODS.find(p => input.workweekStart >= p.start && workweekEnd <= p.end);
  if (!period) {
    return unsupported('These whole workweeks do not fit one verified rate period. Supported dates: July 1, 2025–June 30, 2027. Split workweeks at the July rate change require separate review; do not substitute a nearby date. Your inputs remain here.');
  }
  if (!Object.hasOwn(REGION_LABELS, input.region)) return missing('Choose the Oregon wage region where you worked.');
  if (input.payBasis !== 'simple-hourly') {
    return unsupported('This calculator supports hourly, non-exempt work with the standard 40-hour overtime rule and one rate, without bonuses or other regular-rate adjustments. If you are unsure, keep your records and ask BOLI; this limit does not mean you have no claim.');
  }
  const breakHours = (values.unpaidMealMinutes + values.unpaidRestMinutes) / 60;
  if (breakHours > 0 && !['included', 'excluded'].includes(input.breakInclusion)) {
    return missing('Are ALL of the meal and rest minutes below already included in your hours figure? If only some are included, correct the figures before calculating.');
  }
  if (input.breakInclusion === 'included' && breakHours > values.actualHours) {
    return missing('The break minutes exceed the hours figure that you said includes them. Correct either the hours or the inclusion answer.');
  }
  const addedBreakHours = input.breakInclusion === 'excluded' ? breakHours : 0;
  const totalHours = values.actualHours + addedBreakHours;
  if (totalHours > 168) return missing('There are 168 hours in a week. Check the hours and break minutes; do not enter a multi-week total here.');
  let promisedRate = 0;
  if (input.promisedRate !== '' && input.promisedRate != null) {
    promisedRate = Number(input.promisedRate);
    if (!Number.isFinite(promisedRate) || promisedRate < 0) return missing('Enter a nonnegative promised hourly rate, or leave it blank to use minimum wage.');
  }
  const minimumRate = period[input.region];
  const regularRate = Math.max(minimumRate, promisedRate);
  const regularHours = Math.min(totalHours, 40);
  const overtimeHours = Math.max(0, totalHours - 40);
  const dueTotal = (regularHours * regularRate + overtimeHours * regularRate * 1.5) * values.weeks;
  const paidTotal = values.cashPaid * values.weeks;
  const tipsTotal = values.tips * values.weeks;
  const shortfall = Math.max(0, dueTotal - paidTotal);
  let penaltyFormula = null;
  if (input.includePenalty) {
    const days = Number(input.daysLate);
    if (input.daysLate === '' || input.daysLate == null || !Number.isFinite(days) || days < 0 || !Number.isInteger(days)) {
      return missing('Enter a whole number of days final wages were late, or turn off the illustrative penalty formula. The due date is not determined by this tool.');
    }
    penaltyFormula = Math.min(30, days) * 8 * regularRate;
  }
  if (![dueTotal, paidTotal, tipsTotal, shortfall, penaltyFormula ?? 0].every(Number.isFinite)) {
    return missing('Those amounts are too large to calculate. Check the pay and rate entries.');
  }
  return {
    status: 'estimated', workweekStart: input.workweekStart, workweekEnd, period,
    region: input.region, weeks: values.weeks, minimumRate, regularRate,
    totalHours, addedBreakHours, regularHours, overtimeHours,
    dueTotal, paidTotal, tipsTotal, shortfall, penaltyFormula
  };
}
