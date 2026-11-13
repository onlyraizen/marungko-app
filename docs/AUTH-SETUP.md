# Auth setup: email code instead of email link

Why this exists: the validation found that the confirmation email sent the user to a
`localhost` URL with the access token in the address bar. Two causes:

1. Supabase's default **Site URL** is `http://localhost:3000`, so the `{{ .ConfirmationURL }}`
   link in the default templates points there.
2. The default sign-in flow is *implicit*, which puts `access_token` and `refresh_token` in the
   URL fragment after the redirect.

The app now avoids both: the email carries a **6-digit code** and the child's parent types it
into the app. No link, no redirect, no token in any URL.

## What the code already does

- `frontend/src/services/supabase.ts` uses `flowType: "pkce"` (no tokens in URLs even if a link
  is ever used again).
- `frontend/src/components/auth/AuthFlow.tsx`:
  - sign-up asks for the code (`verifyOtp({ email, token, type: "signup" })`) and has a
    "send again" button (`resend`);
  - "forgot password" sends a code, then asks for code + new password
    (`verifyOtp({ type: "recovery" })` then `updateUser({ password })`).
- Nothing logs tokens; the backend only reads the `Authorization` header and verifies it.

## What YOU must change in the Supabase dashboard (the code cannot do this)

Without step 1 the email still contains the old link, because the template lives in Supabase.

1. **Authentication → Email Templates**
   - *Confirm signup*: replace `{{ .ConfirmationURL }}` with `{{ .Token }}`. Example body:
     ```html
     <h2>Basa-Bata</h2>
     <p>Ang code mo para i-confirm ang account:</p>
     <p style="font-size:28px;letter-spacing:6px"><b>{{ .Token }}</b></p>
     <p>Valid for 1 hour. If you didn't sign up, ignore this email.</p>
     ```
   - *Reset password*: same change.
   - *Magic link* (only if you enable it later): same change.
2. **Authentication → URL Configuration**
   - Set **Site URL** to something that is not localhost (your Railway URL or the app scheme).
   - Remove every `localhost` entry from **Redirect URLs**.
3. **Authentication → Emails → SMTP Settings**: set up a custom SMTP provider (e.g. Resend,
   Brevo, Gmail app password). The built-in sender is limited to **2 emails per hour for the
   whole project**, which will break a live demo with several testers.
4. **Authentication → Providers → Email**: keep "Confirm email" ON; OTP expiry defaults to 1 hour
   (can be lowered, e.g. 15 minutes).

## Re-test (for the thesis evidence)

1. Sign up with a fresh email → the email must show a 6-digit code and no link.
2. Type the code in the app → account is confirmed and signed in.
3. Wrong code → friendly message, no red X, can resend.
4. "Forgot password" → code → new password → can log in.
5. Search the Railway logs and the Expo console for `access_token`: there should be none.

## Not done / limits

- Supabase rate limits still apply (one code request per user per 60 s; sign-up/verify 30 per
  5 minutes per IP). The app shows a friendly "too many tries" message.
- The anon key in the app is public by design (Row Level Security protects data). The
  **service-role key must never be put in the app**; it stays only in `backend/.env` / Railway.
- Google sign-in is not implemented yet; see the notes in the project chat.
