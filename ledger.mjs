// A person's day-by-day account, evaluated workweek by workweek with the
// existing single-week engine. Nothing here invents a missing fact: unknown
// stays unknown, out-of-coverage weeks are listed with a reason, and the
// account itself is never changed by evaluation.
import { estimate, RATE_PERIODS, REGION_LABELS } from './calculator.mjs';
import { SITUATIONS, PAY_BASIS } from './content.mjs';

export const FORMAT = 'wage-owed-oregon-record';
export const FORMAT_VERSION = 1;
export const ISSUE_LIMIT = 300;
export const BOLI_MINIMUM = 50;
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_KEYS = ['date', 'approxDate', 'hours', 'start', 'end', 'offMinutes', 'mealMinutes', 'restMinutes', 'approxHours', 'note'];
const PAY_KEYS = ['from', 'to', 'gross', 'note'];
const RATE_KEYS = ['from', 'rate'];
const BOOL_KEYS = new Set(['approxDate', 'approxHours', 'hireDateApprox']);

export function emptyDay(date = '') {
  return { date, approxDate: false, hours: '', start: '', end: '', offMinutes: '', mealMinutes: '', restMinutes: '', approxHours: false, note: '' };
}
export function emptyPay() { return { from: '', to: '', gross: '', note: '' }; }
export function emptyRate() { return { from: '', rate: '' }; }

export function emptyAccount() {
  return {
    payBasis: 'unknown', region: '', situations: [], workweekStartDay: 'unknown',
    breakInclusion: 'unknown', hireDate: '', hireDateApprox: false,
    rates: [], days: [], pay: [], unparsed: [], issueDraft: null
  };
}

const str = v => (v == null ? '' : String(v));
function pick(raw, keys) {
  const out = {};
  for (const k of keys) out[k] = BOOL_KEYS.has(k) || k === 'approxDate' || k === 'approxHours' ? raw?.[k] === true : str(raw?.[k]);
  return out;
}

// Coerce anything (including a saved file) into the account shape.
// Idempotent: normalizeAccount(normalizeAccount(x)) equals normalizeAccount(x).
export function normalizeAccount(raw) {
  const a = emptyAccount();
  if (!raw || typeof raw !== 'object') return a;
  a.payBasis = Object.hasOwn(PAY_BASIS, raw.payBasis) ? raw.payBasis : 'unknown';
  a.region = Object.hasOwn(REGION_LABELS, raw.region) ? raw.region : '';
  a.situations = Array.isArray(raw.situations) ? [...new Set(raw.situations.filter(s => Object.hasOwn(SITUATIONS, s)))] : [];
  a.workweekStartDay = /^[0-6]$/.test(str(raw.workweekStartDay)) ? str(raw.workweekStartDay) : 'unknown';
  a.breakInclusion = ['included', 'excluded'].includes(raw.breakInclusion) ? raw.breakInclusion : 'unknown';
  a.hireDate = str(raw.hireDate);
  a.hireDateApprox = raw.hireDateApprox === true;
  a.rates = Array.isArray(raw.rates) ? raw.rates.map(r => pick(r, RATE_KEYS)) : [];
  a.days = Array.isArray(raw.days) ? raw.days.map(d => pick(d, DAY_KEYS)) : [];
  a.pay = Array.isArray(raw.pay) ? raw.pay.map(p => pick(p, PAY_KEYS)) : [];
  a.unparsed = Array.isArray(raw.unparsed) ? raw.unparsed.map(u => ({ line: str(u?.line ?? u), reason: str(u?.reason) })) : [];
  a.issueDraft = typeof raw.issueDraft === 'string' ? raw.issueDraft.slice(0, ISSUE_LIMIT) : null;
  return a;
}

export function serializeAccount(account, savedAt = new Date().toISOString()) {
  return JSON.stringify({ format: FORMAT, version: FORMAT_VERSION, savedAt, account: normalizeAccount(account) }, null, 2) + '\n';
}

export function parseSaved(text) {
  let data;
  try { data = JSON.parse(text); } catch { return { error: 'This file is not a saved record from this page (it is not readable as one).' }; }
  if (!data || data.format !== FORMAT) return { error: 'This file is not a saved record from this page.' };
  if (data.version !== FORMAT_VERSION) return { error: `This record was saved in format version ${data.version}, which this page does not read.` };
  return { account: normalizeAccount(data.account) };
}

