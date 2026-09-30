# Wage Owed Oregon

[Use the calculator](https://greattombproductions.github.io/wage-owed-oregon/)

A free, browser-only estimate for Oregon hourly workers. Oregon does not allow tip credits: tips cannot reduce the employer's hourly wage obligation.

## Supported situations

- Hourly, non-exempt work under the standard 40-hour workweek overtime rule, at one rate, without bonuses or other regular-rate adjustments.
- Whole employer workweeks entirely within **July 1, 2025–June 30, 2026** or **July 1, 2026–June 30, 2027**. The work date chooses the annual minimum wage; rates are not extrapolated. A workweek crossing July 1 needs separate review.
- Identical repeated weeks only; calculate uneven weeks separately. Enter **gross wages before deductions**, not take-home pay, and exclude tips.
- Meal/rest minutes are added only after you say they were not already included. Unknown or partial inclusion pauses calculation. An interrupted unpaid meal uses the whole meal period, not just minutes spent performing duties.

Unknown dates, essential amounts, inclusion semantics or pay coverage never become a confident zero. Unsupported situations do **not** mean no claim exists. Salary, exempt work, multiple rates, bonuses, agriculture, manufacturing, hospital-specific rules and other special cases need review outside this calculator.

## Results and limits

The headline is **estimated wage shortfall only**. The optional final-pay penalty is an illustrative `8 × rate × days` formula capped at 30 days, **before** eligibility, notice, caps and exceptions. It is not added to wages, does not determine the final-pay due date, and is not a determination of entitlement. BOLI describes circumstances that can cap penalties at 100% of unpaid wages.

A zero estimate does not certify that an employer followed all rules. This is not legal advice, a wage-claim form, automatic filing or a promise of money recovered.

**Download my inputs and estimate** saves a plain-text note, including unresolved inputs and the reason an estimate is unavailable. Entries are not saved automatically; download before closing or reloading. The note is not known to be accepted/imported by BOLI's portal. Nothing is submitted and no entered data leaves the browser. No accounts, API keys, monitoring or support subscription.

## Choose the next step

Keep schedules, time records, paystubs and relevant messages. The [official BOLI wage-claim page](https://www.oregon.gov/boli/workers/Pages/wageclaim.aspx) links its Complaint Resolution Center and lists `boli_help@boli.oregon.gov` / `971-245-3844` for questions. Check current instructions before sharing records. [Oregon Law Help](https://oregonlawhelp.org/topics/work-employment/your-rights-under-wage-and-hour-laws-oregon) explains rights and navigation to help. Assistance availability and successful claims are not guaranteed by these links.

## Sources and applicability

Rules checked **September 30, 2026** against Oregon Bureau of Labor & Industries:

- [Minimum wage schedule](https://www.oregon.gov/boli/workers/Pages/minimum-wage-schedule.aspx): Standard/Portland/Nonurban $15.05/$16.30/$14.05 from July 2025; $15.55/$16.80/$14.55 from July 2026.
- [Minimum wage and regions](https://www.oregon.gov/boli/workers/Pages/minimum-wage.aspx).
- [Overtime](https://www.oregon.gov/boli/employers/Pages/overtime.aspx): standard weekly overtime and regular-rate limitations.
- [Meals and breaks](https://www.oregon.gov/boli/workers/Pages/meals-and-breaks.aspx): paid rest periods and whole payable interrupted meals.
- [Paychecks](https://www.oregon.gov/boli/workers/Pages/paychecks.aspx): final-pay penalty conditions, caps and exceptions.

[Source receipts](https://greattombproductions.github.io/wage-owed-oregon/sources.json) identify public-page captures by SHA-256 and distinguish retrieval from legal applicability. No automatic freshness checks or indefinite rule-maintenance promise.

## Development and verification

Serve `site/` over HTTP (ES modules require HTTP): `python3 -m http.server --directory site 8000`.

- `node --test tests/test_calculator.mjs` — arithmetic, exact period boundaries, unknown inputs and inclusion semantics.
- `python3 tests/run_browser_smoke.py` — staged browser, downloads and no entered-data requests. Requires Playwright/Chromium available to Node.
- `SMOKE_BASE=https://greattombproductions.github.io/wage-owed-oregon/ python3 tests/run_browser_smoke.py` — live receiver.
- `bash deploy.sh --assemble-only` — local assembly only, no GitHub mutation; prints the unique staging directory.

Deployment runs tests and hygiene lint, copies all site assets, README, MIT license and `.nojekyll`, then commits/pushes **fast-forward** from the existing public repository. It does not force-push or erase history. Browser tests expose defects; they do not establish human benefit or institutional acceptance.

## License

MIT.
