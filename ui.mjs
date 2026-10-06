import { RATE_PERIODS, REGION_LABELS } from './calculator.mjs';
import * as content from './content.mjs';
import {
  emptyAccount, emptyDay, emptyPay, emptyRate, normalizeAccount, serializeAccount, parseSaved, parsePaste,
  repeatLastWeek, repeatLastPay, evaluate, issueDraft, fieldSheet, dailyRecord, preparationText, workweekLabel,
  statusLine, excludedReason, isRealDate, addDays, localToday, usDate, longDate, money, ISSUE_LIMIT
} from './ledger.mjs';

const STORE_KEY = 'wage-owed-oregon-record';
const $ = id => document.getElementById(id);
let account = emptyAccount();
let result = null;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
}
const link = (href, text) => el('a', { href, rel: 'noopener' }, text || href);

// ---------- inputs ----------
function bindField(input, list, index, key) {
  const isBox = input.type === 'checkbox';
  const item = list === null ? account : account[list][index];
  if (isBox) input.checked = item[key] === true; else input.value = item[key] ?? '';
  input.addEventListener(isBox ? 'change' : 'input', () => {
    const target = list === null ? account : account[list][index];
    target[key] = isBox ? input.checked : input.value;
    refresh();
  });
  return input;
}

function removeButton(list, index, what) {
  return el('button', { type: 'button', class: 'danger icon', 'aria-label': `Remove ${what}`, onclick: () => { account[list].splice(index, 1); renderAll(); } }, '✕');
}

function renderDays() {
  const box = $('days');
  box.replaceChildren();
  account.days.forEach((d, i) => {
    const f = (key, type, label, extra = {}) => {
      const id = `day-${i}-${key}`;
      return el('div', {}, el('label', { for: id }, label), bindField(el('input', { id, type, 'data-field': key, ...extra }), 'days', i, key));
    };
    const box2 = (key, label) => el('label', { class: 'check' }, bindField(el('input', { type: 'checkbox', 'data-field': key }), 'days', i, key), label);
    box.append(el('div', { class: 'entry day-row', 'data-index': i },
      el('div', { class: 'entry-grid' },
        el('div', {}, f('date', 'date', `Day ${i + 1}: date`), box2('approxDate', 'approx. date')),
        el('div', {}, f('hours', 'number', 'Hours', { min: 0, max: 24, step: 0.01, inputmode: 'decimal' }), box2('approxHours', 'approx. hours')),
        f('start', 'time', 'or start'),
        f('end', 'time', 'end'),
        removeButton('days', i, `day ${i + 1}`)),
      el('details', {}, el('summary', { class: 'hint' }, 'Breaks and notes'),
        el('div', { class: 'entry-grid2' },
          f('offMinutes', 'number', 'Duty-free meal off the clock (min, only with times)', { min: 0, step: 1 }),
          f('mealMinutes', 'number', 'Unpaid meal you worked through or were interrupted in (whole meal, min)', { min: 0, step: 1 }),
          f('restMinutes', 'number', 'Unpaid rest break (min)', { min: 0, step: 1 }),
          f('note', 'text', 'Note (shown on your record)', { maxlength: 120 })))));
  });
}

function renderPay() {
  const box = $('pay');
  box.replaceChildren();
  account.pay.forEach((p, i) => {
    const f = (key, type, label, extra = {}) => {
      const id = `pay-${i}-${key}`;
      return el('div', {}, el('label', { for: id }, label), bindField(el('input', { id, type, 'data-field': key, ...extra }), 'pay', i, key));
    };
    box.append(el('div', { class: 'entry pay-row' }, el('div', { class: 'entry-grid' },
      f('from', 'date', `Paycheck ${i + 1}: first day covered`), f('to', 'date', 'last day covered'),
      f('gross', 'number', 'Gross pay ($)', { min: 0, step: 0.01, inputmode: 'decimal' }), f('note', 'text', 'Note', { maxlength: 80 }),
      removeButton('pay', i, `paycheck ${i + 1}`))));
  });
}

