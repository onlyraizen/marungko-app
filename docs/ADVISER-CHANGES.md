# Adviser and IT-expert feedback: what changed

| Feedback | Change | Where |
|---|---|---|
| More cheerful narrator on correct answers | 10 rotating praise lines (Filipino + English), 7 new Filipino clips to generate | `lessonText.ts`, `content/phrases.json` |
| One-syllable and two-syllable items in their own groups | Lesson is split into parts by syllable count (1, 2, 3, 4+). Each part: intro, practice, its own 3-question tap quiz. A one-syllable quiz never shows a two-syllable word like "mama" or "motor" | `content/parts.ts`, `content/quiz.ts`, `PartIntro.tsx`, `LessonScreen.tsx` |
| "mo" accepts "moooooo" | Too-long check and quiet-based accept, see `SPEECH-CHECK.md` | `speech/pace.ts`, `speech/attempt.ts` |
| English version of cheerful lines, with an option | Language switch (Filipino / English) at login and in Settings; English clips are `en-<key>.wav`, Filipino clip is the fallback | `i18n/`, `useGuideAudio.ts`, `content/phrases-en.json` |
| Slow mode out of Settings, button in the game | "MABAGAL" text button under the speaker in practice and quiz (as in the design canvas) | `RepeatView.tsx`, `TapQuiz.tsx` |
| Email link to localhost with exposed token | Email code (OTP) instead of link, PKCE flow; dashboard steps in `AUTH-SETUP.md` | `AuthFlow.tsx`, `services/supabase.ts` |
| Google Log-In | Not implemented; needs Google Cloud + Supabase setup and a dev build | |
| Arrow guide on speaker | Pulsing coral ring + bouncing yellow arrow around the speaker (arrow under it in the quiz, to its left in Repeat), shown until the first speaker tap in a session. Palette in the design Kit matches `theme/colors.ts` (no change needed) | `GuideHint.tsx` |

Generate the new audio on the laptop:

```
git pull
pnpm content:audio -- --yes --syllables
pnpm content:audio -- --english --yes --syllables
pnpm content:phrases-check
```
