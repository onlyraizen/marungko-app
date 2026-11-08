# Dry-run report: voice, mic timing, first tap, "ye"

Written 2026-11-09 from the code and `content/audio-meta.json`. I cannot hear audio, so every "pronunciation / stress / intonation" cell below is for a native speaker to fill in; I only report what the files and code prove.

## Summary: most likely causes

| # | Issue | Cause | Confidence |
|---|---|---|---|
| 1 | Different voices / intonation | All 116 word clips are the same voice (Maya, `tts-rt-v2`, `tl`) but were picked from 5 different delivery styles: `2-period` 69, `1-plain` 19, `4-calm-slow` 10, `5-speed85` 9, `3-slow` 9. The 41 syllable clips were generated on 2026-10-18 with a 6th style (bare text, no period, speed 1). Loudness also varies: clip gain ranges from -2.8 dB to +10.7 dB (ubas +10.7, kahel +7.0). | High for "mixed delivery", unverified for each clip's pronunciation |
| 2 | Examples spoken | `LessonScreen` played `[target, example.word]` on every item and on every speaker tap. | Certain |
| 3 | Slow mic | The mic button was locked while Capi spoke, and Capi spoke the syllable plus the example word. The player reported "finished" only every 500 ms (default `updateInterval`). A 450 ms delay came before speech. Clip silence is NOT the cause: measured median 78 ms leading and 124 ms trailing silence (max 175 ms). | High |
| 4 | Double tap | Not reproduced (no device here). Suspects, all fixed defensively: the speaker was disabled while Capi spoke; every clip awaited an audio-mode switch; `play()` was called right after `replace()` before the file was loaded. | Medium |
| 5 | "ye" heard as "yeah" | Soniox hears a bare 2-sound utterance with no context and chooses a common English word. | High |

## A. Voice audit

Sources: words = TTS (Maya), syllables = TTS (Maya, plain), nothing is recorded or cloned yet.

| Clip | Source | Voice / settings | Pron. OK? | Stress OK? | Intonation matches? | Action |
|---|---|---|---|---|---|---|
| baka | TTS | Maya, `2-period`, gain +1.1 dB, 0.60 s | rate | rate | rate | ladder step 1 |
| bibig | TTS | Maya, `2-period`, +1.7 dB, 0.85 s | rate | rate | rate | ladder step 1 |
| kanin | TTS | Maya, `2-period`, -0.6 dB, 0.68 s | rate | rate | rate | ladder step 1 |
| bituin | TTS | Maya, `2-period`, +0.6 dB, 0.94 s | rate | rate | rate | ladder step 1 |
| dahon | TTS | Maya, `2-period`, +0.2 dB, 0.77 s | rate | rate | rate | ladder step 1 |
| si ma be bi bu se ta te tu ke ki ko ku la le lo lu ye yu ga | TTS (generated 2026-10-18) | Maya, bare text, speed 1, not in the repo (laptop only) | rate | n/a | differs from the 69 `2-period` words by construction | regenerate in the same style as the words, rate, then record the failures |

Scan for other risky clips (none can be judged without listening):
- 47 words use a style other than `2-period`: abo anim apat asa ate bahay baso bola bulaklak dalawa dila dilaw ibon ilong isda kabayo kahel kuya lapis lola lolo magaling mali mama manok masa mata papel pato pito pula pusa sabi saging sama sampu tasa tenga ubas ube yaya yelo (42 single words listed; the rest are phrases). Rate these first for intonation mismatch.
- Extreme gain (needs a loudness re-check): ubas +10.7, kahel +7.0, sisiw +6.9.
- Longest word clips: ubas 1.19 s, mansanas 1.11 s, lapis 1.11 s, bahay 1.11 s (check for drawn-out delivery).

Single-source rule (proposed): one voice (Maya, or a clone or your recording later); one style, `"<text>."` with no tags and no speed change; one loudness (`pnpm content:normalize-audio`); one file name per item, `<audioKey>.wav` (`ma.wav`, `saging.wav`); `content/audio-meta.json` must list `variant: "2-period"` for every TTS clip. Anything else is a recorded clip, marked `voice: "human"`.

Fix ladder per failing clip: (a) respell in `content/tts-respell.json`; (b) `--speed 0.9` for that item; (c) regenerate twice and keep the better take; (d) record it and import with `pnpm content:import-voice`.

