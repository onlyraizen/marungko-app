# Release checklist: Android APK (must ship) + iOS Expo Go preview (can slip)

Written 2026-11-14. Owner = who does it (R = Raizen, K = Karylle, NS = native speaker, C = Claude). Tick the box only after the **Pass** is seen.
One document is enough for a 4-hour push. Keep `docs/GOOGLE-LOGIN.md` (setup details), `docs/AUDIO-REWORK.md` (audio commands) and `docs/AT-RISK-WORDS.md` (the generated word table) as reference.

## Time plan (Philippine time; from 08:47)
| Time | Work | Owner | Slips? |
|---|---|---|---|
| 08:50-09:20 | Supabase email template + SMTP (section C) | R | no |
| 09:20-10:15 | `pnpm content:word-samples -- --yes`, native speaker rates, `--apply`, normalize (section A) | R + NS | no |
| 10:15-11:00 | Google Cloud + Supabase Google provider; test sign-in on the Android phone (section B) | R | no |
| 11:00-11:30 | Wrong-vowel test with a person speaking, STT context A/B (section D) | R + K | no |
| 11:30-12:00 | `pnpm leak-check`, EAS build (preview APK), install, run the checks | R | no |
| 12:00-12:30 | iOS Expo Go demo (section F) | K | **first to cut** |
| 12:30-13:00 | Sign-off | R + K | no |
Cut order if late: iOS preview, then Low-priority word fixes.

## A. Pronunciation and audio
- [ ] **A1 so, tu applied** (done today). Test: lesson 1 plays "so" and "tu". Pass: pure /o/ and /u/, no glide (NS). Owner NS.
- [ ] **A2 mais and kanin samples made.** Test: `pnpm content:word-samples -- --yes`, open `~/word-samples/index.html`. Pass: 12 files play. Owner R.
- [ ] **A3 NS rates them.** Pass: a version with Stress and Vowel clarity both 4+ (below 4 on either = reject); no version passes: record a real voice (`docs/syllable-recorder.html`, `pnpm content:import-voice`). Owner NS.
- [ ] **A4 chosen versions pushed.** Test: `pnpm content:word-samples -- --apply mais=<letter>,kanin=<letter>`, `pnpm content:normalize-audio`, `pnpm content:audio -- --manifest-only`, restart with `-c`. Pass: the app plays the chosen file; `content/audio-meta.json` says voice Maya. Owner R.
- [ ] **A5 Stress of the other High words** (`docs/AT-RISK-WORDS.md`) marked by the NS. Pass: filled column. Owner NS.
Recording script for a human voice (if used): say each word alone, slowly, once, quiet room, 20 cm from the mic. "mais": ma-ÍS, a clear /i/ in the last syllable, no "e", two syllables. "kanin": KA-nin, a long stressed "kaa", the last "nin" fully sounded and held a moment. Silence at the start 50 ms or less, at the end 100 ms or less (normalizer trims). Do not say an example sentence.

## B. Google sign-in (Android first)
Decision: the app uses **browser sign-in** (Supabase `signInWithOAuth` + `expo-web-browser`, Chrome Custom Tab on Android). It needs only the **Web client** in Google Cloud. The Android client with package name + SHA-1 and the native `@react-native-google-signin` module are only needed for the native one-tap method that Supabase's Expo guide describes; that needs a build with the native module and does not run in Expo Go. Next step only if the browser flow fails on the phone: add the native module, create an **Android** client (package `com.marungko.app`, SHA-1 of the EAS keystore from `npx eas-cli credentials` and of any debug keystore: unverified how it prints), and keep the same Web client ID in Supabase.
- [ ] **B1 Google Cloud:** consent screen External, Testing, scopes openid/email/profile, tester Gmails added (max 100). Owner R. Pass: a tester can reach the Google account chooser.
- [ ] **B2 Web client + Supabase provider:** callback URL from the Supabase Google page added as the authorized redirect URI; client ID/secret pasted **in the Supabase dashboard only**. Owner R. Pass: no `redirect_uri_mismatch`.
- [ ] **B3 Redirect URLs in Supabase:** `marungko://**` (+ `exp://**` for Expo Go only). Site URL = Railway URL. Owner R. Pass: browser returns to the app.
- [ ] **B4 Android phone tests:** sign in, cancel (no error), wrong account (chooser always shows), airplane mode (kind message), sign out, kill and reopen (still signed in), wait for token refresh. Owner R. Pass: all seven.
- [ ] **B5 Parent only:** child never signs in with Google (Google minimum age 13). Pass: the Google button is on the adult sign-in screen only.