// ---------- dates and times ----------
export function isRealDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10);
}
export const weekday = iso => new Date(`${iso}T00:00:00Z`).getUTCDay();
export function usDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}/${y}`;
}
export function longDate(iso) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${iso}T00:00:00Z`));
}
export function twoYearsBefore(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  let candidate = `${String(y - 2).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (!isRealDate(candidate)) candidate = `${String(y - 2).padStart(4, '0')}-${String(m).padStart(2, '0')}-28`;
  return candidate;
}
export function localToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function minutesOf(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
const num = v => (v === '' || v == null ? null : Number(v));
const fmtNum = n => (Math.round(n * 100) / 100).toString();

// Hours for one row. Returns { hours } (null when not given) plus problems.
export function rowHours(day) {
  const problems = [];
  const notes = [];
  let fromTimes = null;
  const hasTimes = day.start !== '' || day.end !== '';
  if (hasTimes) {
    const s = minutesOf(day.start), e = minutesOf(day.end);
    if (s === null || e === null) {
      problems.push('give both a start and an end time (for example 09:00 and 17:30), or clear them and enter hours');
    } else {
      let span = e - s;
      if (span <= 0) { span += 24 * 60; notes.push('ends after midnight; counted on the start date'); }
      const off = num(day.offMinutes);
      if (off !== null && (!Number.isFinite(off) || off < 0)) problems.push('duty-free meal minutes must be 0 or more');
      else if (off !== null && off >= span) problems.push('the duty-free meal is as long as the whole shift');
      else fromTimes = (span - (off ?? 0)) / 60;
      if (fromTimes !== null && fromTimes > 16) notes.push(`these times come to ${fmtNum(fromTimes)} hours in one shift; if am and pm are swapped, fix the times`);
    }
  }
  let hours = null;
  if (day.hours !== '') {
    const h = Number(day.hours);
    if (!Number.isFinite(h) || h < 0) problems.push('hours must be a number, 0 or more');
    else if (h > 24) problems.push('one day can’t be more than 24 hours; if this covers several days, enter each day on its own row');
    else {
      hours = h;
      if (fromTimes !== null && Math.abs(fromTimes - h) > 0.01) notes.push(`your times come to ${fmtNum(fromTimes)} hours; the hours you typed (${fmtNum(h)}) are used`);
    }
  } else if (fromTimes !== null) {
    hours = fromTimes;
  }
  for (const [key, label] of [['mealMinutes', 'worked-through meal minutes'], ['restMinutes', 'unpaid rest minutes']]) {
    const v = num(day[key]);
    if (v !== null && (!Number.isFinite(v) || v < 0)) problems.push(`${label} must be 0 or more`);
  }
  return { hours, fromTimes, problems, notes };
}

// ---------- pasted lines ----------
const SUFFIX = '(am|pm|a\\.m\\.|p\\.m\\.|a|p)?';
const TIME_RANGE = new RegExp(`(\\d{1,2})(?::(\\d{2}))?\\s*${SUFFIX}\\s*(?:-|–|—|to)\\s*(\\d{1,2})(?::(\\d{2}))?\\s*${SUFFIX}`, 'i');
function clock(h, m, suffix) {
  h = Number(h); m = Number(m || 0);
  if (m > 59) return null;
  if (suffix) {
    if (h < 1 || h > 12) return null;
    const pm = suffix[0].toLowerCase() === 'p';
    h = (h % 12) + (pm ? 12 : 0);
  } else if (h > 23) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
// A weekday word at the start of what's left once the date is taken out ("Wed 9/3/2025 …").
const WEEKDAY_WORD = /^(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:s|nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)\b\.?,?/i;

// One pasted line -> a day row, or a reason it couldn't be read. The line
// itself is always kept by the caller.
export function parseLine(line) {
  let rest = line.trim();
  const approx = /~|\bapprox|\babout\b|\baround\b|\?/i.test(rest);
  let date = null;
  let m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(rest);
  if (m) date = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  else if ((m = /(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\b/.exec(rest))) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    date = `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }
  if (!date) return { reason: 'no date found (use 2026-06-01 or 6/1/2026)' };
  if (!isRealDate(date)) return { reason: `${m[0]} is not a real calendar date` };
  rest = (rest.slice(0, m.index) + ' ' + rest.slice(m.index + m[0].length)).trim();
  const wd = WEEKDAY_WORD.exec(rest);
  if (wd) {
    const named = WEEKDAY_NAMES.findIndex(n => n.startsWith(wd[1].toLowerCase().slice(0, 3)));
    if (named !== weekday(date)) return { reason: `${wd[1]} doesn’t match ${m[0]}, which is a ${WEEKDAY_NAMES[weekday(date)][0].toUpperCase()}${WEEKDAY_NAMES[weekday(date)].slice(1)}; check the date` };
    rest = rest.slice(wd[0].length).trim();
  }
  const day = emptyDay(date);
  day.approxDate = approx;
  day.approxHours = approx;
  const t = TIME_RANGE.exec(rest);
  if (t) {
    // "5-11pm" means 5pm-11pm: a trailing am/pm carries to the start when
    // that keeps the shift running forward ("9-5pm" stays 9 to 5pm).
    let start = clock(t[1], t[2], t[3]);
    const end = clock(t[4], t[5], t[6]);
    if (!start || !end) return { reason: 'the start or end time is not a real time' };
    if (!t[3] && t[6] && Number(t[1]) <= 12) {
      const carried = clock(t[1], t[2], t[6]);
      if (carried && minutesOf(carried) < minutesOf(end)) start = carried;
    }
    const twelveHourPair = !t[3] && !t[6] && Number(t[1]) <= 12 && Number(t[4]) <= 12 && !/^0/.test(t[1]);
    if (twelveHourPair || (!t[3] && Number(t[1]) <= 12 && minutesOf(end) <= minutesOf(start))) {
      return { reason: 'unclear times: add am/pm to both times or use 24-hour times (for example 10pm-6am or 22:00-06:00)' };
    }
    day.start = start; day.end = end;
    rest = (rest.slice(0, t.index) + ' ' + rest.slice(t.index + t[0].length)).trim();
    if (TIME_RANGE.test(rest)) return { reason: 'a second time range on this line: put each shift on its own line with the same date; a meal break goes in that day’s breaks' };
  } else {
    const h = /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)?\b/i.exec(rest);
    if (!h) return { reason: 'no hours or start–end times found' };
    day.hours = h[1];
    rest = (rest.slice(0, h.index) + ' ' + rest.slice(h.index + h[0].length)).trim();
  }
  const note = rest.replace(/^[\s,;|\t~?]+|[\s,;|\t]+$/g, '').replace(/\s+/g, ' ');
  if (note) day.note = note;
  const { problems } = rowHours(day);
  if (problems.length) return { reason: problems[0] };
  return { day };
}

