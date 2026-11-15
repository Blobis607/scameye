/* =========================================================
   ScamEye – app.js
   This file makes the page work: buttons, results, voice,
   copy, light/dark mode. It uses:
     - window.SCAMEYE_EXAMPLES  (from examples.js)
     - window.ScamEyeRules      (from rules.js)
   ========================================================= */

(function () {
  "use strict";

  /* ---------- 1. Grab the parts of the page we need ---------- */
  function $(id) { return document.getElementById(id); }

  const els = {
    message: $("message"),
    checkBtn: $("check-btn"),
    error: $("input-error"),
    chips: $("chips"),
    loading: $("loading"),
    result: $("result"),
    banner: $("banner"),
    verdictIcon: $("verdict-icon"),
    verdictTitle: $("verdict-title"),
    confidence: $("confidence"),
    badge: $("source-badge"),
    highlightHint: $("highlight-hint"),
    messageView: $("message-view"),
    flagDetail: $("flag-detail"),
    flagList: $("flag-list"),
    flagCount: $("flag-count"),
    explanation: $("explanation"),
    langEn: $("lang-en"),
    langPcm: $("lang-pcm"),
    readAloud: $("read-aloud"),
    nextSteps: $("next-steps"),
    copyBtn: $("copy-btn"),
    copyStatus: $("copy-status"),
    againBtn: $("again-btn"),
    muteBtn: $("mute-btn"),
    themeBtn: $("theme-btn")
  };

  const VERDICT_TEXT = { scam: "Likely scam", suspicious: "Suspicious", safe: "Probably safe" };
  const VERDICT_ICON = { scam: "!", suspicious: "?", safe: "✓" };
  const CONFIDENCE_TEXT = { low: "Low", medium: "Medium", high: "High" };

  let currentResult = null;   // the last result object
  let currentMessage = "";    // the last message checked
  let currentLang = "en";     // "en" or "pcm"

  /* Session storage = remembered only until the tab is closed.
     try/catch because some phones block it (private mode). */
  function sessionGet(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
  function sessionSet(key, value) { try { sessionStorage.setItem(key, value); } catch (e) { /* ignore */ } }

  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  /* ---------- 2. Example chips ---------- */
  (window.SCAMEYE_EXAMPLES || []).forEach(function (example) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = example.label;
    chip.addEventListener("click", function () {
      els.message.value = example.text;
      showError("");
      els.message.focus();
    });
    els.chips.appendChild(chip);
  });

  /* ---------- 3. Checking a message ----------
     1st choice: ask the AI (api/check.js on the server).
     Backup:     if the AI fails or is slow, use rules.js.
     Both give back the SAME result shape.
     No API key is ever in this file – it stays on the server. */
  const MAX_LENGTH = 2000;          // same limit as the server
  const AI_WAIT_MS = 15000;         // server gives up after 12s; we wait a little longer

  // An error we should show to the user (like "message too long")
  function UserError(message) { this.message = message; }

  function looksLikeResult(r) {
    return r && ["scam", "suspicious", "safe"].indexOf(r.verdict) !== -1 &&
           typeof r.explanation_en === "string" && Array.isArray(r.red_flags) && Array.isArray(r.next_steps);
  }

  async function askAI(text) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(function () { controller.abort(); }, AI_WAIT_MS) : null;
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: controller ? controller.signal : undefined
      });
      if (res.status === 400) {
        // The server says something is wrong with the message itself
        const info = await res.json().catch(function () { return {}; });
        throw new UserError(info.error || "Please check the message and try again.");
      }
      if (!res.ok) throw new Error("AI not available: " + res.status);
      const result = await res.json();
      if (!looksLikeResult(result)) throw new Error("AI answer had the wrong shape");
      result.source = "ai";
      return result;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function checkMessage(text) {
    // Opened by double-clicking index.html? There's no server, so go straight to the basic check.
    if (location.protocol === "file:") return window.ScamEyeRules.check(text);
    try {
      return await askAI(text);
    } catch (err) {
      if (err instanceof UserError) throw err;
      return window.ScamEyeRules.check(text);   // automatic backup
    }
  }

  async function onCheck() {
    const text = els.message.value.trim();
    if (!text) {
      showError("Please paste a message first.");
      els.message.focus();
      return;
    }
    if (text.length > MAX_LENGTH) {
      showError("That message is too long. Please paste up to 2,000 characters (it's " + text.length.toLocaleString() + " now).");
      els.message.focus();
      return;
    }
    showError("");
    stopClip();
    stopSpeaking();
    unlockVoice();   // must happen during the tap, so the clip can play later

    // Show the loading line for 1 second
    els.result.hidden = true;
    els.loading.hidden = false;
    els.checkBtn.disabled = true;

    let result;
    try {
      const both = await Promise.all([checkMessage(text), wait(1000)]);
      result = both[0];
    } catch (err) {
      els.loading.hidden = true;
      els.checkBtn.disabled = false;
      showError(err instanceof UserError ? err.message : "Sorry, something went wrong. Please try again.");
      els.message.focus();
      return;
    }

    els.loading.hidden = true;
    els.checkBtn.disabled = false;
    showResult(text, result);
  }

  function showError(msg) { els.error.textContent = msg; }

  /* ---------- 4. Showing the result ---------- */
  function showResult(text, result) {
    currentResult = result;
    currentMessage = text;
    const v = result.verdict;

    // Banner
    els.banner.className = "banner banner--" + v;
    els.verdictIcon.textContent = VERDICT_ICON[v];
    els.verdictTitle.textContent = VERDICT_TEXT[v];
    els.confidence.textContent = "Confidence: " + (CONFIDENCE_TEXT[result.confidence] || "Low");

    // Badge: "Basic check" for rules.js, "AI check" later
    els.badge.textContent = result.source === "basic" ? "Basic check" : "AI check";

    // Message with highlights + list of red flags
    renderHighlights(text, result.red_flags || []);
    renderFlagList(result.red_flags || []);

    // Explanation in the chosen language
    setLang(currentLang);

    // What to do next
    els.nextSteps.textContent = "";
    (result.next_steps || []).forEach(function (step) {
      const li = document.createElement("li");
      li.textContent = step;
      els.nextSteps.appendChild(li);
    });

    els.copyStatus.textContent = "";
    els.result.hidden = false;

    // Move focus to the verdict so screen readers announce it
    els.verdictTitle.focus();
    els.result.scrollIntoView({ behavior: "smooth", block: "start" });

    // Play the recorded voice clip
    playVerdictClip(v);
  }

  /* Show the message again, with each red flag wrapped in a <mark>.
     We build it piece by piece with textContent, so any strange
     text in the message can never run as code. */
  function renderHighlights(text, flags) {
    els.messageView.textContent = "";
    els.flagDetail.textContent = "";

    // Find every place where each red flag's words appear
    const lower = text.toLowerCase();
    let ranges = [];
    flags.forEach(function (flag, i) {
      if (!flag.text) return;
      const needle = flag.text.toLowerCase();
      let from = 0, pos;
      while ((pos = lower.indexOf(needle, from)) !== -1) {
        ranges.push({ start: pos, end: pos + needle.length, index: i });
        from = pos + needle.length;
      }
    });

    // Sort from left to right, and skip any that overlap
    ranges.sort(function (a, b) { return a.start - b.start || (b.end - b.start) - (a.end - a.start); });
    const keep = [];
    let lastEnd = 0;
    ranges.forEach(function (r) {
      if (r.start >= lastEnd) { keep.push(r); lastEnd = r.end; }
    });

    // Build the text: plain part, highlight, plain part, highlight…
    let cursor = 0;
    keep.forEach(function (r) {
      if (r.start > cursor) {
        els.messageView.appendChild(document.createTextNode(text.slice(cursor, r.start)));
      }
      const mark = document.createElement("mark");
      mark.className = "flag";
      mark.textContent = text.slice(r.start, r.end);
      mark.tabIndex = 0;                         // reachable with the Tab key
      mark.setAttribute("role", "button");
      mark.setAttribute("aria-label", "Red flag: " + mark.textContent + ". Show reason.");
      mark.dataset.index = r.index;
      els.messageView.appendChild(mark);
      cursor = r.end;
    });
    if (cursor < text.length) {
      els.messageView.appendChild(document.createTextNode(text.slice(cursor)));
    }

    els.highlightHint.hidden = keep.length === 0;
  }

  // Tapping (or pressing Enter/Space on) a highlight shows its reason
  function showFlagReason(mark) {
    const flag = currentResult.red_flags[Number(mark.dataset.index)];
    if (!flag) return;
    els.messageView.querySelectorAll(".flag.is-active").forEach(function (m) { m.classList.remove("is-active"); });
    mark.classList.add("is-active");
    els.flagDetail.textContent = "";
    const strong = document.createElement("strong");
    strong.textContent = "“" + mark.textContent + "”";
    els.flagDetail.appendChild(strong);
    els.flagDetail.appendChild(document.createTextNode(flag.reason));
  }

  els.messageView.addEventListener("click", function (e) {
    const mark = e.target.closest(".flag");
    if (mark) showFlagReason(mark);
  });
  els.messageView.addEventListener("keydown", function (e) {
    const mark = e.target.closest(".flag");
    if (mark && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      showFlagReason(mark);
    }
  });

  function renderFlagList(flags) {
    els.flagList.textContent = "";
    els.flagCount.textContent = flags.length;
    if (flags.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No red flags found.";
      els.flagList.appendChild(li);
      return;
    }
    flags.forEach(function (flag) {
      const li = document.createElement("li");
      const q = document.createElement("q");
      q.textContent = flag.text;
      li.appendChild(q);
      li.appendChild(document.createTextNode(" – " + flag.reason));
      els.flagList.appendChild(li);
    });
  }

  /* ---------- 5. English / Pidgin toggle ---------- */
  function setLang(lang) {
    currentLang = lang;
    els.langEn.setAttribute("aria-pressed", String(lang === "en"));
    els.langPcm.setAttribute("aria-pressed", String(lang === "pcm"));
    if (currentResult) {
      els.explanation.textContent = lang === "pcm" ? currentResult.explanation_pcm : currentResult.explanation_en;
      els.explanation.lang = lang === "pcm" ? "pcm" : "en";
    }
  }
  els.langEn.addEventListener("click", function () { stopSpeaking(); setLang("en"); });
  els.langPcm.addEventListener("click", function () { stopSpeaking(); setLang("pcm"); });

  /* ---------- 6. Voice: my recorded clips ---------- */
  let muted = sessionGet("scameye-muted") === "1";
  // ONE audio player, reused every time. Phones (especially iPhones) only allow
  // sound from a player that was first started during a tap – see unlockVoice().
  const voice = new Audio();
  let clipToken = 0;   // goes up every time we start/stop, so old clips can't interrupt new ones

  function updateMuteBtn() {
    els.muteBtn.textContent = muted ? "🔇 Sound off" : "🔊 Sound on";
    els.muteBtn.setAttribute("aria-label", muted ? "Sound is off. Turn sound on." : "Sound is on. Turn sound off.");
  }
  updateMuteBtn();

  els.muteBtn.addEventListener("click", function () {
    muted = !muted;
    sessionSet("scameye-muted", muted ? "1" : "0");
    if (muted) stopClip();
    updateMuteBtn();
  });

  // The AI can take a few seconds. Starting the player silently during the
  // "Check message" tap "unlocks" it, so it's allowed to speak when the result arrives.
  function unlockVoice() {
    if (muted) return;
    const myToken = clipToken;
    try {
      voice.muted = true;
      voice.src = "audio/scam.mp3";
      const p = voice.play();
      const done = function () {
        if (myToken === clipToken) voice.pause();   // don't stop a real clip that already started
        voice.muted = false;
      };
      if (p && p.then) p.then(done, function () { voice.muted = false; });
      else done();
    } catch (e) { voice.muted = false; }
  }

  // Try audio/<verdict>.mp3 first. If it's missing, try .wav. If both are missing, stay quiet.
  const CLIP_TYPES = [".mp3", ".wav"];

  function playVerdictClip(verdict) {
    stopClip();
    if (muted) return;
    const myToken = ++clipToken;
    let attempt = 0;
    function tryNext() {
      if (myToken !== clipToken || attempt >= CLIP_TYPES.length) return;
      voice.muted = false;
      voice.src = "audio/" + verdict + CLIP_TYPES[attempt++];
      const p = voice.play();
      if (p && p.catch) p.catch(function () { /* blocked or missing: stay quiet */ });
    }
    voice.onerror = tryNext;   // file missing → try the next type
    tryNext();
  }

  function stopClip() {
    clipToken++;
    voice.onerror = null;
    try { voice.pause(); } catch (e) { /* ignore */ }
  }

  /* ---------- 7. Read explanation aloud (phone's own voice) ---------- */
  const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  let voices = [];
  let speaking = false;

  if (!canSpeak) {
    els.readAloud.hidden = true;
  } else {
    voices = window.speechSynthesis.getVoices();
    // Some phones load their voices a little later
    window.speechSynthesis.onvoiceschanged = function () { voices = window.speechSynthesis.getVoices(); };
  }

  // Prefer a Nigerian English voice, then British, then any English
  function pickVoice() {
    function find(test) { for (let i = 0; i < voices.length; i++) { if (test(voices[i])) return voices[i]; } return null; }
    return find(function (v) { return /en[-_]NG/i.test(v.lang); }) ||
           find(function (v) { return /nigeria/i.test(v.name); }) ||
           find(function (v) { return /en[-_]GB/i.test(v.lang); }) ||
           find(function (v) { return /^en/i.test(v.lang); }) ||
           null;
  }

  function setReading(on) {
    speaking = on;
    els.readAloud.textContent = on ? "⏹️ Stop reading" : "🗣️ Read explanation aloud";
  }

  function stopSpeaking() {
    if (canSpeak) window.speechSynthesis.cancel();
    setReading(false);
  }

  els.readAloud.addEventListener("click", function () {
    if (!canSpeak || !currentResult) return;
    if (speaking) { stopSpeaking(); return; }
    stopClip();
    const words = VERDICT_TEXT[currentResult.verdict] + ". " + els.explanation.textContent;
    const say = new SpeechSynthesisUtterance(words);
    const voice = pickVoice();
    if (voice) { say.voice = voice; say.lang = voice.lang; } else { say.lang = "en-NG"; }
    say.rate = 0.95; // a little slower = easier to follow
    say.onend = function () { setReading(false); };
    say.onerror = function () { setReading(false); };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(say);
    setReading(true);
  });

  /* ---------- 8. Copy warning (to share on WhatsApp) ---------- */
  function buildWarning(text, result) {
    const snippet = text.replace(/\s+/g, " ").slice(0, 90) + (text.length > 90 ? "…" : "");
    const reasons = (result.red_flags || []).slice(0, 3).map(function (f) { return f.reason; });
    // Remove repeated reasons
    const unique = reasons.filter(function (r, i) { return reasons.indexOf(r) === i; });

    if (result.verdict === "safe") {
      return "✅ ScamEye check: a message I received looks probably safe, but I'm still being careful.\n" +
             "Remember: never share your PIN, OTP or BVN with anyone.";
    }
    const title = result.verdict === "scam" ? "⚠️ SCAM ALERT" : "⚠️ Be careful – suspicious message";
    let msg = title + " (checked with ScamEye)\n" +
              "If you get a message like this, don't reply or click: \"" + snippet + "\"\n";
    if (unique.length) msg += "Red flags: " + unique.join(" ") + "\n";
    msg += "Never share your PIN, OTP or BVN. When in doubt, call your bank on the number on your card.";
    return msg;
  }

  async function copyText(str) {
    // Modern way
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(str);
        return true;
      }
    } catch (e) { /* try the old way */ }
    // Old way (works on more phones)
    const ta = document.createElement("textarea");
    ta.value = str;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    els.copyBtn.focus();
    return ok;
  }

  els.copyBtn.addEventListener("click", async function () {
    if (!currentResult) return;
    const ok = await copyText(buildWarning(currentMessage, currentResult));
    els.copyStatus.textContent = ok
      ? "✅ Warning copied! Paste it in WhatsApp to warn family and friends."
      : "Sorry, your phone didn't allow copying. Please take a screenshot instead.";
  });

  /* ---------- 9. Check another message ---------- */
  els.againBtn.addEventListener("click", function () {
    stopClip();
    stopSpeaking();
    els.result.hidden = true;
    els.message.value = "";
    currentResult = null;
    window.scrollTo({ top: 0, behavior: "smooth" });
    els.message.focus();
  });

  /* ---------- 10. Light / dark mode ---------- */
  const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const savedTheme = sessionGet("scameye-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", savedTheme);
  }

  function activeTheme() {
    const set = document.documentElement.getAttribute("data-theme");
    if (set) return set;
    return darkQuery && darkQuery.matches ? "dark" : "light";
  }
  function updateThemeBtn() {
    const dark = activeTheme() === "dark";
    els.themeBtn.textContent = dark ? "☀️ Light" : "🌙 Dark";
    els.themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }
  updateThemeBtn();
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener("change", updateThemeBtn);

  els.themeBtn.addEventListener("click", function () {
    const next = activeTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    sessionSet("scameye-theme", next);
    updateThemeBtn();
  });

  /* ---------- 11. Start ---------- */
  els.checkBtn.addEventListener("click", onCheck);
  // Shortcut: Ctrl+Enter in the box also checks
  els.message.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onCheck(); }
  });
})();
