/* =========================================================
   ScamEye – tests/rules.test.js
   Checks the keyword rules (rules.js) against made-up messages.

   HOW TO RUN (needs Node.js, nothing to install):
       node tests/rules.test.js

   WHAT IT CHECKS
   - Scam messages written like current public warnings
     (fake NERSI ₦50,000 grants, fake NELFUND portals, chain messages)
   - Genuine-looking messages that must NOT be called a scam
   - The six example buttons on the page

   All messages are made up. No real names, numbers or links.
   "notscam" means "safe" or "suspicious" are both fine.
   ========================================================= */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Load rules.js and examples.js the same way the browser does (they set window.*)
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const file of ["rules.js", "examples.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), sandbox);
}
const Rules = sandbox.window.ScamEyeRules;
const EXAMPLES = sandbox.window.SCAMEYE_EXAMPLES;

const CASES = [
  // --- Current scam patterns (from public warnings, Nov 2026) ---
  ["scam", "FGN has selected you to receive N50,000. Confirm your eligibility here: https://nersi-grant.vercel.app"],
  ["scam", "Apply now to receive your N50,000 NERSI grant. Enter your name, phone number and bank details."],
  ["scam", "I have received my N50,000. Get yours here: https://fg-nersi.site and forward to your friends and family."],
  ["scam", "Your N50,000 payment is pending. Complete human verification: share this link to 5 WhatsApp groups or 15 contacts."],
  ["scam", "Pay activation fee of N3,000 to unlock your NERSI payment."],
  ["scam", "NERSI: N500,000 has been disbursed to you. Activate your wallet here: https://nersi-wallet.top"],
  ["scam", "Dear Customer, your BVN has been flagged for deactivation. Click the link to revalidate or call now. Failure to respond within 24 hours will result in permanent account suspension."],
  ["scam", "National Youth Empowerment Fund 2026: cash grants for ages 13 to 65. Check eligibility and share the link."],
  ["scam", "NELFUND: new 2026 student loan registration portal is open. Apply here: https://nelfund-student-loan-2026.po-rt-al.com"],
  ["scam", "Empowerment program funding for all Nigerians. Send me a message on Messenger to apply."],
  ["scam", "M-PESA reversal: I sent you money by mistake, kindly reverse it to this number."],

  // --- Student scams with different wording ---
  ["scam", "FG palliatives for students! Pay N2,000 to register."],
  ["scam", "Student grant approved. Pay a token of 1500 naira to receive it."],
  ["scam", "Apply for the student empowerment. Send your account details today."],
  ["scam", "NELFUND student loan: send your NIN and BVN to this WhatsApp number."],
  ["scam", "N50,000 for students. Click https://fg-students.vercel.app and enter your details."],
  ["scam", "Send 2,000 naira to activate your scholarship."],
  ["scam", "Students grant: drop your acct number."],
  ["scam", "FG STUDENT EMPOWERMENT: All students can get N50,000. Fill your personal details to claim: https://fg-student-grant.vercel.app. Share to 10 groups."],
  ["scam", "Federal Government is giving N50,000 empowerment to students. Send your full name, NIN and bank details to apply."],
  ["scam", "You are eligible for the 2026 bursary of N80,000. Pay N1,500 to process your form before Friday."],
  ["scam", "Grant of N50,000 approved. Do not share this with anyone. Pay N1,500 to receive it."],
  ["scam", "Don't share this, pay N1,500 to receive your grant."],
  ["scam", "No need to pay N5,000 today, just pay N1,500 for your grant."],
  ["scam", "Pay N1,500 to receive your student grant."],
  ["scam", "Federal palliative for students: pay N2,000 to register."],
  ["scam", "Student grant: enter your BVN at https://nelf-grant.vercel.app portal."],
  ["scam", "Student grant: enter your BVN on portal https://nelf.gov.ng.claim-now.com"],
  ["scam", "Scholarship portal: enter your BVN and OTP now."],
  ["scam", "Grant! Drop your NIN and BVN on WhatsApp portal."],
  ["scam", "Student grant: enter your BVN to get N50,000."],

  // --- Real programmes can need ID on an official portal: careful, not "scam" ---
  ["suspicious", "NELFUND loan and grant needs NIN and BVN on the official portal."],
  ["suspicious", "Upload your NIN slip on the school portal to complete your scholarship registration."],
  ["suspicious", "Apply for the grant with your NIN at https://portal.nelf.gov.ng before Friday."],
  ["suspicious", "Scholarship portal is open: enter your BVN. Never send your BVN to anyone on WhatsApp."],
  ["suspicious", "The 2026 scholarship is open. Fill your personal details on the school portal before 30 January."],

  // --- Genuine-looking messages that must not be flagged as scams ---
  ["safe", "There is no need to pay N1,000 to anyone for the scholarship."],
  ["safe", "Reminder: bursary forms are at Student Affairs. No payment is required."],
  ["safe", "Scholarship forms are free. Never pay N2,000 to anyone for a form."],
  ["safe", "The department will share palliative items at 2pm. Come with your student ID card."],
  ["safe", "I sent you the notes by mistake, please ignore."],
  ["safe", "Class rep: the N-Power lecture holds at 10am in LT2. Come with your notes."],
  ["safe", "Hi, I'll send you N5,000 for the textbook tomorrow."],
  ["notscam", "Please share this prayer with 10 friends."],
  ["notscam", "Your NELFUND application is approved. Log in at https://portal.nelf.gov.ng to view the status."],
  ["notscam", "News: NELFUND warns students about fake portals https://www.legit.ng/education/123"],
  ["notscam", "Congratulations on your scholarship! The award letter is at the faculty office."],
  ["notscam", "FG announces new student loan disbursement. Read more at https://nelf.gov.ng"],
  ["notscam", "Your scholarship payment of N100,000 has been paid into your school account. Check your portal at https://portal.unilag.edu.ng"],
  ["notscam", "Forward this to all your friends: free health check at the school clinic on Friday."]
];

// The six example buttons on the page (examples.js), in order
const EXAMPLE_VERDICTS = ["scam", "scam", "scam", "scam", "suspicious", "safe"];

let passed = 0;
const failures = [];

function expectVerdict(want, text, label) {
  const got = Rules.check(text).verdict;
  const ok = want === "notscam" ? got !== "scam" : got === want;
  if (ok) passed++;
  else failures.push("  ✗ " + (label || text.slice(0, 70)) + "\n      wanted " + want + ", got " + got);
}

CASES.forEach(function (c) { expectVerdict(c[0], c[1]); });
EXAMPLES.forEach(function (ex, i) { expectVerdict(EXAMPLE_VERDICTS[i], ex.text, "Example button: " + ex.label); });

const total = CASES.length + EXAMPLES.length;
console.log("ScamEye rule tests: " + passed + " / " + total + " passed" +
  " (" + CASES.length + " messages + " + EXAMPLES.length + " example buttons)");
if (failures.length) {
  console.log(failures.join("\n"));
  process.exit(1);
}