function renderRates() {
  const box = $('rates');
  box.replaceChildren();
  account.rates.forEach((r, i) => {
    const f = (key, type, label, extra = {}) => {
      const id = `rate-${i}-${key}`;
      return el('div', {}, el('label', { for: id }, label), bindField(el('input', { id, type, 'data-field': key, ...extra }), 'rates', i, key));
    };
    box.append(el('div', { class: 'entry rate-row' }, el('div', { class: 'entry-grid' },
      f('rate', 'number', `Rate ${i + 1} ($/hour)`, { min: 0, step: 0.01, inputmode: 'decimal' }),
      f('from', 'date', 'Starting (empty = from the start)'), el('div'), el('div'), removeButton('rates', i, `rate ${i + 1}`))));
  });
}

function renderSituations() {
  const box = $('situations');
  box.replaceChildren();
  for (const [key, s] of Object.entries(content.SITUATIONS)) {
    const input = el('input', { type: 'checkbox', 'data-situation': key });
    input.checked = account.situations.includes(key);
    input.addEventListener('change', () => {
      account.situations = input.checked ? [...new Set([...account.situations, key])] : account.situations.filter(x => x !== key);
      refresh();
    });
    box.append(el('label', { class: 'check' }, input, s.label));
  }
}

function renderUnparsed() {
  const box = $('unparsed');
  box.replaceChildren();
  if (!account.unparsed.length) return;
  box.append(el('div', { class: 'entry', id: 'unparsedList' },
    el('strong', {}, 'Lines that couldn’t be read (kept here; add them as days by hand, or fix and paste again):'),
    el('ul', { class: 'problems' }, account.unparsed.map(u => el('li', {}, el('code', {}, u.line), ` — ${u.reason}`))),
    el('button', { type: 'button', class: 'secondary', onclick: () => { account.unparsed = []; renderAll(); } }, 'I’ve dealt with these; remove the list')));
}

function renderAll() {
  for (const input of document.querySelectorAll('[data-path]')) {
    const key = input.dataset.path;
    if (input.type === 'checkbox') input.checked = account[key] === true; else input.value = account[key] ?? '';
  }
  renderSituations(); renderRates(); renderDays(); renderPay(); renderUnparsed();
  refresh();
}

// ---------- outputs ----------
function renderReadback() {
  $('status').dataset.status = result.status;
  $('status').textContent = statusLine(result);
  const problems = $('problems');
  problems.replaceChildren();
  const items = [...result.corrections.map(c => `${c.where}: ${c.message}`), ...result.needs, ...result.stops.map(s => s.reason)];
  if (items.length) problems.append(el('ul', { class: 'problems' }, items.map(t => el('li', {}, t))));
  if (result.rowNotes.length) problems.append(el('ul', {}, result.rowNotes.map(n => el('li', {}, `${n.where}: ${n.message}`))));

  const box = $('readback');
  box.replaceChildren();
  if (result.basis && result.weeks.length) box.append(el('p', { class: 'hint' }, workweekLabel(result)));
  const regionName = REGION_LABELS[account.region] || 'region not chosen';
  for (const w of result.weeks) {
    const n = w.days.length;
    const approx = w.days.filter(d => d.approxDate || d.approxHours).length;
    let text = `Week of ${longDate(w.start)} – ${longDate(w.end)}: ${n} ${n === 1 ? 'entry' : 'entries'}, ${Math.round(w.hours * 100) / 100} hours`;
    if (w.meal + w.rest) text += `, plus ${w.meal + w.rest} minutes of unpaid break time`;
    if (approx) text += ` (${approx} approximate)`;
    text += '.';
    const p = el('p', {}, text);
    if (w.status === 'covered') {
      const e = w.est;
      p.append(` Figured at ${money(e.regularRate)}/hour (${w.promised !== null ? 'your promised rate' : `${regionName} minimum wage`})`,
        e.overtimeHours > 0 ? `, ${Math.round(e.overtimeHours * 100) / 100} overtime hours at ${money(e.regularRate * 1.5)}` : '',
        e.addedBreakHours > 0 ? `, ${Math.round(e.addedBreakHours * 100) / 100} break hours added once` : '',
        `: ${money(e.dueTotal)} due under these assumptions.`);
    } else {
      p.append(' ', el('span', { class: 'week-out' }, w.reason));
    }
    box.append(p);
  }
  for (const g of result.groups) {
    const range = `${usDate(g.firstDate)}–${usDate(g.lastDate)}`;
    if (g.computable) {
      box.append(el('p', {}, `Paid ${money(g.paid)} gross for ${range}. Due under these assumptions: ${money(g.due)}. Difference: ${money(g.shortfall)}.`));
    } else if (result.weeks.every(w => !g.weeks.includes(w) || w.status === 'covered')) {
      box.append(el('p', { class: 'week-out' }, `${range}: ${g.reason}`));
    }
  }
  for (const i of result.unusedPay) box.append(el('p', { class: 'hint' }, `Paycheck ${i + 1} covers no days in your record. It is kept, not used.`));
}