export function parsePaste(text) {
  const days = [];
  const unparsed = [];
  for (const raw of String(text).split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const r = parseLine(raw);
    if (r.day) days.push(r.day); else unparsed.push({ line: raw.trim(), reason: r.reason });
  }
  return { days, unparsed };
}

// Copy the last workweek in the record forward n times (the quick path).
export function repeatLastWeek(account, n) {
  const a = normalizeAccount(account);
  const startDay = a.workweekStartDay === 'unknown' ? 0 : Number(a.workweekStartDay);
  const dated = a.days.filter(d => isRealDate(d.date));
  if (!dated.length || !Number.isInteger(n) || n < 1) return a;
  const last = dated.map(d => d.date).sort().at(-1);
  const weekStart = addDays(last, -((weekday(last) - startDay + 7) % 7));
  const template = dated.filter(d => d.date >= weekStart && d.date <= addDays(weekStart, 6));
  for (let k = 1; k <= n; k++) {
    for (const d of template) a.days.push({ ...d, date: addDays(d.date, 7 * k) });
  }
  return a;
}

export function repeatLastPay(account, n) {
  const a = normalizeAccount(account);
  const last = a.pay.at(-1);
  if (!last || !isRealDate(last.from) || !isRealDate(last.to) || last.to < last.from || !Number.isInteger(n) || n < 1) return a;
  const len = (Date.parse(`${last.to}T00:00:00Z`) - Date.parse(`${last.from}T00:00:00Z`)) / 86400000 + 1;
  for (let k = 1; k <= n; k++) a.pay.push({ ...last, from: addDays(last.from, len * k), to: addDays(last.to, len * k) });
  return a;
}

// ---------- evaluation ----------
const money2 = n => Math.round(n * 100) / 100;