## C. OTP email
- [ ] **C1 Confirm sign up and Reset password templates use `{{ .Token }}`.** Owner R. Pass: a new sign-up email shows 6 digits and no link.
- [ ] **C2 Custom SMTP** (Brevo or Resend; sender name Basa-Bata; verify the sender/domain, SPF/DKIM). Owner R. Pass: email reaches a Gmail inbox (not spam) within a minute, from an address that is not a Supabase team member.
- [ ] **C3 Code flow tests:** new sign-up, resend (after 60 s), wrong code (coral boxes), expired, used code, view on a phone. Owner K. Pass: each shows a kind message; the right code signs in.
- [ ] **C4 Supabase email rate limit** raised from the 30/hour default if more testers than that. Owner R.

## D. Speech check and vowel rules
- [ ] **D1 `pnpm speech:confusable-test`, `pnpm speech:test`, `pnpm lesson:test`** pass. Owner C (done today). Pass: 17 wrong spellings rejected, 6 right accepted, 18,493 look-alikes none accepted.
- [ ] **D2 Spoken test, mic on, one person, 10 tries each:** say "male", "bula", "yilo", "maes" for mali, bola, yelo, mais. Pass: never Tama; "Halos na!" then the model word. Say the right words: Tama. Owner R + K.
- [ ] **D3 STT context A/B:** repeat D2 with `EXPO_PUBLIC_STT_CONTEXT=none` in `frontend/.env` (`npx expo start --go -c`). Pass: if "none" shows the swapped vowel while the default hides it, make `none` the default. Owner R.
- [ ] **D4 Never stuck:** miss the same word 3 times. Pass: "Tuloy tayo" is offered. Owner K.

## E. Android build and release, tokens
- [ ] **E1 `pnpm leak-check -- --history`** prints "No secret". Owner R.
- [ ] **E2 No secrets in the app:** `frontend/.env` has only `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL`. The Google client secret is only in the Supabase dashboard; service_role and Soniox keys only in `backend/.env` and Railway. Owner R.
- [ ] **E3 Backup off:** `android.allowBackup: false` is set in `frontend/app.config.ts` (done). Pass: `pnpm leak-check` does not complain.
- [ ] **E4 Build:** `cd frontend && npx eas-cli build -p android --profile preview` (free tier has a limited number of builds per month: check your EAS dashboard, unverified). Pass: APK downloads and installs. Owner R.
- [ ] **E5 Device run:** first-tap audio plays, mic check works, guides show once. Owner K.
- [ ] **E6 After the build:** `npx eas-cli logout`, remove the GitHub credential from the borrowed laptop. Owner R.
Token rules: never paste a token or secret in chat, an issue or a screenshot; scrub with a black box before sharing; tokens are never in URLs (PKCE: the link carries a one-time code); the session sits in the Keystore/Keychain via SecureStore. If a secret is ever exposed: rotate it in its own dashboard first (Google: new client secret; Supabase: regenerate the key; Soniox: new key), then update Railway and `.env`, then clean history.

## F. iOS Expo Go preview (secondary)
| Feature | Expo Go on iPhone | Note |
|---|---|---|
| Email code sign-in | yes | same code path as Android |
| Google browser sign-in | partly (unverified) | redirect is `exp://<ip>:8081/--/auth-callback`; `exp://**` must be in Supabase Redirect URLs; tell if it fails and use the Android phone for Google |
| Native Google Sign-In | no | needs a development build (Supabase's Expo guide uses prebuild); skip |
| Narrator audio, quizzes, guides | yes | worked in your earlier iPhone tests |
| Mic + Soniox speech check | yes in your tests; not re-checked today | |
| Secure session storage | expected yes (unverified: docs page not reachable from here) | falls back to AsyncStorage if SecureStore fails |
Cost: free. Next step if more is needed: a development build (needs an Apple Developer account, paid): stop there.
Steps: `cd ~/marungko-app/frontend && npx expo start --go -c`, scan the QR with the iPhone Camera.
Demo order: sign in with the email code, a lesson with narrator audio, speech check (right word passes; "male" for mali does not), picture quiz (3 formats).

## G. Privacy and consent (RA 10173)
- [ ] **G1 Parent or teacher creates the account;** children are profiles with a nickname. Pass: sign-up screen is for adults.
- [ ] **G2 A parental consent screen exists** before the first child profile: what is kept (nickname, progress), that voice is checked and **not recorded or stored**, how to delete. **Not built yet:** needs a design (see questions). Owner R + K.
- [ ] **G3 Confirm no recordings are stored:** grep the backend for storage of audio. Owner C.

## H. Sign-off
| Check | Who | Date | Result |
|---|---|---|---|
| Audio (A) | NS | | |
| Google (B) | R | | |
| Email (C) | K | | |
| Speech (D) | R + K | | |
| Build + leak check (E) | R | | |
| iOS preview (F) | K | | |
