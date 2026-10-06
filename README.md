# Wage Owed Oregon

[Use it](https://greattombproductions.github.io/wage-owed-oregon/)

A free, browser-only page for Oregon hourly workers who think they were underpaid. You enter the days you worked, as well as you remember them. The page builds what Oregon's Bureau of Labor and Industries (BOLI) online wage claim asks for and leaves the decisions to you. Nothing you type is sent anywhere.

Oregon does not allow tip credits: tips cannot be counted against hourly pay, so they are left out of every figure.

## What you enter

- **Days worked**: hours, or start and end times (overnight shifts count on the start date). Rows can be marked approximate, and hours you don't know can stay empty. A split shift is two rows on the same date. You can paste lines from a timekeeping app or notes (`2026-06-01 8`, `6/2/2026 9am-5:30pm`). Lines that can't be read are shown back, not dropped. "Same as last week" repeats a week.
- **Paychecks**: the first and last day each one covered, and the gross amount before deductions (0 if you weren't paid).
- **About the job**: how you were paid, wage region, the day your employer's workweek starts (optional unless some 7-day stretch goes over 40 hours), hire date, and any promised hourly rates with the dates they started.

## What you get

A preparation sheet you can print, save as PDF from the print dialog, or download as plain text:

- **A. Daily hours record**: each day's hours, times, break minutes and notes, with approximate entries marked and weekly totals. BOLI's form asks for "an explanation or calendar detailing the hours worked each day of your claim"; this can be uploaded as its *Personal Time Records* type or mailed.
- **B. The form's Wage Claim questions, in order**: the type of missing wages (suggested), overtime rate, the two-year date fact, first and last dates owed, rate of pay, and **total wages owed**. Every other answer is marked "you supply this". It also gives an editable *Describe the Issue* draft of at most 300 characters, and an explanation of "When were the wages due?" (you choose that date).
- **C. Have-ready list** for finishing BOLI's form in one sitting (it has no save button): the employer's name exactly as on the paycheck or W-2, addresses, the employee-count range, hire date, witnesses, and which upload type fits each document.
- **D. BOLI's assignment and settlement wording**, shown before you meet it at the end of the form, with places to ask questions. The page doesn't recommend signing or not signing.
- **E. Where the page stops**, with a reason and a route to help.

Each form item is tagged with how it was observed on BOLI's public form on 2026-10-06: *seen on form*, or *rule from form code* (read from the page's code, not seen on screen). Accepted upload file types and sizes were not checked.

## How figures are worked out

Each workweek is figured on its own: hours, plus worked-through meal or rest minutes added once if you say they aren't already counted. The rate is your promised rate or the region's minimum wage, whichever is higher, with 1.5 times that rate after 40 hours. Each paycheck is then compared with what was due for the days it covered. Paychecks are settled separately, so an overpaid period does not cancel an underpaid one. The total is wages only. Final-pay penalties are not added.

A workweek is left out of the total, with its reason listed, when:

- it isn't entirely inside one verified minimum-wage period, including a week that crosses July 1;
- your promised rate changed during that week;
- some of its hours aren't known;
- what you were paid for its days isn't entered;
- a paycheck joins it to a week that can't be figured.

The remaining total is labelled "for N of M workweeks". Under $50 is stated plainly; BOLI's form requires at least $50, and the page doesn't round up.

Figures stop, but your record and daily hours record stay, for: salary or exempt work, piece/day-rate/commission pay, bonuses, more than one employer, work under 18, construction or public works, and farm, manufacturing/cannery or hospital overtime rules. Being unsure how you were paid also stops figures; that does not mean you have no claim. Tips kept or pooled by the employer are noted as a separate question; the wage figures still stand.

Problems are named, not guessed at. These include impossible or future dates, a day over 24 hours, work before the hire date you gave, and unclear times such as `10-6am`.

## Keeping your work

BOLI's form has no save or resume. Here you can save your record as a file on your device and open it later. You can also opt in to keeping it in this browser, with a visible "clear everything" button. Don't keep it in the browser on a shared or public computer. Nothing is stored unless you choose one of these.

## Limits

- This is a preparation sheet, not a claim. Nothing is filed, received, accepted or recovered, and no one is contacted.
- Figures are estimates from your own account under stated assumptions, not a decision about what you are owed.
- When wages were due, exemption, penalties and whether to sign BOLI's assignment are not decided here.
- BOLI's form can change. Field order and wording come from one day's read-only observation of its public pages.
- No accounts, API keys, monitoring or support subscription.

## Help that already exists

[BOLI wage claims](https://www.oregon.gov/boli/workers/Pages/wageclaim.aspx) (help line 971-245-3844; `help@boli.oregon.gov` in the complaint portal, `boli_help@boli.oregon.gov` on the wage-claim page). BOLI's form can offer help filling out paperwork as an accommodation. [BOLI's attorney list for complainants](https://www.oregon.gov/boli/about/pages/contact-us.aspx). [Oregon Law Help](https://oregonlawhelp.org/topics/work-employment/your-rights-under-wage-and-hour-laws-oregon). These links don't promise service or a result.

## Sources

Minimum wage periods were checked against BOLI's [schedule](https://www.oregon.gov/boli/workers/Pages/minimum-wage-schedule.aspx) on **October 6, 2026**:

| Period | Standard | Portland Metro | Nonurban |
|---|---|---|---|
| July 2024–June 2025 | $14.70 | $15.95 | $13.70 |
| July 2025–June 2026 | $15.05 | $16.30 | $14.05 |
| July 2026–June 2027 | $15.55 | $16.80 | $14.55 |

[Overtime](https://www.oregon.gov/boli/employers/Pages/overtime.aspx), [meals and breaks](https://www.oregon.gov/boli/workers/Pages/meals-and-breaks.aspx) and [paychecks](https://www.oregon.gov/boli/workers/Pages/paychecks.aspx) were checked September 30, 2026. The [complaint portal](https://complaints.boli.oregon.gov/) was read logged-out on October 6, 2026, without creating an account, a draft or a submission. [Source receipts](https://greattombproductions.github.io/wage-owed-oregon/sources.json) identify each capture by SHA-256. There are no automatic freshness checks.

## Development and verification

Serve `site/` over HTTP (ES modules need it): `python3 -m http.server --directory site 8000`.

- `node --test tests/test_calculator.mjs tests/test_journey.mjs`: single-week engine (periods, boundaries, inclusion semantics), plus journey cases. The journey cases cover uneven weeks across July 1, approximate round trips, 14-hour days and split shifts, the hire-date correction, totals under $50, out-of-coverage weeks, the 300-character draft, save and reopen, and pasted lines.
- `python3 tests/run_browser_smoke.py`: drives the page in a browser. It checks paste, repeat, paychecks, the field sheet, the plain-text and print outputs, corrections and stops, save/clear/reopen and opt-in keeping. It also confirms that no request carries entries. Requires Playwright with Chromium available to Node.
- `SMOKE_BASE=https://greattombproductions.github.io/wage-owed-oregon/ python3 tests/run_browser_smoke.py` runs the same check against the live page.
- `bash deploy.sh --assemble-only`: local assembly only.

Deployment runs the tests and a hygiene lint, then pushes **fast-forward** to the existing public repository. Browser tests find defects; they don't show that the page reduces anyone's work or that BOLI accepts its output.

## License

MIT.
