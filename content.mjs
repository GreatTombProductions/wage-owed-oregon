// Fixed wording shared by the page and the plain-text download.
// Evidence classes describe how each item was observed on BOLI's public,
// logged-out complaint portal on 2026-10-06:
//   RENDERED       shown on screen;
//   FROM-PAGE-CODE read from the portal's public page code, not seen on screen;
//   UNVERIFIED     not established either way.

export const PORTAL_OBSERVED = '2026-10-06';

export const LINKS = {
  portal: 'https://complaints.boli.oregon.gov/',
  wageClaim: 'https://www.oregon.gov/boli/workers/Pages/wageclaim.aspx',
  paychecks: 'https://www.oregon.gov/boli/workers/Pages/paychecks.aspx',
  contact: 'https://www.oregon.gov/boli/about/pages/contact-us.aspx',
  attorneyList: 'https://www.oregon.gov/boli/about/Documents/20260424%20Attorney%20List%20Complainants%20ENG.pdf',
  attorneyListSpanish: 'https://www.oregon.gov/boli/about/Documents/20260424%20Attorney%20List%20Complainants%20SPN.pdf',
  lawHelp: 'https://oregonlawhelp.org/topics/work-employment/your-rights-under-wage-and-hour-laws-oregon',
  minimumWage: 'https://www.oregon.gov/boli/workers/Pages/minimum-wage.aspx',
  schedule: 'https://www.oregon.gov/boli/workers/Pages/minimum-wage-schedule.aspx',
  overtime: 'https://www.oregon.gov/boli/employers/Pages/overtime.aspx',
  breaks: 'https://www.oregon.gov/boli/workers/Pages/meals-and-breaks.aspx',
  publicRecords: 'https://www.oregon.gov/boli/about/Pages/public-records-request.aspx'
};

export const PHONE = '971-245-3844';
export const EMAILS = 'help@boli.oregon.gov (shown in the complaint portal) or boli_help@boli.oregon.gov (shown on the wage-claim page)';
export const MAIL_EVIDENCE = 'Wage and Hour Division, 1800 SW 1st Ave, Suite 500, Portland, OR 97201';

// BOLI's attachment types, in the portal's order (RENDERED). The portal lists
// "Written Wage Agreements" twice; it is listed once here.
export const ATTACHMENT_TYPES = [
  'Time Cards', 'W-2 Statements or Other Tax Forms', 'Shift Schedules', 'Employee Handbooks',
  'Attendance Rosters', 'Written Wage Agreements', 'Statements from Witnesses', 'Personal Time Records',
  'Employment Job Offer', 'Payroll Check Stubs', 'Newspaper Job Advertisement', 'Copies of Bad Checks', 'Other'
];

// What you might hold -> the attachment type it fits, with a description you can adapt.
export const DOCUMENT_MAP = [
  ['The daily hours record from this page', 'Personal Time Records', 'My day-by-day record of hours worked, made from my memory and records.'],
  ['Paystubs', 'Payroll Check Stubs', 'Paystubs for the pay periods in my claim.'],
  ['Schedules (photos, screenshots, app exports)', 'Shift Schedules', 'Posted or app schedules for the weeks I claim.'],
  ['Clock-in/clock-out records', 'Time Cards', 'Time clock records for the weeks I claim.'],
  ['Offer letter or text stating your pay rate', 'Employment Job Offer or Written Wage Agreements', 'Shows the pay rate I was promised.'],
  ['W-2 or other tax forms', 'W-2 Statements or Other Tax Forms', 'Shows the employer’s legal name and wages reported.'],
  ['A bounced paycheck', 'Copies of Bad Checks', 'Paycheck that was returned unpaid.'],
  ['Texts, emails, chat messages about hours or pay', 'Other', 'Messages with my employer about hours and pay.'],
  ['Written statements from coworkers', 'Statements from Witnesses', 'Statement from a coworker who saw my hours or pay.']
];

export const HAVE_READY = [
  ['Employer name exactly as it appears on your paycheck or W-2', 'The portal searches Oregon’s business registry by this name; a shop or brand name often differs from the legal name. For a franchise, search the franchise name. If it isn’t found, you can type the details yourself.'],
  ['Employer address, and the workplace address if different', 'Street, city and state are required. A paystub or W-2 usually shows the employer address.'],
  ['Employer phone, email and your supervisor’s name', 'Optional; give them if you know them.'],
  ['About how many people the employer has in Oregon and nationwide', 'The form asks for a range (1-5, 6-14, 15-20, 21-24, 25-49, 50+). An estimate is what is asked.'],
  ['Whether you were placed through a temp or staffing agency', 'If yes, the agency’s name and phone.'],
  ['Your position, and your job duties in 300 characters or fewer', ''],
  ['Your hire date', 'Wage dates cannot be earlier than this date on the form.'],
  ['How the job stands now', 'Still employed; gave notice; terminated; laid off; suspended; or resigned.'],
  ['Witnesses', 'First and last name, phone, email if known, and what they saw (up to 2,000 characters each).'],
  ['Each file you will upload', 'Every upload needs a type and a short description. Have the files on the device you will use.'],
  ['Your own contact details and any accommodation you need', 'You type these straight into BOLI’s form. This page never asks for them.']
];

export const HAVE_READY_NOTE = 'BOLI’s form has no save button and no worker account, so it has to be finished in one sitting. Closing the tab appears to lose what you typed.';

