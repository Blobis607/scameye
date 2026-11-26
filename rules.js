/* =========================================================
   ScamEye – rules.js  (the Week 1 "basic check")

   HOW IT WORKS, IN SIMPLE WORDS
   1. We keep a list of RULES. Each rule is a pattern of words
      that scammers often use (like "within 24 hours" or "BVN").
   2. We look for every rule inside the message.
   3. Each rule we find adds points. More points = more danger.
   4. We turn the points into a verdict: "scam", "suspicious"
      or "safe", and write a simple explanation.

   The result has EXACTLY the same shape the Week 2 AI will
   return, so the rest of the app won't need to change.
   ========================================================= */

(function () {
  "use strict";

  /* ---------- 1. The rules ----------
     category: which kind of trick it is
     weight:   how many danger points it adds
     pattern:  the words to look for (a "regular expression";
               \b means "start/end of a word", i means "ignore
               capital letters", g means "find all of them")
     reason:   the short reason shown when the user taps it   */
  const RULES = [
    // Asking for secret details
    { category: "sensitive", weight: 3,
      pattern: /\b(BVN|PIN|OTP|CVV|NIN|password|passcode|card details|card number|login details|token code)\b/gi,
      reason: "Asks for secret details. Real banks never ask for these by SMS or WhatsApp." },

    // Rushing you
    { category: "urgency", weight: 2,
      pattern: /\bwithin\s+\d+\s*(hours?|hrs?|minutes?|mins?|days?)\b/gi,
      reason: "Rushes you with a deadline so you don't stop to think." },
    { category: "urgency", weight: 2,
      pattern: /\b(immediately|urgent|urgently|asap|right now|now now|sharp sharp)\b/gi,
      reason: "Pushes you to act fast." },
    { category: "urgency", weight: 2,
      pattern: /\b(act now|today only|last chance|final (notice|warning)|offer ends today|before midnight|do not ignore|don'?t ignore)\b/gi,
      reason: "Pressure words to make you panic." },

    // Threats to block your account
    { category: "block", weight: 3,
      pattern: /\b(account|card|line|sim|wallet|atm)\s+(will|would|has|have|is|may|go)\s+(be\s+|been\s+)?(blocked|block|suspended|deactivated|restricted|closed|frozen|disabled)\b/gi,
      reason: "Threatens to block your account to scare you." },

    // "You have won"
    { category: "won", weight: 3,
      pattern: /\b(you\s+have|you've|you)\s+(just\s+)?(won|been\s+selected|been\s+chosen)\b/gi,
      reason: "Says you won or were picked, often for something you never entered." },
    { category: "won", weight: 3,
      pattern: /\b(has|have)\s+(selected|chosen|picked|shortlisted)\s+you\b/gi,
      reason: "Says an organisation picked you, often for money you never applied for." },
    { category: "won", weight: 2,
      pattern: /\bcongratulations?\b/gi,
      reason: "Surprise 'congratulations' is a common scam opener." },
    { category: "won", weight: 2,
      pattern: /\bclaim\s+(your\s+)?(prize|reward|bonus|gift|winnings?|money|cash)\b/gi,
      reason: "Asks you to 'claim' a prize." },
    { category: "won", weight: 2,
      pattern: /\bfree\s+(data|airtime|money|cash|recharge|gift)\b/gi,
      reason: "Offers free data, airtime or money as bait." },

    // Paying to unlock money, a prize or a job
    { category: "fee", weight: 3,
      pattern: /\b(processing|registration|activation|clearance|admin|administrative|training|form|verification|unlock|release|delivery|transfer)\s+fee\b/gi,
      reason: "Asks you to pay a fee first. Real prizes, loans and jobs don't charge you." },
    { category: "fee", weight: 3,
      pattern: /\bpay\s+(a\s+|the\s+)?(small\s+|token\s+)?(fee|charge|token)\b/gi,
      reason: "Asks you to pay money before you get anything." },

    // "Wrong transfer, send it back"
    { category: "sendback", weight: 3,
      pattern: /\b(mistakenly|wrongly|erroneously|accidentally)\s+(sent|transferred|credited|paid)\b/gi,
      reason: "The 'wrong transfer' story. The alert is often fake." },
    { category: "sendback", weight: 3,
      pattern: /\b(send|return|refund|transfer)\s+(it|am|the\s+money|the\s+funds?|my\s+money)\s+back\b/gi,
      reason: "Asks you to send money 'back'. Check your real balance first." },
    { category: "sendback", weight: 3,
      pattern: /\b(sent|transferred|paid|credited)\s+(you\s+)?(money|cash|airtime|(N|NGN|₦)\s?\d[\d,]*k?|\d[\d,]*\s*naira)\s+(\S+\s+){0,3}?by\s+mistake\b/gi,
      reason: "Says money was sent to you by mistake. The alert is often fake." },
    { category: "sendback", weight: 4,
      pattern: /\b(reverse|refund)\s+(it|am|the\s+money|the\s+funds?|the\s+transaction|the\s+transfer)\b/gi,
      reason: "Asks you to 'reverse' a payment. Check your real balance first." },
    { category: "sendback", weight: 3,
      pattern: /\bwrong\s+(transfer|transaction)\b/gi,
      reason: "The 'wrong transfer' trick." },

    // Private "agent" instead of the official company
    { category: "agent", weight: 2,
      pattern: /\b(our|the|my)\s+(agent|account officer|manager|admin)\s+on\s+whatsapp\b/gi,
      reason: "Sends you to a private 'agent', not the official company line." },

    // Keep it secret
    { category: "secrecy", weight: 2,
      pattern: /\b((don'?t|do\s+not)\s+tell\s+(anyone|anybody)|keep\s+(this|it)\s+(secret|private|confidential))\b/gi,
      reason: "Tells you to keep it secret, so nobody can warn you." },

    // "Mummy, it's me, I'm using my friend's phone" (pretending to be family)
    { category: "impersonation", weight: 3,
      pattern: /\b(my\s+friend'?s?\s+phone|friend\s+phone|(this|dis)\s+is\s+my\s+new\s+number|my\s+(phone|own)\s+(fall|fell|spoil|spoilt|got\s+spoilt|was\s+stolen|don\s+spoil)|i\s+go\s+explain\s+later|(i\s+)?will\s+explain\s+later)\b/gi,
      reason: "Says they're using a different phone. Scammers pretend to be family this way." },
    { category: "impersonation", weight: 2,
      pattern: /\bsend\s+\S+\s+to\s+(this|dis)\s+(number|account)\b/gi,
      reason: "Asks you to send money to a new number or account." },

    // Emotional story
    { category: "emotional", weight: 1,
      pattern: /\b(hospital|surgery|accident|emergency)\b/gi,
      reason: "Uses a sad story to rush you." },

    // Easy money / investment
    { category: "investment", weight: 3,
      pattern: /\b(double\s+your\s+money|guaranteed\s+(profit|returns?|income)|100%\s+profit|risk[-\s]free\s+investment)\b/gi,
      reason: "Promises easy or guaranteed money. No real investment is guaranteed." }
  ];

  /* ---------- 2. Link checks ----------
     A link is only flagged if it looks dodgy. */
  const LINK_PATTERN = /\b(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9][a-z0-9-]*\.(?:com\.ng|com|ng|xyz|top|club|online|site|info|buzz|icu|live|link|ly|me|co|cc|tk|gq|ml)(?:\/[^\s]*)?/gi;
  const SHORTENERS = /^(?:https?:\/\/)?(?:www\.)?(bit\.ly|tinyurl\.com|cutt\.ly|t\.co|is\.gd|rb\.gy|shorturl\.at|tiny\.cc|ow\.ly|rebrand\.ly)\b/i;
  const RISKY_ENDINGS = /\.(xyz|top|club|online|site|info|buzz|icu|live|link|cc|tk|gq|ml)(\/|$)/i;
  const BAIT_WORDS = /(verify|verification|secure|update|login|bonus|promo|claim|reward|unlock|bvn)/i;

  function checkLink(url) {
    if (SHORTENERS.test(url)) return "Short link that hides where it really goes.";
    if (/^https?:\/\/\d{1,3}(\.\d{1,3}){3}/.test(url)) return "Link uses numbers instead of a real website name.";
    if (RISKY_ENDINGS.test(url)) return "Link has an unusual ending, not your bank's real website.";
    const domain = url.replace(/^https?:\/\//i, "").split("/")[0];
    if (BAIT_WORDS.test(domain) && domain.indexOf("-") !== -1) return "Fake-looking website name made to look official.";
    if (/^http:\/\//i.test(url) && BAIT_WORDS.test(url)) return "Unsafe link (no https) asking you to log in or update.";
    return null; // looks normal – don't flag it
  }

  /* ---------- 3. Words for the explanation ----------
     One sentence per kind of trick, in English and Pidgin,
     plus a "what to do" tip. */
  const INFO = {
    student: {
      en: "It offers students free money, then asks for something from you. That is a common way to steal details or collect fees.",
      pcm: "Dem dey promise students free money, then dey ask you for something. Na so dem dey take thief details or collect money.",
      step: "Confirm with your Student Affairs office or the programme's official website before you fill or pay anything."
    },
    lookalike: {
      en: "It uses the name of a government agency or bank, but the link isn't their official website.",
      pcm: "Dem use government or bank name, but the link no be dia official website.",
      step: "Government sites in Nigeria end in .gov.ng. Type the official address yourself instead of tapping the link."
    },
    chain: {
      en: "It tells you to forward it to groups or friends to get money. Real programmes never ask you to do that.",
      pcm: "Dem say make you forward am give groups or friends before you collect money. Real programme no dey do like dat.",
      step: "Don't forward it. Warn the group that it's a scam instead."
    },
    studentid: {
      en: "It mentions your ID or bank details for student money. Some real programmes need these, but only on their official portal.",
      pcm: "Dem mention your ID or bank details for student money. Some real programme need am, but na only for dia official portal.",
      step: "Type the official website address yourself. Never send your ID or bank details by chat, SMS or a forwarded link."
    },
    sensitive: {
      en: "It asks for secret details like your BVN, PIN, OTP or password. Real banks never ask for these by SMS or WhatsApp.",
      pcm: "Dem dey ask for your secret things like BVN, PIN, OTP or password. Real bank no go ever ask you for dem for SMS or WhatsApp.",
      step: "Never share your PIN, OTP, BVN or password, not even with someone who says they work at your bank."
    },
    sendback: {
      en: "It uses the 'wrong transfer' trick: a fake credit alert, then a story begging you to send the money back.",
      pcm: "Na the 'wrong transfer' trick be dis: dem go send fake alert, then beg you make you send 'their' money back.",
      step: "Check your real balance in your bank app or with your bank. Don't trust the SMS alert alone."
    },
    fee: {
      en: "It asks you to pay a fee before you get a prize, money or a job. Real ones never charge you to receive.",
      pcm: "Dem want make you pay money first before you collect prize, money or work. Real job or promo no dey collect money from you.",
      step: "Don't pay any 'fee' to receive a prize, loan or job."
    },
    block: {
      en: "It threatens to block your account to scare you into acting fast.",
      pcm: "Dem dey threaten say dem go block your account make fear catch you.",
      step: "Your bank won't block you by text. Call the number on the back of your card to confirm."
    },
    link: {
      en: "The link doesn't look like a real company website. Opening it could steal your details.",
      pcm: "The link no resemble real company website. If you open am, dem fit steal your details.",
      step: "Don't open the link. If you already did, don't type any details there."
    },
    won: {
      en: "It says you won or were selected, often for something you never entered. That's an old trick.",
      pcm: "Dem talk say you don win or dem don pick you, for something wey you no even enter. Na old trick be dat.",
      step: "If you didn't enter a promo, you didn't win one."
    },
    investment: {
      en: "It promises easy or guaranteed money. No real investment is guaranteed.",
      pcm: "Dem dey promise easy money or say profit sure. No real investment get sure profit.",
      step: "Before investing, check if the company is registered with the SEC Nigeria."
    },
    urgency: {
      en: "It rushes you so you don't have time to think or ask someone.",
      pcm: "Dem dey rush you make you no get time think or ask person.",
      step: "Slow down. A real company will still be there tomorrow."
    },
    agent: {
      en: "It sends you to a private 'agent' instead of the official company.",
      pcm: "Dem dey send you go meet one private 'agent' instead of the real company.",
      step: "Only use contact numbers from the company's official website or your card."
    },
    secrecy: {
      en: "It tells you to keep it secret, so nobody can warn you.",
      pcm: "Dem talk say make you no tell anybody, so nobody go fit warn you.",
      step: "Tell someone you trust before you do anything."
    },
    impersonation: {
      en: "It claims to be a family member using someone else's phone and asks for money. Scammers do this to make you send money without checking.",
      pcm: "Dem dey pretend say na your pikin or family wey dey use another person phone, then dem ask for money. Na so scammers dey take collect money quick quick.",
      step: "Call your family member on their OLD number, or ask a question only they can answer, before you send anything."
    },
    emotional: {
      en: "It uses a sad or scary story to make you act with your heart, not your head.",
      pcm: "Dem dey use sad story pull your heart make you act quick without thinking.",
      step: "Call the person on a number you already know to check the story."
    }
  };

  // Most serious first: the explanation talks about these first
  const ORDER = ["student", "lookalike", "chain", "studentid", "sensitive", "sendback", "impersonation", "fee", "block", "link", "won", "investment", "urgency", "agent", "secrecy", "emotional"];

  /* ---------- 4. The main check ---------- */
  function check(message) {
    const text = String(message || "");
    const flags = [];          // red flags we will show
    const seenText = {};       // so we don't list the same words twice
    const found = {};          // which categories we found
    let score = 0;

    // If the message itself warns "never share your OTP", mentioning OTP is not a red flag.
    const isWarning = /\b(never|do\s+not|don'?t)\s+(share|give|disclose)\b/i.test(text);

    function addFlag(words, reason) {
      const key = words.toLowerCase();
      if (seenText[key]) return;
      seenText[key] = true;
      flags.push({ text: words, reason: reason });
    }

    // a) Go through every rule
    RULES.forEach(function (rule) {
      if (rule.category === "sensitive" && isWarning) return;
      rule.pattern.lastIndex = 0;
      const matches = text.match(rule.pattern);
      if (!matches) return;
      score += rule.weight;              // count each rule once
      found[rule.category] = true;
      matches.forEach(function (m) { addFlag(m, rule.reason); });
    });

    // b) Check the links
    const links = text.match(LINK_PATTERN) || [];
    links.forEach(function (raw) {
      const url = raw.replace(/[.,!?)\]]+$/, ""); // drop full stop at the end
      const problem = checkLink(url);
      if (problem) {
        if (!found.link) score += 3;
        found.link = true;
        addFlag(url, problem);
      }
    });

    let officialIdRequest = false;

    // Shared helpers: website names in the message, and money amounts
    const hosts = text.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi) || [];
    const officialHosts = hosts.every(function (h) { return /\.(gov|edu)\.ng$/i.test(h); });
    const hasMoney = /(\b(N|NGN)|₦)\s?\d[\d,]*(\.\d+)?k?\b|\b\d[\d,]*\s*(naira|k)\b/i.test(text);

    // Look-alike link: an official name, but the link isn't a .gov.ng website
    const brand = text.match(/\b(FGN|FG|federal\s+government|CBN|central\s+bank|NELFUND|NERSI|N-?Power|NDDC|NIMC|JAMB|EFCC)\b/i);
    if (brand && hosts.length > 0 && !officialHosts) {
      const act = /\b(apply|register|claim|confirm|verify|activate|update|login|log\s+in|enter|get\s+yours|eligibility)\b/i.test(text);
      score += act ? 7 : 3;
      found.lookalike = true;
      addFlag(brand[0], "Uses an official name, but the link isn't an official .gov.ng website.");
    }

    // Chain message: forward it to groups or friends to get money
    const chain = text.match(/\b(share|forward|send)\s+(it\s+|this\s+|the\s+)?(link\s+|message\s+)?(to|with)\s+(\d+|five|ten|all|your)\s+(whats\s?app\s+)?(groups?|friends|contacts|people|family)\b/i);
    if (chain) {
      score += hasMoney ? 7 : 2;
      found.chain = true;
      addFlag(chain[0], "Real programmes never ask you to forward a message to get paid.");
    }

    // Student scam pack: a BAIT (free student money) plus an ASK
    if (/\b(empowerment|bursary|bursaries|scholarships?|grants?|palliatives?|NERSI|NELFUND|N-?Power|student\s+loans?)\b/i.test(text) ||
        /\b(selected|chosen|shortlisted)\s+(you\s+)?(to\s+receive|for)\b/i.test(text) ||
        /((\b(N|NGN)|₦)\s?\d[\d,]*k?|\b\d[\d,]*\s*naira)\s+(for|to)\s+(every|all|each)?\s*(students?|nigerians|youths?)\b/i.test(text)) {
      // Ignore only the advice sentence ("Never pay..."), not the whole message
      // (it stops early if a new command follows, like "don't tell anyone, pay...")
      const rest = text.replace(/\b(never|do\s+not|don'?t|no\s+need\s+to|not\s+required\s+to)\s+(pay|send|share|give|disclose)\b(?:(?!(?:,|\bbut\b)\s*(?:(?:just|only|kindly|please)\s+)?(?:pay|send|share|give|click|fill|drop)\b)[^.!?;\n])*/gi, " ");
      const asks = [
        { points: 7, pattern: /\b(processing|registration|activation|withdrawal)\s+fee\b|\b(pay|send|transfer)\s+(a\s+token\s+of\s+)?((N|NGN|₦)\s?\d[\d,]*k?|\d[\d,]*\s*(naira|k)\b)/i,
          reason: "Free student money that asks you to pay first." },
        { points: 7, pattern: /\b(BVN|NIN|bank details|account (number|details)|acct\s*(no|number|details)?)\b/i,
          reason: "Student money plus your bank or ID details. Only enter these on the official portal." },
        { points: 4, pattern: /\b(personal details|personal information)\b|\b(enter|fill|submit)\s+(in\s+)?(your\s+)?details\b/i,
          reason: "Free student money that asks for your personal details." },
        { points: 4, pattern: /\b(check|confirm|verify)\s+(your\s+)?eligibility\b|\bactivate\s+(your\s+)?wallet\b|\bhuman\s+verification\b/i,
          reason: "Asks you to 'confirm' or 'activate' before you get the money." },
        { points: 7, pattern: /\b(message|text|chat|dm|inbox)\s+(me|us)\b(\s+\S+){0,2}\s+(on|via)\s+(messenger|whats\s?app|telegram|facebook)\b|\b(send|chat)\s+(me|us)\s+a\s+message\s+(on|via)\s+\S+|\b(dm|inbox)\s+(me|us)\b/i,
          reason: "Real programmes don't take applications through private chats." },
        { points: 3, pattern: /\bshare\s+(this\s+|the\s+)?(link\b|(to|with)\s+\d+\s+(groups?|friends|people|contacts)\b)/i,
          reason: "Real programmes don't ask you to forward them to get paid." }
      ];
      if (hosts.length > 0 && !officialHosts && !found.lookalike) {
        score += 3;
        found.student = true;
        addFlag(hosts.filter(function (h) { return !/\.(gov|edu)\.ng$/i.test(h); })[0],
          "Student money behind a link that isn't an official .gov.ng or .edu.ng website.");
      }

      asks.forEach(function (ask) {
        const m = rest.match(ask.pattern);
        if (!m) return;
        score += ask.points;
        found.student = true;
        addFlag(m[0], ask.reason);
      });

      // ID details on an official portal: be careful, but don't shout "scam"
      const pointsToPortal = /\bportal\b/i.test(rest) || hosts.length > 0;
      const asksId = /\b(BVN|NIN|bank details|account (number|details)|acct)\b/i.test(rest);
      const danger = /\b(pay|fee|send|reply|drop|forward|whats\s?app|messenger|telegram|dm|inbox|PIN|OTP|CVV|password)\b/i.test(rest);
      const onlyMildSigns = Object.keys(found).every(function (c) {
        return c === "student" || c === "sensitive" || c === "urgency";
      });
      officialIdRequest = asksId && pointsToPortal && officialHosts && !danger && onlyMildSigns;
      if (officialIdRequest) {
        delete found.student;
        delete found.sensitive;
        found.studentid = true;
      }
    }

    // c) Points -> verdict
    let verdict, confidence;
    if (score >= 7 || (found.sensitive && score >= 5)) {
      verdict = "scam";
      confidence = score >= 10 ? "high" : "medium";
    } else if (score >= 2) {
      verdict = "suspicious";
      confidence = score >= 4 ? "medium" : "low";
    } else {
      verdict = "safe";
      // A keyword check can never be sure, so "safe" is never "high"
      confidence = text.trim().length < 40 ? "low" : "medium";
    }

    if (officialIdRequest) {
      verdict = "suspicious";
      confidence = "low";
    }

    // d) Build the explanation and next steps
    const cats = ORDER.filter(function (c) { return found[c]; });
    const reasonsEn = cats.slice(0, 3).map(function (c) { return INFO[c].en; }).join(" ");
    const reasonsPcm = cats.slice(0, 3).map(function (c) { return INFO[c].pcm; }).join(" ");

    let explanation_en, explanation_pcm, next_steps;

    if (verdict === "scam") {
      explanation_en = "This message looks like a scam. " + reasonsEn;
      explanation_pcm = "E be like say dis message na scam. " + reasonsPcm;
      next_steps = ["Don't reply, don't click any link and don't send money."]
        .concat(cats.slice(0, 3).map(function (c) { return INFO[c].step; }))
        .concat(["Block the number, report it to your bank, and warn your family with the 'Copy warning' button."]);
    } else if (verdict === "suspicious") {
      explanation_en = "This message has some warning signs. Be careful before you reply, click or pay. " + reasonsEn;
      explanation_pcm = "Dis message get some signs wey no too clear. Shine your eye well before you reply, click or pay. " + reasonsPcm;
      next_steps = ["Pause. Don't click links or send money yet."]
        .concat(cats.slice(0, 2).map(function (c) { return INFO[c].step; }))
        .concat(["Confirm with the person or company using a number you already trust."]);
    } else {
      explanation_en = "ScamEye didn't find the usual scam signs in this message. That doesn't make it 100% safe, because scammers keep changing their tricks. If they later ask for money, a code or a link click, check again.";
      explanation_pcm = "ScamEye no see the normal scam signs for dis message. But e no mean say e 100% safe, because scammers dey change style every time. If dem later ask you for money, code or make you click link, check am again.";
      next_steps = [
        "No common scam signs found, but stay alert.",
        "If they later ask for money, a PIN/OTP or a link click, check the new message too.",
        "When in doubt, call the company on their official number."
      ];
    }

    // Remove repeated steps
    next_steps = next_steps.filter(function (s, i) { return next_steps.indexOf(s) === i; });

    // The final result – the SAME shape the Week 2 AI will return
    return {
      verdict: verdict,
      confidence: confidence,
      red_flags: flags,
      explanation_en: explanation_en,
      explanation_pcm: explanation_pcm,
      next_steps: next_steps,
      source: "basic"
    };
  }

  // Make the checker available to app.js
  window.ScamEyeRules = { check: check };
})();