function currentDraft() {
  return account.issueDraft ?? issueDraft(result);
}

function renderSheet() {
  $('weekBasis').textContent = workweekLabel(result);
  const recordA = $('recordA');
  recordA.replaceChildren();
  const weeks = dailyRecord(result);
  if (!weeks.length) recordA.append(el('p', { class: 'hint' }, 'No days entered yet.'));
  else {
    const body = el('tbody');
    for (const w of weeks) {
      body.append(el('tr', {}, el('th', { colspan: 4 }, `Week ${w.label}`)));
      for (const r of w.rows) body.append(el('tr', {}, el('td', {}, r.date), el('td', {}, r.hours), el('td', {}, r.times), el('td', {}, [r.breaks, r.note].filter(Boolean).join(' | '))));
      body.append(el('tr', { class: 'week-total' }, el('td', {}, 'Week total'), el('td', { colspan: 3 }, w.total)));
    }
    recordA.append(el('table', {}, el('thead', {}, el('tr', {}, el('th', {}, 'Date'), el('th', {}, 'Hours'), el('th', {}, 'Times'), el('th', {}, 'Breaks and notes'))), body));
  }
  if (account.unparsed.length) {
    recordA.append(el('p', { class: 'hint' }, 'Pasted lines not read (kept as typed): ', account.unparsed.map(u => u.line).join(' · ')));
  }

  $('sheetStatus').textContent = statusLine(result);
  const sheet = $('sheetB');
  sheet.replaceChildren();
  for (const f of fieldSheet(result)) {
    sheet.append(el('div', { class: 'field' },
      el('div', { class: 'label' }, f.label, el('span', { class: 'tag' }, f.evidence)),
      el('div', { class: f.value ? 'value' : 'value supply' }, f.value ?? 'You supply this'),
      f.help ? el('div', { class: 'hint' }, f.help) : null));
  }
  const excluded = $('excluded');
  excluded.replaceChildren();
  if (result.totals?.excluded.length) {
    excluded.append(el('div', { class: 'field' }, el('div', { class: 'label' }, 'Weeks not in the total'),
      el('ul', {}, result.totals.excluded.map(w => el('li', {}, `${usDate(w.start)}–${usDate(w.end)}: ${excludedReason(result, w)}`)))));
  }
  const draft = $('issueDraft');
  const value = currentDraft();
  if (document.activeElement !== draft) draft.value = value;
  $('issueCount').textContent = `${draft.value.length}/${ISSUE_LIMIT} characters`;
}