// Assignment and signature wording: notice RENDERED; dialog text FROM-PAGE-CODE.
export const ASSIGNMENT_NOTICE = 'In order for BOLI to pursue your wage claim, you must "assign" the wages owed to us to investigate on your behalf. We cannot process your wage claim without this assignment of wages. If you have questions, please call 971-245-3844.';
export const ASSIGNMENT_DIALOG = [
  'I certify that the information I have given on the Wage and Hour Division\'s online form is complete and correct to the best of my knowledge. I agree to allow the Wage and Hour Division to contact me, and I acknowledge that failure to respond to the Wage and Hour Division’s attempts to contact me may result in the closure of my inquiry.',
  'I hereby assign in trust to the Labor Commissioner of the State of Oregon all wages, whether penalty or otherwise, due to me from my past employer or any person legally responsible for the payment of my wages.',
  'By this statement I authorize the Labor Commissioner to equitably adjust and compromise the amount of wages owed to me, whether penalty or otherwise, due me from my previous employer or any person legally responsible for the payment of my wages.',
  'If the Bureau settles my claim and I receive the amount settled upon, I agree to give up any rights I may have to bring suit for additional wages or penalties.',
  'I state that the information submitted in this form is true and accurate to the best of my knowledge. I agree to immediately inform the Bureau if I obtain any payment for the wages I am claiming from the employer or any third party.'
];
export const SIGNATURE_TEXT = [
  'By entering your name above, you are signing this form electronically. You agree that your electronic signature has the same legal validity and effect as your handwritten signature on this document, and that it has the same meaning as your handwritten signature.',
  'I am aware that the information I submit in this form, including my contact information, will become subject to public records law.'
];

export const DUE_DATE_HELP = 'BOLI’s form asks “When were the wages due?” and requires a date on or after the last date owed. This page does not choose it. For wages from a regular pay period, it is usually the payday for that period. Final pay follows separate timing that depends on how the job ended and on notice; BOLI’s paychecks page explains it. If you are unsure, BOLI’s help line can explain which date fits.';

export const PARTIAL_PAYMENT_HELP = 'Here, “paid” means the gross wages your employer paid for these days. BOLI’s question “Partial payment received?” may instead mean money paid later toward what you are owed. If you received such a payment after asking, enter that amount yourself.';

// Situations that stop the calculation. The account is always kept.
export const SITUATIONS = {
  multipleEmployers: {
    label: 'These days were for more than one employer',
    reason: 'BOLI’s form names one employer per claim. Save this record, then make a separate record for each employer (remove the other employer’s days from each copy).',
    stop: true
  },
  under18: {
    label: 'I was under 18 when I did this work',
    reason: 'BOLI’s form asks about this separately and other rules can apply to minors. This page doesn’t cover it. BOLI’s help line can explain.',
    stop: true
  },
  publicWorks: {
    label: 'Construction work, or work on a public works project',
    reason: 'Prevailing-wage and construction rules are not covered here. BOLI handles prevailing wage separately; ask its help line or a lawyer.',
    stop: true
  },
  specialIndustry: {
    label: 'Farm, manufacturing or cannery, or hospital work',
    reason: 'These industries have their own overtime rules, which this page does not cover. Your record is kept; ask BOLI or a lawyer which rules apply.',
    stop: true
  },
  tipsTaken: {
    label: 'My employer kept, shared or pooled my tips',
    reason: 'What happened to your tips is a separate question this page does not calculate. The wage figures below still stand on their own; tips never count against hourly pay in Oregon. Ask BOLI about the tips.',
    stop: false
  }
};

export const PAY_BASIS = {
  unknown: { label: 'I’m not sure yet', reason: 'Choose how you were paid. If you are unsure whether you were hourly and non-exempt, BOLI’s help line can explain; being unsure does not mean you have no claim.' },
  'simple-hourly': { label: 'By the hour (no salary, piece rate or bonuses)' },
  salary: { label: 'Salary', reason: 'Salaried and exempt work follows rules this page does not cover. Your record is kept; ask BOLI or a lawyer. This limit does not mean you have no claim.' },
  piece: { label: 'Piece rate, day rate or commission', reason: 'Piece, day-rate and commission pay change how overtime is figured. This page does not cover them. Your record is kept; ask BOLI or a lawyer.' },
  bonus: { label: 'Hourly plus bonuses or other extra pay', reason: 'Bonuses and similar pay change the overtime rate. This page does not cover them. Your record is kept; ask BOLI or a lawyer.' }
};

export const LIMITS = [
  'This is a preparation sheet, not a claim. Nothing has been filed, received, accepted or recovered.',
  'Figures come from your own account. They are estimates under stated assumptions, not a decision about what you are owed.',
  'Covered: hourly, non-exempt work under the standard 40-hour weekly overtime rule, in workweeks that fall entirely within one verified minimum-wage period (July 2024 to June 2027). Weeks outside that are listed, never guessed.',
  'Not decided here: when wages were due, whether you are exempt, penalties, and whether to sign BOLI’s assignment. Those are yours, with help if you want it.',
  'Final-pay penalties are not added. BOLI describes conditions, caps and exceptions for them.',
  'BOLI’s accepted file types and sizes for uploads were not checked. This sheet can be printed, saved as PDF from the print dialog, or saved as plain text.',
  'BOLI’s portal can change. The field order and wording here were read from its public pages on 2026-10-06.'
];