export function evaluate(account, today) {
  const a = normalizeAccount(account);
  const result = {
    account: a, today, stops: [], routes: [], corrections: [], needs: [], rowNotes: [],
    days: [], weeks: [], groups: [], unusedPay: [], basis: null, totals: null, status: 'empty'
  };

  // Stop points: computing stops; the account and the daily record are kept.
  if (a.payBasis !== 'simple-hourly') result.stops.push({ key: a.payBasis, reason: PAY_BASIS[a.payBasis].reason });
  for (const key of a.situations) {
    const s = SITUATIONS[key];
    (s.stop ? result.stops : result.routes).push({ key, reason: s.reason });
  }

  // Rows -> per-date facts. Problems become corrections; nothing is rewritten.
  a.days.forEach((day, i) => {
    const where = `Day row ${i + 1}${day.date ? ` (${day.date})` : ''}`;
    if (!day.date) { result.corrections.push({ where, message: 'Enter the date for this day, or remove the row.' }); return; }
    if (!isRealDate(day.date)) { result.corrections.push({ where, message: `${day.date} is not a real calendar date. Check the month and day.` }); return; }
    if (day.date > today) { result.corrections.push({ where, message: `${usDate(day.date)} is after today. BOLI’s form only takes past dates; check the year.` }); return; }
    const h = rowHours(day);
    for (const p of h.problems) result.corrections.push({ where, message: `${p[0].toUpperCase()}${p.slice(1)}.` });
    for (const n of h.notes) result.rowNotes.push({ where, message: n });
    if (h.problems.length) return;
    result.days.push({ ...day, index: i, worked: h.hours, meal: num(day.mealMinutes) ?? 0, rest: num(day.restMinutes) ?? 0 });
  });
  // Split shifts: rows on the same date are added together and stay separate rows.
  const perDate = new Map();
  for (const d of result.days) if (d.worked !== null) perDate.set(d.date, (perDate.get(d.date) ?? 0) + d.worked);
  for (const [date, total] of perDate) {
    if (total > 24) result.corrections.push({ where: usDate(date), message: `Rows for ${usDate(date)} add up to ${fmtNum(total)} hours, more than a day has. Check for a duplicated row.` });
  }

  const workedDates = result.days.filter(d => d.worked === null || d.worked > 0).map(d => d.date).sort();
  if (a.hireDate) {
    if (!isRealDate(a.hireDate)) result.corrections.push({ where: 'Hire date', message: `${a.hireDate} is not a real calendar date.` });
    else if (workedDates.length && workedDates[0] < a.hireDate) {
      result.corrections.push({ where: 'Hire date', message: `Your record has work on ${usDate(workedDates[0])}, before the hire date you gave (${usDate(a.hireDate)}). BOLI’s form won’t accept a wage date before the hire date. Check the hire date or that day.` });
    }
  }

  a.rates.forEach((r, i) => {
    const where = `Pay rate ${i + 1}`;
    if (r.from && !isRealDate(r.from)) result.corrections.push({ where, message: `${r.from} is not a real calendar date.` });
    if (r.rate === '' || !Number.isFinite(Number(r.rate)) || Number(r.rate) < 0) result.corrections.push({ where, message: 'Enter the hourly rate you were promised (a number), or remove this rate.' });
  });
  a.pay.forEach((p, i) => {
    const where = `Paycheck ${i + 1}`;
    if (!isRealDate(p.from) || !isRealDate(p.to)) result.corrections.push({ where, message: 'Enter the first and last day this paycheck covered (real calendar dates).' });
    else if (p.to < p.from) result.corrections.push({ where, message: 'The last day is before the first day. Check the dates.' });
    if (p.gross === '' || !Number.isFinite(Number(p.gross)) || Number(p.gross) < 0) result.corrections.push({ where, message: 'Enter the gross amount (before deductions; 0 if you were paid nothing).' });
  });

  // Workweek basis for grouping (display always; calculation only if safe).
  const breakIn = d => (a.breakInclusion === 'excluded' ? (d.meal + d.rest) / 60 : 0);
  let basisDay = a.workweekStartDay === 'unknown' ? null : Number(a.workweekStartDay);
  let assumed = false;
  if (basisDay === null) {
    // With no 7-day stretch over 40 hours, no alignment produces overtime.
    const byDate = new Map();
    for (const d of result.days) byDate.set(d.date, (byDate.get(d.date) ?? 0) + (d.worked ?? 0) + breakIn(d));
    const dates = [...byDate.keys()].sort();
    let worst = 0;
    for (const start of dates) {
      let sum = 0;
      for (const [date, h] of byDate) if (date >= start && date <= addDays(start, 6)) sum += h;
      worst = Math.max(worst, sum);
    }
    basisDay = 0;
    assumed = true;
    if (worst > 40) {
      result.needs.push('Some 7-day stretches have more than 40 hours, so overtime depends on which day your employer’s workweek starts. A paystub, handbook or your manager can tell you; BOLI can too. Choose it above.');
    }
  }
  result.basis = { day: basisDay, assumed };
  if (!a.region) result.needs.push('Choose the Oregon wage region where you worked.');
  if (a.breakInclusion === 'unknown' && result.days.some(d => d.meal + d.rest > 0)) {
    result.needs.push('You entered meal or rest minutes. Say whether they are already counted in your hours (question above) so they are counted once.');
  }

  // Group days into workweeks.
  const weekMap = new Map();
  for (const d of result.days) {
    const ws = addDays(d.date, -((weekday(d.date) - basisDay + 7) % 7));
    if (!weekMap.has(ws)) weekMap.set(ws, { start: ws, end: addDays(ws, 6), days: [] });
    weekMap.get(ws).days.push(d);
  }
  const ratesSorted = a.rates.filter(r => r.rate !== '' && Number.isFinite(Number(r.rate)) && (!r.from || isRealDate(r.from)))
    .sort((x, y) => (x.from || '').localeCompare(y.from || ''));
  const promisedFor = date => {
    let r = null;
    for (const x of ratesSorted) if (!x.from || x.from <= date) r = Number(x.rate);
    return r;
  };
  for (const w of [...weekMap.values()].sort((x, y) => x.start.localeCompare(y.start))) {
    w.days.sort((x, y) => x.date.localeCompare(y.date) || x.index - y.index);
    w.hours = w.days.reduce((s, d) => s + (d.worked ?? 0), 0);
    w.meal = w.days.reduce((s, d) => s + d.meal, 0);
    w.rest = w.days.reduce((s, d) => s + d.rest, 0);
    w.worked = w.days.some(d => d.worked === null || d.worked > 0);
    w.approx = w.days.some(d => d.approxDate || d.approxHours);
    const unknown = w.days.filter(d => d.worked === null);
    const rates = [...new Set(w.days.filter(d => d.worked === null || d.worked > 0).map(d => promisedFor(d.date)))];
    if (unknown.length) {
      w.status = 'missing';
      w.reason = `Hours not given for ${unknown.map(d => usDate(d.date)).join(', ')}. Add them, or leave them unknown and this week stays out of the total.`;
    } else if (rates.length > 1) {
      w.status = 'out';
      w.reason = w.hours > 40
        ? 'Your promised rate changed during this workweek. Overtime with two rates in one week needs review this page doesn’t do.'
        : 'Your promised rate changed during this workweek. This page figures one rate per workweek, so this week is listed, not guessed.';
    } else {
      w.promised = rates[0] ?? null;
      w.est = estimate({
        workweekStart: w.start, region: a.region || 'standard', payBasis: 'simple-hourly',
        actualHours: String(w.hours), weeks: '1', unpaidMealMinutes: String(w.meal), unpaidRestMinutes: String(w.rest),
        breakInclusion: a.breakInclusion, promisedRate: w.promised === null ? '' : String(w.promised),
        cashPaid: '0', tips: '0', includePenalty: false, daysLate: '0'
      });
      if (w.est.status === 'estimated') {
        w.status = 'covered';
      } else if (w.est.status === 'unsupported') {
        w.status = 'out';
        const first = RATE_PERIODS[0].start, last = RATE_PERIODS.at(-1).end;
        w.reason = w.start < first || w.end > last
          ? `This workweek is not entirely within the minimum-wage periods this page has verified (${usDate(first)} to ${usDate(last)}). It is listed, not guessed.`
          : 'This workweek crosses the July 1 minimum-wage change. Weeks that span two rates need review this page doesn’t do.';
      } else {
        w.status = 'missing';
        w.reason = w.est.reason;
      }
    }
    result.weeks.push(w);
  }

  // Paychecks join the weeks they paid for; each group is settled together.
  const parent = new Map(result.weeks.map(w => [w.start, w.start]));
  const find = k => (parent.get(k) === k ? k : (parent.set(k, find(parent.get(k))), parent.get(k)));
  const validPay = a.pay.map((p, i) => ({ ...p, index: i }))
    .filter(p => isRealDate(p.from) && isRealDate(p.to) && p.to >= p.from && p.gross !== '' && Number.isFinite(Number(p.gross)) && Number(p.gross) >= 0);
  const workDays = result.days.filter(d => d.worked === null || d.worked > 0);
  const weekOf = date => result.weeks.find(w => date >= w.start && date <= w.end);
  for (const p of validPay) {
    const touched = [...new Set(workDays.filter(d => d.date >= p.from && d.date <= p.to).map(d => weekOf(d.date).start))];
    p.weeks = touched;
    if (!touched.length) { result.unusedPay.push(p.index); continue; }
    for (const ws of touched.slice(1)) parent.set(find(ws), find(touched[0]));
  }
  const groups = new Map();
  for (const w of result.weeks.filter(x => x.worked)) {
    const root = find(w.start);
    if (!groups.has(root)) groups.set(root, { weeks: [], pay: [] });
    groups.get(root).weeks.push(w);
  }
  for (const p of validPay) if (p.weeks.length) groups.get(find(p.weeks[0])).pay.push(p);
  for (const g of groups.values()) {
    g.paid = g.pay.reduce((s, p) => s + Number(p.gross), 0);
    const gDays = g.weeks.flatMap(w => w.days).filter(d => d.worked === null || d.worked > 0);
    const unpaidDates = gDays.filter(d => !g.pay.some(p => d.date >= p.from && d.date <= p.to)).map(d => d.date);
    g.firstDate = gDays.map(d => d.date).sort()[0];
    g.lastDate = gDays.map(d => d.date).sort().at(-1);
    const blocked = g.weeks.filter(w => w.status !== 'covered');
    if (unpaidDates.length) {
      g.computable = false;
      g.reason = `What you were paid for ${[...new Set(unpaidDates)].map(usDate).join(', ')} is missing. Add the paycheck that covered those days (enter 0 if you were paid nothing).`;
    } else if (blocked.length) {
      g.computable = false;
      g.reason = g.pay.length && g.weeks.length > 1
        ? 'One paycheck covered these weeks together, and at least one of them can’t be calculated, so none of them can be settled.'
        : blocked[0].reason;
    } else {
      g.computable = true;
      g.due = g.weeks.reduce((s, w) => s + w.est.dueTotal, 0);
      g.regularDue = g.weeks.reduce((s, w) => s + w.est.regularHours * w.est.regularRate, 0);
      // Straight time for every hour: pay below this means regular wages are short, not only the overtime premium.
      g.straightDue = g.weeks.reduce((s, w) => s + (w.est.regularHours + w.est.overtimeHours) * w.est.regularRate, 0);
      g.overtimeHours = g.weeks.reduce((s, w) => s + w.est.overtimeHours, 0);
      g.hours = g.weeks.reduce((s, w) => s + w.est.totalHours, 0);
      g.shortfall = money2(Math.max(0, g.due - g.paid));
    }
    result.groups.push(g);
  }
  result.groups.sort((x, y) => x.firstDate.localeCompare(y.firstDate));

  // Totals (only when nothing blocks the whole account).
  const allWeeks = result.weeks.filter(w => w.worked);
  if (!a.days.length) { result.status = 'empty'; return result; }
  if (result.stops.length) { result.status = 'stopped'; return result; }
  if (result.corrections.length) { result.status = 'needs-correction'; return result; }
  if (result.needs.length) { result.status = 'needs-input'; return result; }
  if (!allWeeks.length) { result.status = 'empty'; return result; }
  const done = result.groups.filter(g => g.computable);
  const owedGroups = done.filter(g => g.shortfall > 0.005);
  const coveredWeeks = done.flatMap(g => g.weeks);
  const t = {
    allWeeks: allWeeks.length,
    coveredWeeks: coveredWeeks.length,
    partial: coveredWeeks.length < allWeeks.length,
    excluded: allWeeks.filter(w => !coveredWeeks.includes(w)),
    owed: money2(owedGroups.reduce((s, g) => s + g.shortfall, 0)),
    due: money2(done.reduce((s, g) => s + g.due, 0)),
    paid: money2(done.reduce((s, g) => s + g.paid, 0)),
    owedPaid: money2(owedGroups.reduce((s, g) => s + g.paid, 0)),
    owedHours: owedGroups.reduce((s, g) => s + g.hours, 0)
  };
  if (owedGroups.length) {
    t.firstOwed = owedGroups.map(g => g.firstDate).sort()[0];
    t.lastOwed = owedGroups.map(g => g.lastDate).sort().at(-1);
    t.withinTwoYears = t.firstOwed >= twoYearsBefore(today);
    t.regular = owedGroups.some(g => g.paid < g.straightDue - 0.005);
    t.overtime = owedGroups.some(g => g.overtimeHours > 0);
    t.overtimeRates = [...new Set(owedGroups.flatMap(g => g.weeks).filter(w => w.est.overtimeHours > 0).map(w => money2(w.est.regularRate * 1.5)))];
  }
  t.ratesUsed = [...new Set(coveredWeeks.map(w => w.est.regularRate))];
  t.promisedGiven = coveredWeeks.some(w => w.promised !== null);
  t.underMinimum = t.owed > 0 && t.owed < BOLI_MINIMUM;
  result.totals = t;
  result.status = coveredWeeks.length ? 'ready' : 'none-covered';
  return result;
}

