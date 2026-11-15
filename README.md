# ScamEye 👁️

**Got a strange message? Check it before you click.**

ScamEye is a free web page where anyone in Nigeria can paste a suspicious SMS or WhatsApp message and get a clear verdict: **Likely scam**, **Suspicious** or **Probably safe**. It highlights the red flags, explains them in plain English or Nigerian Pidgin, and speaks the verdict out loud.

## The problem

Fake bank alerts, "update your BVN" texts, fake promo wins, job offers that ask for a fee, and "I sent money to you by mistake, please send it back" messages take money from people across Nigeria every day. Parents, traders and people new to mobile banking are the easiest targets. Often they just need a careful friend to look at the message before they act. ScamEye tries to be that friend.

## How to run it

No installation needed.

1. Download or clone this repository.
2. Open `index.html` in your browser (double-click it).

Or, in VS Code, install the **Live Server** extension, right-click `index.html` and choose **Open with Live Server**.

## Features

- Big paste box and a "Check message" button
- Five example messages to try (four scams, one safe-looking delivery text)
- Clear red / amber / green verdict with a confidence level
- Red flags highlighted inside the message. Tap one to see why it's a problem
- Explanation in **English** or **Nigerian Pidgin**
- "What to do next" steps
- "Copy warning" button to share a warning on WhatsApp
- Verdict spoken in a recorded voice (`audio/` folder), with a sound on/off button
- "Read explanation aloud" using the phone's built-in voice (prefers a Nigerian English voice)
- Light and dark mode, big text, works with a keyboard and screen readers
- No sign-up, nothing stored. Messages never leave the phone

## Built with

- Plain HTML, CSS and JavaScript. No frameworks, no build tools
- Browser Speech Synthesis API for reading aloud

## Project files

| File | What it does |
|---|---|
| `index.html` | The page layout |
| `style.css` | Colours, sizes, light/dark mode |
| `app.js` | Makes the buttons and result card work |
| `rules.js` | The Week 1 keyword checker |
| `examples.js` | The five practice messages |
| `audio/` | Recorded voice clips (`scam.mp3`, `suspicious.mp3`, `safe.mp3`) |
| `api/` | Empty for now. Week 2 adds `api/check.js` for the AI |

## Limitations

- Week 1 uses a simple keyword checker, so it can miss new or cleverly written scams and may sometimes flag a real message.
- It works best on English and Pidgin messages.
- ScamEye gives advice, not a guarantee. When in doubt, call your bank on the number on your card. Never share your PIN, OTP or BVN.

## What's next

- **AI check with Gemini** (Week 2) for smarter verdicts, through a small server function so no keys are ever in the page
- **WhatsApp bot**: forward a message, get a verdict back
- **Yoruba, Hausa and Igbo** explanations

## Credits

Built with help from Claude (AI assistant).

All bank and company names in the examples (PrimeTrust Bank, SwiftHire, SwiftDrop) are made up.
