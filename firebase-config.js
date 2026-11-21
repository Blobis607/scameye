/* =========================================================
   ScamEye – firebase-config.js

   Paste the values from the Firebase console here
   (Project settings → General → Your apps → Web app → "Config").

   IS THIS SAFE TO PUT ON GITHUB?  YES.
   Firebase says web config values (including "apiKey") are
   public by design: they only NAME your project, they don't
   unlock it. Protection comes from App Check (below).
   https://firebase.google.com/docs/projects/api-keys

   NEVER put these here:
   - your Gemini API key (from AI Studio or the one Firebase
     auto-creates called "Gemini Developer API key")
   - an App Check DEBUG TOKEN (the long code printed in the
     browser console when testing on localhost)

   If apiKey is empty, ScamEye just uses the basic check.
   ========================================================= */

window.SCAMEYE_FIREBASE_CONFIG = {
  apiKey: "AIzaSyANd_hZE8KfzSZwUcuTdwTGHF_6PA_Najk",
  authDomain: "scameye-131b1.firebaseapp.com",
  projectId: "scameye-131b1",
  storageBucket: "scameye-131b1.firebasestorage.app",
  messagingSenderId: "370604674626",
  appId: "1:370604674626:web:4343363aa42a07ef2d67db"
};

/* reCAPTCHA Enterprise SITE key, used by App Check.
   A site key is public (it's meant to be in web pages). */
window.SCAMEYE_RECAPTCHA_SITE_KEY = "6Lc2rCouAAAAAJV2wqRofW0NuCQ4v9u0Jj7_feko";
