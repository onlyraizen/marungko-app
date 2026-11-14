# Google login, email code, tokens, and wrong-vowel check (2026-11-14)

All prices and limits below were read from the official page on **2026-11-14**. Pages change; re-check before the defense.
"Unverified" means I could not confirm it from an official page today and you must test it.

## 1. Cost (checked 2026-11-14)

| Item | Free? | Limits that matter for a pilot | Source |
|---|---|---|---|
| Google sign-in (OAuth) | The pages I read mention no fee for OAuth or for verification (they do not state "free" either) | Testing status: hard cap of **100 test users**; refresh tokens last **7 days** in Testing. Only sensitive/restricted scopes need verification; we ask only for basic sign-in (openid, email, profile). | [Google production readiness](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview) |
| Google account age | n/a | Philippines is not listed, so the default applies: **13 is the minimum age** to manage your own Google Account; younger children use Family Link run by a parent. So Google login is for the parent or teacher, never the child. | [Google age requirements](https://support.google.com/accounts/answer/1350409) |
| Supabase Auth, Free plan | Yes | **50,000 MAU**; project **pauses after 1 week of inactivity**; no automatic backups; 2 active projects; 500 MB database. Pro is from $25/month with 100,000 MAU. | [supabase.com/pricing](https://supabase.com/pricing.md) (no "last updated" date on the page) |
| Supabase built-in email | Yes, but unusable for a pilot | Only **2 emails per hour for the whole project**, may change without notice, no SLA, and it **refuses addresses that are not part of the project's team**. | [Rate limits](https://supabase.com/docs/guides/auth/rate-limits), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp) |
| Custom SMTP: Resend | Free plan | **100 emails/day, 3,000/month**, 3 domains. Sending to arbitrary addresses needs a verified domain (unverified today: check Resend docs). | [Resend pricing](https://resend.com/pricing.md) |
| Custom SMTP: Brevo | Free plan | **300 emails/day**. The page I read did not confirm SMTP relay on the free plan (unverified: check in your Brevo account). | [Brevo](https://www.brevo.com/features/email-api/) |
| Supabase after custom SMTP | n/a | Default **30 messages/hour** until you raise it in Authentication > Rate Limits; one code request per user per 60 s; 30 sign-up/verify requests per 5 min per IP (a whole class on one school Wi-Fi shares one IP). | [Rate limits](https://supabase.com/docs/guides/auth/rate-limits) |

**Recommendation for a thesis pilot:** Supabase Free + Google OAuth in Testing mode (add each tester's Gmail as a test user, up to 100) + Gmail SMTP with an App Password (Brevo 300/day or Resend 100/day need a domain). Total cost: 0. What would force you to pay: more than 50,000 MAU (no), needing backups or no 7-day pause (Pro, $25/month), a public launch with Google verification (no fee found, but review takes time), or more than the free email quota.
**Pausing is the real pilot risk:** if nobody signs in for a week, the project pauses. Open the app or the dashboard before every test day.

## 2. Google login setup (browser sign-in; works in Expo Go and in the APK)

Supabase's Expo guide uses the native Google ID-token method (`@react-native-google-signin/google-signin`), which needs a development build and does **not** run in Expo Go. This app uses Supabase's browser OAuth instead (`signInWithOAuth` + `expo-web-browser`), so you can test it on the iPhone in Expo Go. It needs only a **Web** client in Google Cloud: no Android SHA-1 and no iOS bundle ID. Code: `frontend/src/services/googleAuth.ts`. Whether Expo Go returns to the app after Google is **unverified: test it first**.

1. Google Cloud Console: create a project (menu names may differ; unverified). Open Google Auth Platform (OAuth consent screen): choose **External**, app name Basa-Bata, your support email. Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` only. Publishing status **Testing**; add each tester Gmail under Test users.
2. Create an OAuth client, type **Web application**. Under **Authorized redirect URIs** add the callback URL that Supabase shows on its Google provider page (it looks like `https://<project-ref>.supabase.co/auth/v1/callback`). Do not add the app scheme here.
3. Supabase Dashboard > Authentication > Providers > **Google**: enable it, paste the Web **Client ID** and **Client Secret** there. The secret goes only in the Supabase dashboard, never in the app, never in git.
4. Supabase Dashboard > Authentication > URL Configuration > **Redirect URLs**: add `marungko://**` (the app's scheme is `marungko`, set in `frontend/app.config.ts`) and, only while testing in Expo Go, `exp://**`. Set **Site URL** to your Railway URL (not localhost). Remove `exp://**` before the final build.
5. In Expo Go the redirect is `exp://<laptop-ip>:8081/--/auth-callback`; in the APK it is `marungko://auth-callback`.

Most common mistakes and how to see them:
| Mistake | Symptom |
|---|---|
| Redirect URI in Google differs from Supabase's callback | Google page: "Error 400: redirect_uri_mismatch" |
| App redirect (`exp://` or `marungko://`) missing from Supabase Redirect URLs | Browser lands on the Site URL (or localhost) instead of returning to the app |
| Wrong client type (Android/iOS instead of Web) | "invalid_client" or the provider rejects the secret |
| Tester Gmail not in Test users | Google says "Access blocked: app has not completed verification" |
| Client secret empty or pasted for another client | Supabase shows an error JSON after Google |
| (native method only) missing SHA-1 / dev build | `DEVELOPER_ERROR`, or a crash in Expo Go. Not used here. |

Test checklist: sign in; sign out; kill and reopen the app (still signed in); cancel in the browser (no error alert); pick a wrong account (the account chooser always appears: `prompt=select_account`); airplane mode (friendly "Hindi natuloy ang Google" alert); sign in with a Gmail that is not a test user (blocked by Google).
**Child safety:** the Google account belongs to the parent or teacher. The child uses a profile under it. Do not ask a child to sign in with Google (Google's minimum age is 13). Tell the parent in the consent text which data is kept (child nickname, progress) and that voice recordings are not stored by default (RA 10173).

## 3. Tokens

- After sign-in Supabase keeps `access_token` (about 1 hour, a JWT) and `refresh_token`. `autoRefreshToken` renews it; refresh runs only while the app is in the foreground (`supabase.ts`).
- **Storage (changed today):** the session now lives in the phone's secure store (Keychain/Keystore) in 1800-character pieces (`secureSessionStorage.ts`). An old session in AsyncStorage is moved over on first read, so nobody is signed out. If secure store fails it falls back to AsyncStorage.
- Sending it: the app calls `supabase.auth.getSession()` and sends `Authorization: Bearer <access_token>` to the backend (`useLiveTranscription.ts`, `app/index.tsx`).
- Server: `backend/src/middleware/requireAuth.ts` already verifies the JWT locally with `jose` against the project's JWKS (issuer, audience `authenticated`, expiry). Safe in the client: the **anon/publishable** key only. Never put the `service_role` key, the Google client secret, or the JWT secret in the app.
- Row Level Security is on for `children`, `unit_progress` and `attempts` (`supabase/migrations/0001`, `0002`): every policy compares `parent_id` to `auth.uid()`, so one parent cannot read another's children.
- Expired token: the backend answers 401 `token_expired`; the app should refresh and retry once. Sign-out: `supabase.auth.signOut()` clears the stored pieces.

## 4. Verification email shows a link, not a code

Your screenshots show "Confirm your email address" with a **Confirm email address** link, from **Supabase Auth**. Cause: the **Confirm sign up** template in the Supabase dashboard still uses `{{ .ConfirmationURL }}`. The app (`AuthFlow.tsx`) already asks for a 6-digit code and calls `verifyOtp`, but the email never contains one. Supabase documents `{{ .Token }}` as the 6-digit OTP, and warns that email scanners can prefetch links and make them expire.

Do now (dashboard only; the code cannot do it):
1. Authentication > Emails (or Email Templates) > **Confirm sign up**: replace the link with `{{ .Token }}`, and do the same in **Reset password**. Example body: `<h2>Basa-Bata</h2><p>Ang code mo:</p><p style="font-size:28px;letter-spacing:6px"><b>{{ .Token }}</b></p><p>Valid for 1 hour.</p>`.
2. Authentication > Emails > SMTP Settings: click **Set up SMTP** (Supabase locks the template editor until custom SMTP is on; its built-in sender only reaches the project's own team members, at 2 per hour, so it does not suffice for testers). **Chosen route (agreed in Basa-Bata v3): Gmail SMTP with an App Password**, because Resend and Brevo want a domain and we have none. Host `smtp.gmail.com`, port 465 (or 587), username = the full Gmail address, password = the Google App Password (needs 2-Step Verification), sender email = the same Gmail, sender name "Basa-Bata". The App Password lives only in the Supabase dashboard. Gmail's current limits and the form fields were not re-checked today (a third-party source says 500/day for personal accounts: unverified). Prefer a dedicated project Gmail over a personal one. Brevo is the backup: it has a 300/day free plan, but its own help pages say free-mail senders (@gmail.com) are rejected, spam-filtered or have the sender swapped, and a third-party source mentions an approval wait (unverified).
3. Sender trust: only if you later get a domain and use Resend, verify it (SPF and DKIM records the provider shows); add a DMARC record later. Without a domain, mail from a free address lands in spam: unverified, test it.
4. Code: 6 digits; expires in 1 hour by default (Authentication > Emails > Email OTP expiration; Supabase says over one day is discouraged); one request per 60 s per user (the app counts down 60 s).
Tests: new sign-up → code arrives → type on the keypad → signed in; resend after 60 s; wrong code (coral boxes, "Mali ang code"); expired code; used code; open the email on the phone (dark mode and light mode).

## 5. "mais" and "kanin"

Not fixed. The earlier fix was a plan only (`docs/AUDIO-REWORK.md`): nothing was generated or recorded because the sandbox cannot run Soniox or hear audio. Run the laptop steps there, ideally record both words with a native voice (`syllable-recorder.html`, `content:import-voice`), and have a native speaker rate them with the sheet in that file.

## 6. Wrong answers accepted (mali/ma-le, bola/bu-la, yelo/yi-lu)

What the code does (tested 2026-11-14): there is **no e→i or o→u normalization** (`normalizeUtterance` only strips accents, case and punctuation). "male", "ma-le", "bula", "bu-la", "yilo", "yi-lu" come out as **almost** (one letter off, targets of 4+ letters) or **incorrect**, never **correct**. The accepted lists exist for syllables only (English spellings of the right sound such as "too" for "tu") and words have none. `pnpm speech:confusable-test` now also asserts 17 named wrong spellings fail and 6 right ones pass, plus 18,493 look-alikes.
So if the app said Tama, the transcript itself already said "mali"/"bola"/"yelo". Most likely cause: **the recognizer, not the matcher**. The lesson sends every word of the lesson as context hints, which pulls "male" toward "mali". This is plausible but **untested**. How to test (one person speaking, 10 tries per word): run once with the default, once with `EXPO_PUBLIC_STT_CONTEXT=none` in `frontend/.env` (restart with `npx expo start --go -c`), and read the "Capi heard:" line. If "none" shows "male" and the default shows "mali", switch the default to `none` (or `target`).
Feedback changed today: a one-letter-off word ("almost") now always replays the model word after "Halos na!", and the third miss still offers "Tuloy tayo", so a child is never stuck.
Strict rule recommended: the five vowels are distinct in Marungko; everyday spelling alternates e/i and o/u, but accepting that teaches the wrong sound. If you decide to accept a variant, put it in `frontend/src/content/accepted.ts` for that one item (the self-check there stops entries that equal another lesson item).
**At-risk items in Books 1 to 4 (one vowel apart from another lesson item):** asa/isa/aso, masa/mesa/misa, pusa/puso, pato/pito, lola/lolo, and every vowel pair among the syllables (ma/me/mi/mo/mu, ba/be/bi/bo/bu and so on). Also all 30 words with e or i and 29 with o or u of 4+ letters, where a swapped vowel is "almost".
Pilot to measure false rejects: with parental consent, 3 to 5 children say 20 words each with the mic on; a teacher marks each attempt right or wrong by ear; count correct-but-rejected (false reject) and wrong-but-accepted (false accept). Do not keep the recordings (RA 10173); log only the verdicts.

## 7. Acceptance checklist
| Issue | Test | Pass |
|---|---|---|
| Google login | Expo Go and APK: sign in, kill app, reopen | Still signed in; session in secure store |
| Token refresh | Leave the app 70 minutes, open a lesson | Mic check works with no re-login |
| Email code | New sign-up with a real Gmail | Email shows 6 digits, no link, within a minute; keypad accepts it |
| mais / kanin | Native speaker with the rating sheet | Stress and ending confirmed |
| Wrong vowels | Say "male", "bula", "yilo" to mali, bola, yelo | Not Tama; "Halos na!" plus the model word |
| Right answers | Say "mali", "bola", "yelo" | Tama |

## 8. Risks and open questions
- Expo Go return from Google is unverified; if it fails, test in the APK (`marungko://` scheme).
- 100-test-user cap and 7-day refresh expiry in Testing mode (Google), and the 7-day project pause (Supabase) can break a pilot week.
- Brevo SMTP on the free plan and Resend sending without a domain: unverified.
- I cannot hear audio or reach Supabase, Google or Soniox from here.