function renderStatic() {
  $('dueHelp').replaceChildren(content.DUE_DATE_HELP, ' ', link(content.LINKS.paychecks, 'BOLI: paychecks and final pay'));
  $('haveReady').replaceChildren(
    el('p', { class: 'hint' }, content.HAVE_READY_NOTE, ' ', el('span', { class: 'tag' }, 'seen on form')),
    el('ul', {}, content.HAVE_READY.map(([item, note]) => el('li', {}, el('strong', {}, item), note ? `. ${note}` : ''))),
    el('p', {}, 'Documents, and the upload type each one fits. Every upload needs a type and a short description:'),
    el('table', {}, el('thead', {}, el('tr', {}, el('th', {}, 'What you have'), el('th', {}, 'BOLI upload type'), el('th', {}, 'Description you could adapt'))),
      el('tbody', {}, content.DOCUMENT_MAP.map(([doc, type, desc]) => el('tr', {}, el('td', {}, doc), el('td', {}, type), el('td', {}, desc))))),
    el('p', { class: 'hint' }, `Files you can’t upload can be mailed, with your name and the employer’s name on them, to ${content.MAIL_EVIDENCE}.`));
  $('beforeSign').replaceChildren(
    el('p', {}, 'To have BOLI pursue a wage claim, the form asks you to “assign” your wages to BOLI and to agree to its settlement terms. Here is that wording, so you can read it and ask questions before your session. This page does not recommend signing or not signing.'),
    el('p', { class: 'label' }, 'Notice on the form ', el('span', { class: 'tag' }, 'seen on form')),
    el('blockquote', { id: 'assignmentNotice' }, content.ASSIGNMENT_NOTICE),
    el('p', { class: 'label' }, 'Sign-and-submit wording ', el('span', { class: 'tag' }, 'rule from form code; may differ from what is displayed')),
    el('div', { id: 'assignmentText' }, [...content.ASSIGNMENT_DIALOG, ...content.SIGNATURE_TEXT].map(t => el('blockquote', {}, t))),
    el('p', {}, 'Questions before deciding: BOLI at ', link(`tel:${content.PHONE.replaceAll('-', '')}`, content.PHONE), ` or ${content.EMAILS}; `,
      link(content.LINKS.attorneyList, 'BOLI’s list of attorneys for complainants'), ' (', link(content.LINKS.attorneyListSpanish, 'en español'), '); ',
      link(content.LINKS.lawHelp, 'Oregon Law Help'), '. These links don’t promise service or a result.'));
  $('limits').replaceChildren(...content.LIMITS.map(l => el('li', {}, l)));
  $('ratesList').replaceChildren(...RATE_PERIODS.map(p => el('li', {}, `${usDate(p.start)}–${usDate(p.end)}: Standard ${money(p.standard)}; Portland Metro ${money(p.portland)}; Nonurban ${money(p.nonurban)}.`)));
  const basis = $('payBasis');
  basis.replaceChildren(...Object.entries(content.PAY_BASIS).map(([v, b]) => el('option', { value: v }, b.label)));
}

function renderStops() {
  const box = $('stops');
  box.replaceChildren();
  const list = [...result.stops, ...result.routes];
  box.append(el('ul', {}, list.length ? list.map(s => el('li', {}, s.reason)) : el('li', {}, 'No stop point applies to what you entered.')));
  box.append(el('p', {}, 'Help that exists already: ',
    link(content.LINKS.wageClaim, 'BOLI wage claims'), '; BOLI help line ', link(`tel:${content.PHONE.replaceAll('-', '')}`, content.PHONE), '; ',
    link(content.LINKS.attorneyList, 'BOLI attorney list'), '; ', link(content.LINKS.lawHelp, 'Oregon Law Help'), '. BOLI’s form also offers help filling out paperwork as an accommodation. When you’re ready, ',
    link(content.LINKS.portal, 'BOLI’s complaint portal'), ' is where a claim is filed; this page never files or contacts anyone.'));
}

function refresh() {
  result = evaluate(account, localToday());
  renderReadback();
  renderSheet();
  renderStops();
  if ($('keepLocal').checked) localStorage.setItem(STORE_KEY, serializeAccount(account));
}