// ---------- outputs ----------
export const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const hoursText = n => `${fmtNum(n)} ${Math.abs(n - 1) < 1e-9 ? 'hour' : 'hours'}`;

export function issueDraft(result) {
  const t = result.totals;
  if (!t || !t.firstOwed) return '';
  const range = t.firstOwed === t.lastOwed ? `on ${usDate(t.firstOwed)}` : `from ${usDate(t.firstOwed)} to ${usDate(t.lastOwed)}`;
  const variants = [
    `I worked ${hoursText(t.owedHours)} ${range}. My hours for each day are in the attached Personal Time Records. I was paid ${money(t.owedPaid)} in gross wages for this work, and I am owed ${money(t.owed)} in additional wages.`,
    `I worked ${hoursText(t.owedHours)} ${range} (daily hours attached). I was paid ${money(t.owedPaid)} and I am owed ${money(t.owed)} in additional wages.`,
    `Worked ${hoursText(t.owedHours)} ${range}; paid ${money(t.owedPaid)}; owed ${money(t.owed)}.`
  ];
  return variants.find(v => v.length <= ISSUE_LIMIT) ?? variants.at(-1).slice(0, ISSUE_LIMIT);
}

// The daily record (output A): every row the person gave, in date order,
// with weekly totals. Built even when calculation is stopped.
export function dailyRecord(result) {
  const weeks = result.weeks.map(w => ({
    label: `${longDate(w.start)} – ${longDate(w.end)}`,
    rows: w.days.map(d => ({
      date: `${d.approxDate ? '~' : ''}${longDate(d.date)}`,
      hours: d.worked === null ? 'not given' : `${d.approxHours ? '~' : ''}${fmtNum(d.worked)}`,
      times: d.start && d.end ? `${d.start}–${d.end}${d.offMinutes ? ` (${d.offMinutes} min meal off the clock)` : ''}` : '',
      breaks: [d.meal ? `${d.meal} min unpaid meal worked through or interrupted` : '', d.rest ? `${d.rest} min unpaid rest break` : ''].filter(Boolean).join('; '),
      note: d.note
    })),
    total: `${fmtNum(w.hours)} hours${w.meal + w.rest ? `; ${w.meal + w.rest} min unpaid break time` : ''}${w.days.some(d => d.worked === null) ? '; some hours not given' : ''}`
  }));
  return weeks;
}

