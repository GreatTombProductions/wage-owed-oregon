import { estimate, REGION_LABELS } from './calculator.mjs';

const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const FIELD_LABELS = {
  workweekStart: 'First day of employer workweek', payBasis: 'Pay situation', region: 'Wage region',
  actualHours: 'Hours figure per week', weeks: 'Identical weeks',
  unpaidMealMinutes: 'Unpaid interrupted meal minutes per week (whole period)',
  unpaidRestMinutes: 'Unpaid rest minutes per week', breakInclusion: 'Break minutes included in hours?',
  cashPaid: 'Gross employer wages per week (not take-home, excludes tips)', tips: 'Tips per week',
  promisedRate: 'Promised hourly rate (blank uses minimum)', daysLate: 'Days final wages late (due date not determined)'
};
const CHOICE_LABELS = {
  payBasis: { unknown: 'Unsure', 'simple-hourly': 'Hourly, non-exempt, standard overtime, one rate, no bonuses', other: 'Other / separate review needed' },
  region: REGION_LABELS,
  breakInclusion: { unknown: 'Unsure / only some included', included: 'Already included; not added', excluded: 'Not included; add once' }
};

function readInputs() {
  const input = Object.fromEntries(Object.keys(FIELD_LABELS).map(id => [id, document.getElementById(id).value]));
  input.includePenalty = document.getElementById('includePenalty').checked;
  return input;
}

function line(label, value) {
  const row = document.createElement('div');
  row.className = 'line';
  for (const text of [label, value]) {
    const span = document.createElement('span');
    span.textContent = text;
    row.append(span);
  }
  return row;
}

function calculate() {
  const result = estimate(readInputs());
  const totalBox = document.getElementById('resultTotal');
  totalBox.dataset.status = result.status;
  totalBox.classList.toggle('clean', result.status === 'estimated' && result.shortfall <= 0.005);
  const breakdown = document.getElementById('breakdown');
  breakdown.replaceChildren();
  document.getElementById('pills').replaceChildren();
  if (result.status !== 'estimated') {
    document.getElementById('shortfall').textContent = 'Unavailable';
    document.getElementById('resultNote').textContent = result.reason;
    return;
  }
  document.getElementById('shortfall').textContent = money(result.shortfall);
  document.getElementById('resultNote').textContent = result.shortfall > 0
    ? 'Estimated wage difference only. Conditional penalties are separate; this is not a determination of what you can recover.'
    : 'No wage difference found under these assumptions. This does not establish that all pay or break rules were followed.';
  breakdown.append(
    line('Work period', `${result.workweekStart} through ${result.workweekEnd}`),
    line('Rate period', `${result.period.start} through ${result.period.end}`),
    line('Region minimum wage', `${REGION_LABELS[result.region]}: ${money(result.minimumRate)}/hr`),
    line('Rate used', `${money(result.regularRate)}/hr`),
    line('Hours counted per week', `${result.totalHours.toFixed(2)} (${result.regularHours.toFixed(2)} regular, ${result.overtimeHours.toFixed(2)} overtime)`),
    line('Break hours added once per week', result.addedBreakHours.toFixed(2)),
    line('Estimated wages due under assumptions', money(result.dueTotal)),
    line('Gross employer wages paid', money(result.paidTotal)),
    line('Tips (never credited against wages)', money(result.tipsTotal)),
    line('Estimated wage shortfall', money(result.shortfall))
  );
  if (result.penaltyFormula !== null) {
    breakdown.append(line('Illustrative penalty formula BEFORE caps/exceptions — NOT added', money(result.penaltyFormula)));
  }
}

function downloadNotes() {
  const input = readInputs();
  const result = estimate(input);
  const lines = [
    'Wage Owed Oregon — personal preparation note',
    'NOT a claim form. Nothing submitted, received, accepted or recovered.',
    'Rules checked 2026-09-30; supported rate periods July 2025–June 2027.',
    'These inputs are your account, not independently verified facts.', '', 'INPUTS'
  ];
  for (const [id, label] of Object.entries(FIELD_LABELS)) {
    const value = CHOICE_LABELS[id] ? CHOICE_LABELS[id][input[id]] : input[id];
    lines.push(`${label}: ${value || '(not supplied)'}`);
  }
  lines.push(`Illustrative penalty requested: ${input.includePenalty ? 'Yes' : 'No'}`, '', 'RESULT');
  if (result.status !== 'estimated') {
    lines.push(`Estimate unavailable: ${result.reason}`);
  } else {
    lines.push(`Work period: ${result.workweekStart} through ${result.workweekEnd}`,
      `Rate period: ${result.period.start} through ${result.period.end}`,
      `Rate used: ${money(result.regularRate)}/hour`,
      `Hours counted per week: ${result.totalHours.toFixed(2)}; overtime: ${result.overtimeHours.toFixed(2)}`,
      `Break hours added once: ${result.addedBreakHours.toFixed(2)}`,
      `Estimated wages due under assumptions: ${money(result.dueTotal)}`,
      `Gross wages paid: ${money(result.paidTotal)}; tips excluded: ${money(result.tipsTotal)}`,
      `Estimated wage shortfall (wages only): ${money(result.shortfall)}`);
    if (result.penaltyFormula !== null) lines.push(`Illustrative penalty BEFORE caps/exceptions: ${money(result.penaltyFormula)} — NOT added to wages; entitlement unestablished.`);
  }
  lines.push('', 'LIMITS AND NEXT STEP',
    'Hourly non-exempt work; standard weekly overtime; one rate; no bonuses or other adjustments. Special cases need review.',
    'A zero difference is not a clean bill of health. Unsupported coverage is not no entitlement.',
    'The note is not independently verified and is not known to be accepted by the complaint portal.',
    'Keep paystubs, schedules, time records and messages. You choose whether to seek advice or file.',
    'BOLI official claim instructions: https://www.oregon.gov/boli/workers/Pages/wageclaim.aspx',
    'BOLI questions (checked 2026-09-30): boli_help@boli.oregon.gov; 971-245-3844.',
    'BOLI rates: https://www.oregon.gov/boli/workers/Pages/minimum-wage-schedule.aspx',
    'BOLI overtime: https://www.oregon.gov/boli/employers/Pages/overtime.aspx',
    'BOLI breaks: https://www.oregon.gov/boli/workers/Pages/meals-and-breaks.aspx',
    'BOLI paychecks: https://www.oregon.gov/boli/workers/Pages/paychecks.aspx',
    'Oregon Law Help: https://oregonlawhelp.org/topics/work-employment/your-rights-under-wage-and-hour-laws-oregon',
    'No continuing monitoring, filing or legal advice is provided.');
  const url = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'oregon-wage-notes.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.getElementById('calculate').addEventListener('click', calculate);
document.getElementById('saveNotes').addEventListener('click', downloadNotes);
for (const el of document.querySelectorAll('input, select')) el.addEventListener('input', calculate);
calculate();