// ---------- actions ----------
function lastDate() {
  return account.days.map(d => d.date).filter(isRealDate).sort().at(-1);
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function wire() {
  for (const input of document.querySelectorAll('[data-path]')) {
    const key = input.dataset.path;
    input.addEventListener(input.type === 'checkbox' ? 'change' : 'input', () => {
      account[key] = input.type === 'checkbox' ? input.checked : input.value;
      if (key === 'workweekStartDay') renderAll(); else refresh();
    });
  }
  $('addDay').addEventListener('click', () => { const d = lastDate(); account.days.push(emptyDay(d ? addDays(d, 1) : '')); renderAll(); });
  $('addWeek').addEventListener('click', () => {
    const d = lastDate();
    for (let k = 1; k <= 7; k++) account.days.push(emptyDay(d ? addDays(d, k) : ''));
    renderAll();
  });
  $('repeatWeek').addEventListener('click', () => {
    const n = Number($('repeatN').value);
    if (!Number.isInteger(n) || n < 1 || n > 104) { $('repeatN').setCustomValidity('Use a whole number from 1 to 104.'); $('repeatN').reportValidity(); return; }
    $('repeatN').setCustomValidity('');
    account = repeatLastWeek(account, n); renderAll();
  });
  $('addRate').addEventListener('click', () => { account.rates.push(emptyRate()); renderAll(); });
  $('addPay').addEventListener('click', () => {
    const last = account.pay.at(-1);
    const p = emptyPay();
    if (last && isRealDate(last.to)) p.from = addDays(last.to, 1);
    account.pay.push(p); renderAll();
  });
  $('repeatPay').addEventListener('click', () => {
    const n = Number($('repeatPayN').value);
    if (!Number.isInteger(n) || n < 1 || n > 104) return;
    account = repeatLastPay(account, n); renderAll();
  });
  $('pasteApply').addEventListener('click', () => {
    const { days, unparsed } = parsePaste($('pasteText').value);
    account.days.push(...days);
    account.unparsed.push(...unparsed);
    $('pasteText').value = '';
    $('fileMessage').textContent = `Added ${days.length} day${days.length === 1 ? '' : 's'}${unparsed.length ? `; ${unparsed.length} line${unparsed.length === 1 ? '' : 's'} couldn’t be read and ${unparsed.length === 1 ? 'is' : 'are'} shown above the days` : ''}.`;
    renderAll();
  });
  $('issueDraft').addEventListener('input', () => {
    account.issueDraft = $('issueDraft').value.slice(0, ISSUE_LIMIT);
    refresh();
  });
  $('resetDraft').addEventListener('click', () => { account.issueDraft = null; $('issueDraft').value = issueDraft(result); refresh(); });
  $('printSheet').addEventListener('click', () => window.print());
  $('downloadText').addEventListener('click', () => {
    download('oregon-wage-preparation.txt', preparationText(result, content, currentDraft()), 'text/plain;charset=utf-8');
  });
  $('saveRecord').addEventListener('click', () => {
    download(`oregon-wage-record-${localToday()}.json`, serializeAccount(account), 'application/json');
    $('fileMessage').textContent = 'Saved to your device. Open it here later to continue.';
  });
  $('openRecord').addEventListener('change', async () => {
    const file = $('openRecord').files[0];
    if (!file) return;
    const parsed = parseSaved(await file.text());
    $('openRecord').value = '';
    if (parsed.error) { $('fileMessage').textContent = `${parsed.error} Nothing on the page was changed.`; return; }
    account = parsed.account;
    $('fileMessage').textContent = `Opened ${file.name}.`;
    renderAll();
  });
  $('keepLocal').addEventListener('change', () => {
    if ($('keepLocal').checked) localStorage.setItem(STORE_KEY, serializeAccount(account));
    else localStorage.removeItem(STORE_KEY);
  });
  $('clearAll').addEventListener('click', () => {
    if (!window.confirm('Clear everything you entered from this page and this browser? Save a file first if you want to keep it.')) return;
    localStorage.removeItem(STORE_KEY);
    $('keepLocal').checked = false;
    account = emptyAccount();
    $('fileMessage').textContent = 'Cleared from this page and this browser.';
    renderAll();
  });
}

renderStatic();
wire();
try {
  const stored = localStorage.getItem(STORE_KEY);
  if (stored) {
    const parsed = parseSaved(stored);
    if (parsed.account) { account = parsed.account; $('keepLocal').checked = true; $('fileMessage').textContent = 'Restored the entries kept in this browser. Use “Clear everything” to remove them.'; }
  }
} catch { /* storage unavailable: nothing is kept */ }
renderAll();
