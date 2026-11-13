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
| Arrow guide on speaker | Pulsing coral ring + bouncing yellow arrow around the speaker (arrow under it in the quiz, to its left in Repeat). In the quiz it comes back on every question until the speaker is tapped; in Repeat it shows until the first tap in a session. Palette in the design Kit matches `theme/colors.ts` (no change needed) | `GuideHint.tsx` |

Generate the new audio on the laptop:

```
git pull
pnpm content:audio -- --yes --syllables
pnpm content:audio -- --english --yes --syllables
pnpm content:phrases-check
```


## Pond theme for the account screens

The five brown sign-in screens (loading, welcome, meet Capi, saved accounts, details/code) now use the game's pond palette: sky `#D9F0FA`, white cards, green main button, light-blue second button, link blue `#14688F`, brown only for text. Backgrounds (`assets/art/backgrounds/*.png`) are PNGs rasterised from the design canvas SVGs (static frame; the wave animation is not played). Not done: the brown header band on the details screen, and the splash stays brown, as the designer left it.

## Nov 14 round: guides, picture quiz, part intro, parent override, email code

| Change | Where | Notes |
|---|---|---|
| First-time arrow guides (registry, one at a time, "Sige", reset) | `frontend/src/guides/coach.ts`, `GuideHint.tsx`, Settings > reset guides | Ids: lesson_intro, quiz_syllable_build, quiz_picture_choice, quiz_listen_pick, speaker_button, mic_button. Stored per child on the device. |
| Three quiz formats rotating (build the word, picture to 3 words, hear the word and pick 1 of 4 pictures) | `content/quiz.ts`, `TapQuiz.tsx` | Picture formats only for words with a picture. Choice distractors: same syllable count, different first letter. Listen distractors: other pictured words with different first letters, so the ear decides. The listen format picks then taps CHECK (the design taps once), to avoid accidental answers. |
| Part intro redesign (BAHAGI chip, example tiles, clap dots, Capi, SIMULAN) | `PartIntro.tsx` | Example = first single word of the part, with a speaker. The old combo/progress header is not shown here. |
| Parent "Tama ito" (hold 3 s, then confirm) | `ParentOverride.tsx`, lock button on the try-again sheet | Counts as a correct answer and sends the note `magulang-tama`. Hold gesture is not screen-reader friendly. |
| Email code with in-app number pad and wrong-code state | `auth/CodeKeypad.tsx`, `CodeStep` | A forgotten password asks the code first, then the new password (two steps). |
| FIL/EN removed from "Enter your details" | `AuthFlow.tsx` | Still on Welcome, Meet, Sign back in and Settings. |
| Audio rework plan (so, tu, mais, kanin) | `docs/AUDIO-REWORK.md` | Not fixed yet; needs the laptop and a native speaker. |

Not applied from the design canvas: Settings "Suporta" list (Tulong, Puna, Mag-log out, Mga tuntunin, Privacy, Mga pasasalamat; Settings2), because those pages and the log-out placement are not defined in the app yet.