Example speech: removed. The only trigger was `LessonScreen.tsx` (the auto-play effect and the speaker `onSpeaker`); both now play `[target]` only. The example word and its picture are still shown.

## B. Mic timing

Measured from the files: leading silence median 78 ms, trailing median 124 ms (max 175 ms), so trimming silence would save about 0.1 s and is not the main cost.

Estimated wait before the child could tap the mic, for a syllable item (word clips median 0.77 s; syllable clips unmeasured here):

| | Before | After |
|---|---|---|
| Start delay | 450 ms | 300 ms |
| Syllable clip | ~0.8 s | ~0.8 s |
| Example word clip | ~0.8 s | removed |
| "Finished" event lag (500 ms poll, per clip) | 0 to 500 ms x 2 | 0 to 100 ms x 1 |
| Mic locked until audio ends | yes | no: tapping the mic stops Capi and listens |
| Total | about 2.1 to 3.1 s | about 1.1 to 1.2 s, and 0 s if the child taps early |

Not measured on a device (unverified): the speech connection set-up after the tap. The app already prepares the speech key while the child looks at the word (`prepare()`). To measure: tap the mic, count the time to the "listening" pill, on 10 clips, with `Date.now()` logs; target under 500 ms. The mic only opens on a tap, so there is no echo risk.

## C. First-tap playback

Changes in `useGuideAudio.ts`: 100 ms status updates; audio mode switched once, then reused for 2.5 s (and reset when the mic opens); wait up to 0.7 s for the file to load before `play()`; if the clip has not started 380 ms later, press play once more (logs `[guide] clip had not started` in development builds). The speaker is no longer disabled while Capi speaks: tapping it restarts the clip.

Check: in a development build, tap the speaker on 20 words; any `[guide] clip had not started` warning tells me which clips still need the nudge.

## D. "ye" and the short syllables

Why: with only one sound, recognition prefers a likely English word ("yeah", "tea", "you"). Layers now in the app: `language_hints: ["tl"]` and this lesson's items as context terms (already there), and a tight list of accepted spellings in `frontend/src/content/accepted.ts` (79 spellings for 41 syllables). A self-check proves no spelling is another lesson syllable or shared by two. Each list holds only spellings of the CORRECT sound.

| Syllable | Also accepted | Why |
|---|---|---|
| ye | yeah, yeh, yay, yey | "yeah" is the reported case. NOT "ya": it is its own syllable. |
| yu | you, yoo, yew | English "you" |
| bi / mi | bee / mee | English "bee". "be" and "me" are NOT accepted for bi and mi because be and me are lesson syllables. |
| si, ti, ki, li | see, sea / tea, tee / key, kee / lee | English words |
| be, te, ke, le, se, me | beh, bay / teh, tay / keh, kay / leh, lay / seh, say / meh, may | /e/ is written "ay" or "eh" |
| bu, mu, su, tu, ku, lu | boo / moo / sue, soo / too, two / coo / loo | English words |
| mo, bo, so, to, ko, lo, yo | moh, mow, moe / boh, bow, beau / soh, sew / toe, toh / co, koh / low, loh / yoh | English words |
| ma, sa, ta, ka, la, ya, na, ga, pa, ra, da, ha, wa | the "-ah" spelling | |

Known gap: the e/i and o/u pairs. If the recognizer writes "bee" for a child's /bi/ and the target is "be", it is rejected, which is correct; if it writes plain "be" for /bi/, it passes "be" targets. That cannot be solved by lists, only by teacher listening.

Not built yet (decide with your teacher): after 2 misses on the same item, replay the model clip and show "Tuloy"; there is already "DI MAKAPAGSALITA NGAYON" to skip.

## E. Test plan

| Test | How | Pass |
|---|---|---|
| Voice regression | native speaker rates stress, clarity, speed, "uh", consistency, 1 to 5 for every clip in section A, the 47 other-style words, and the 30-word set (`pnpm voice:test`) | under 10% of items score 2 or less |
| Timing | stopwatch or log, 10 clips across Books 1 to 4, last sound to mic tap accepted | mic usable at once; listening within 500 ms of the tap |
| First tap | 20 words on 2 iPhones, development build | zero double taps, no nudge warnings |
| STT | each syllable and word 5 times by an adult and, if possible, 2 to 3 children | pass rate reported per item; "ye" and "yelo" pass 5 of 5; no wrong answer accepted |
| Example speech | listen through Books 1 to 4 | zero example words spoken |