export function workweekLabel(result) {
  const b = result.basis;
  if (!b) return '';
  return b.assumed
    ? 'Weeks are shown Sunday to Saturday. Your employer’s workweek start day was not given.'
    : `Employer’s workweek starts on ${DAY_NAMES[b.day]}.`;
}

// Output B: the Wage Claim section, in the portal's order.
// Each item: label, value (or null = "you supply this"), help, evidence.
export function fieldSheet(result) {
  const t = result.totals;
  const ready = result.status === 'ready' && t;
  const owed = ready && t.owed > 0.005;
  const items = [];
  const types = [];
  if (owed && t.regular) types.push('Regular wages');
  if (owed && t.overtime) types.push('Overtime');
  items.push({
    label: 'Type of missing wages (check all that apply)',
    value: types.length ? `${types.join(' and ')} (suggested from your figures)` : null,
    help: 'Also check Final paycheck if your last check was missing or late, and Other for anything else. The choice is yours.',
    evidence: 'seen on form'
  });
  if (owed && t.overtime) {
    items.push({ label: 'What was the overtime rate of pay?', value: t.overtimeRates.map(r => `${money(r)}/hour`).join(' or '), help: '1.5 times the regular rate used for those weeks.' + (t.overtimeRates.length > 1 ? ' The form takes one amount; which one to enter is your choice.' : ''), evidence: 'seen on form' });
  }
  items.push({
    label: 'Areas that may apply: wages claimed for work in the last two years',
    value: owed ? (t.withinTwoYears ? `Yes: every day in the figure is on or after ${usDate(twoYearsBefore(result.today))} (a date fact, not a legal finding).`
      : t.lastOwed < twoYearsBefore(result.today) ? `No: every day in the figure is before ${usDate(twoYearsBefore(result.today))} (a date fact, not a legal finding).`
      : `Not all: some days in the figure are before ${usDate(twoYearsBefore(result.today))} (a date fact, not a legal finding).`) : null,
    help: 'The form also asks about being under 18 and construction work; this page doesn’t cover those.',
    evidence: 'seen on form'
  });
  const recorded = result.days.map(d => d.date).sort();
  const partialDates = owed && t.partial && recorded.length && (recorded[0] < t.firstOwed || recorded.at(-1) > t.lastOwed)
    ? ` These dates cover only the figured weeks. Your record runs ${usDate(recorded[0])} to ${usDate(recorded.at(-1))}; if you also claim the weeks listed below, the dates and the total change. BOLI’s help line can help.`
    : '';
  items.push({ label: 'First date owed wages', value: owed ? usDate(t.firstOwed) : null, help: 'Must be on or after your hire date and on or before the last date.' + partialDates, evidence: 'rule from form code' });
  items.push({ label: 'Last date owed wages', value: owed ? usDate(t.lastOwed) : null, help: 'The form’s date picker appears to stop at today.' + partialDates, evidence: 'rule from form code' });
  items.push({ label: 'When were the wages due?', value: null, help: 'You choose this date; it must be on or after the last date owed. See “When were the wages due?” below.', evidence: 'rule from form code' });
  const r = a => a.map(x => `${money(x)}/hour`).join(' or ');
  items.push({
    label: 'What was your rate of pay?',
    value: ready && t.promisedGiven ? r(t.ratesUsed) : null,
    help: ready && !t.promisedGiven ? 'You didn’t enter a promised rate, so minimum wage was used for the figures. Enter the rate you were actually paid or promised.'
      : 'Pay rate type: hour.' + (ready && t.ratesUsed.length > 1 ? ' The form takes one amount; which one to enter is your choice, and you can mention the change in Describe the Issue.' : ''),
    evidence: 'seen on form'
  });
  let totalValue = null, totalHelp = '';
  if (ready) {
    if (!owed) {
      totalHelp = 'No difference was found for the weeks that could be calculated. That doesn’t show that every pay or break rule was followed.';
    } else {
      totalValue = money(t.owed) + (t.partial ? ` (for ${t.coveredWeeks} of ${t.allWeeks} workweeks)` : '');
      totalHelp = t.underMinimum
        ? `This is under BOLI’s $${BOLI_MINIMUM} minimum for this field. The form rejects amounts under $${BOLI_MINIMUM}. This page doesn’t round up; ask BOLI what to do.`
        : 'Wages only; no penalties added. Required, at least $50.';
      if (t.partial) totalHelp += ' Some weeks are not in this figure; see the list below.';
    }
  } else totalHelp = 'Not figured yet. See what is needed above.';
  items.push({ label: 'Total wages owed', value: totalValue, help: totalHelp, evidence: 'rule from form code' });
  items.push({ label: 'Have you asked your employer for the wages? / Did they say why not?', value: null, help: 'Your answer, in your words (300 characters for the reason).', evidence: 'seen on form' });
  items.push({
    label: 'Partial payment received?',
    value: null,
    help: (ready ? `Gross wages paid for the calculated days: ${money(t.paid)}. ` : '') + 'Here “paid” means gross wages for these days. BOLI’s question may mean a later payment toward what you are owed; answer that yourself.',
    evidence: 'seen on form'
  });
  items.push({ label: 'Describe the Issue (300 characters)', value: null, help: 'Use your edited draft below.', evidence: 'limit seen on form' });
  return items;
}

const pad = (s, n) => (s.length >= n ? s : s + ' '.repeat(n - s.length));

export function preparationText(result, content, draft) {
  const L = [];
  const t = result.totals;
  L.push('WAGE OWED OREGON — PREPARATION SHEET');
  L.push('This is not a claim. Nothing has been filed, received, accepted or recovered.');
  L.push(`Prepared ${result.today}. Facts are the worker’s own account. ~ marks an approximate entry.`);
  L.push('', 'A. DAILY HOURS RECORD (can be uploaded to BOLI as “Personal Time Records”, or mailed)');
  L.push('Worker: ____________________   Employer: ____________________');
  L.push('(Write both names in before you mail or upload this. This page never asks for them.)');
  L.push(workweekLabel(result));
  for (const w of dailyRecord(result)) {
    L.push('', `Week ${w.label}`);
    for (const r of w.rows) {
      L.push(`  ${pad(r.date, 22)} ${pad(r.hours + ' h', 12)} ${[r.times, r.breaks, r.note].filter(Boolean).join(' | ')}`.trimEnd());
    }
    L.push(`  Week total: ${w.total}`);
  }
  if (!result.weeks.length) L.push('(No days entered yet.)');
  if (result.account.unparsed.length) {
    L.push('', 'Pasted lines not read (kept as typed):');
    for (const u of result.account.unparsed) L.push(`  ${u.line}  — ${u.reason}`);
  }
  const pay = result.account.pay;
  if (pay.length) {
    L.push('', 'Paychecks (gross, before deductions):');
    for (const p of pay) L.push(`  ${p.from || '?'} to ${p.to || '?'}: ${p.gross === '' ? 'amount not given' : money(Number(p.gross))}${p.note ? ` — ${p.note}` : ''}`);
  }

  L.push('', 'B. BOLI ONLINE FORM — WAGE CLAIM SECTION, IN THE FORM’S ORDER');
  L.push(statusLine(result));
  for (const f of fieldSheet(result)) {
    L.push(`- ${f.label}: ${f.value ?? 'YOU SUPPLY THIS'}`);
    if (f.help) L.push(`    ${f.help}`);
    L.push(`    [${f.evidence}]`);
  }
  if (t && t.excluded.length) {
    L.push('', 'Weeks not in the total:');
    for (const w of t.excluded) L.push(`  ${usDate(w.start)}–${usDate(w.end)}: ${excludedReason(result, w)}`);
  }
  L.push('', 'Describe the Issue — your draft (edit before using):');
  L.push(`  ${draft || '(no draft yet)'}`, `  (${(draft || '').length}/${ISSUE_LIMIT} characters)`);
  L.push('', 'When were the wages due?', `  ${content.DUE_DATE_HELP}`, `  ${content.LINKS.paychecks}`);

  L.push('', 'C. HAVE READY FOR ONE SITTING');
  L.push(content.HAVE_READY_NOTE);
  for (const [item, note] of content.HAVE_READY) L.push(`- ${item}${note ? `. ${note}` : ''}`);
  L.push('', 'Documents and the upload type each fits (each upload needs a type and a description):');
  for (const [doc, type, desc] of content.DOCUMENT_MAP) L.push(`- ${doc} → ${type}. Description idea: “${desc}”`);
  L.push(`Files you can’t upload can be mailed with your name and the employer’s name on them to: ${content.MAIL_EVIDENCE}.`);

  L.push('', 'D. BEFORE YOU SIGN — BOLI’S WORDING, SHOWN AHEAD OF TIME');
  L.push('Notice on the form [seen on form]:', `  “${content.ASSIGNMENT_NOTICE}”`);
  L.push('Sign-and-submit wording [from form code; may differ from what is displayed]:');
  for (const p of content.ASSIGNMENT_DIALOG) L.push(`  “${p}”`);
  for (const p of content.SIGNATURE_TEXT) L.push(`  “${p}”`);
  L.push('This page does not recommend signing or not signing. Questions before deciding:');
  L.push(`  BOLI: ${content.PHONE}; ${content.EMAILS}`);
  L.push(`  BOLI Attorney List (complainants): ${content.LINKS.attorneyList}`);
  L.push(`  Oregon Law Help: ${content.LINKS.lawHelp}`);

  L.push('', 'E. WHERE THIS PAGE STOPS');
  for (const s of result.stops) L.push(`- ${s.reason}`);
  for (const s of result.routes) L.push(`- ${s.reason}`);
  if (!result.stops.length && !result.routes.length) L.push('- No stop point applies to what you entered.');
  L.push(`- BOLI wage claims: ${content.LINKS.wageClaim}`, `- BOLI complaint portal: ${content.LINKS.portal}`);

  L.push('', 'LIMITS');
  for (const l of content.LIMITS) L.push(`- ${l}`);
  L.push('- Rates: ' + RATE_PERIODS.map(p => `${usDate(p.start)}–${usDate(p.end)} Standard ${money(p.standard)}, Portland Metro ${money(p.portland)}, Nonurban ${money(p.nonurban)}`).join('; ') + '.');
  return L.join('\n') + '\n';
}

export function excludedReason(result, w) {
  const g = result.groups.find(x => x.weeks.includes(w));
  return w.status !== 'covered' ? w.reason : (g?.reason ?? '');
}

export function statusLine(result) {
  switch (result.status) {
    case 'empty': return 'Nothing to figure yet: add the days you worked.';
    case 'stopped': return 'Figures stop here for the reason(s) in section E. Your record is kept and the daily record above still stands.';
    case 'needs-correction': return `Fix first: ${result.corrections.map(c => `${c.where}: ${c.message}`).join(' ')}`;
    case 'needs-input': return `Needed first: ${result.needs.join(' ')}`;
    case 'none-covered': return 'None of the weeks could be figured; each one is listed with its reason.';
    default: return result.totals.partial
      ? `Figured for ${result.totals.coveredWeeks} of ${result.totals.allWeeks} workweeks. The others are listed with reasons.`
      : `Figured for all ${result.totals.allWeeks} workweek${result.totals.allWeeks === 1 ? '' : 's'}.`;
  }
}
