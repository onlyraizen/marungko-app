# Syllable rework: record every syllable of Books 1 to 4

Written 2026-11-09. Reported problem: a clip such as "ma" says "mabuda" (more than the syllable), and the same happens on other two-letter syllables. I cannot hear audio, so everything below about how a clip *sounds* is for a Filipino teacher to judge; what I could measure is measured by `pnpm content:syllable-check`.

## Plan and recommended route

**Route A for all 41 syllables: record a real human voice.** Soniox TTS is kept for words and phrases only.

Why:
- The syllable clips were made by text-to-speech from a bare two-letter text. A clip that says "mabuda" for "ma" is the engine inventing sounds around a text that is too short to be a word. Why exactly it happens is **unverified**; the tester report is the evidence. To test it: generate `ma` five times (`pnpm content:audio -- --yes --syllables --only ma --out-dir ~/try`) and run `pnpm content:syllable-check -- --dir ~/try --any-source`. If length or beats vary from take to take, TTS cannot be trusted for syllables.
- No documented Soniox setting controls vowel purity, the "uh" after b/t/k/d/p/g, or the end of the sound (see the capability map in `docs/VOICE.md`). Cloning copies voice, not correct pronunciation.
- A syllable is the core of the lesson. A recording by a teacher is checked once by ear and never changes.
- 41 clips are about 20 minutes of recording. Cost: nothing.

**Hybrid decision rule:** a clip ships only if (1) it is your own recording and scores 4 or more on pronunciation and intonation, or (2) it is TTS, passes `content:syllable-check` and scores 4 or more. For single syllables, only (1) is used. Words and phrases stay on Maya unless a teacher rates one below 4 (then: fix ladder, then record it).

**Voice match:** your recording will not sound like Maya. The tester already complained about mixed voices. Choose one: (a) a teacher whose pitch is close to Maya (median pitch of the word clips: about 175 Hz; the check script prints the gap for every clip), (b) later record the words in the same voice (116 words, about 1 hour), or (c) clone the recording voice for words (Soniox cloning is documented, but pronunciation is not guaranteed; see `docs/VOICE.md` section 5).

## 1. Syllable inventory

Source of truth: `content/units/01` to `04` (41 syllables). The lessons contain **no** vowel-consonant syllables (am, as); the only such item is the word "mais". The `ng` digraph is not a lesson item. The 19 letter sounds (m, a, s, ...) are separate clips and are not part of this rework.

Status "wrong (tester report)" = in the tester's list: si ma be bi bu se ta te tu ke ki ko ku la le lo lu ye yu ga. The other 21 were made in the same batch, so I treat them as unknown, not good. The clip files exist only on your laptop, so I could not measure them here: run `pnpm content:syllable-check` there.

| Syllable | Book | Current source | Status | Action |
|---|---|---|---|---|
| ma | 1 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| sa | 1 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| mi | 1 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| si | 1 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| mo | 1 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| so | 1 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| ba | 2 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| be | 2 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| bi | 2 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| bo | 2 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| bu | 2 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| me | 2 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| se | 2 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| mu | 2 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| su | 2 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| ta | 3 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| te | 3 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| ti | 3 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| to | 3 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| tu | 3 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| ka | 3 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| ke | 3 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| ki | 3 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| ko | 3 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| ku | 3 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| la | 3 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| le | 3 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| li | 3 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| lo | 3 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| lu | 3 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| ya | 3 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| ye | 3 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| yo | 3 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| yu | 3 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| na | 4 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| ga | 4 | TTS, laptop only (2026-10-18) | wrong (tester report) | Record (Route A), replace |
| pa | 4 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| ra | 4 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| da | 4 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| ha | 4 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |
| wa | 4 | TTS, laptop only (2026-10-18) | unknown, same batch | Record (Route A), replace |

## 2. Pronunciation guide

One rule for all: **five pure vowels, clean consonants, one short sound.**

| Vowel | IPA | How |
|---|---|---|
| a | [a] | open, short "ah"; not "uh", not "aw" |
| e | [ɛ] (some speakers [e]) | like "e" in "bed"; not English "ay" (no glide). **Teacher to confirm the vowel they teach.** |
| i | [i] | short and steady; not a long or gliding English "ee" |
| o | [o] | pure round "o"; not English "oh" (no glide to "oo") |
| u | [u] | short and steady; not a long or gliding English "oo" |

| Consonant | IPA | How |
|---|---|---|
| m, n | [m] [n] | steady hum straight into the vowel |
| s | [s] | clean, no "sh" |
| b | [b] | voiced, lips pop straight into the vowel; no "buh" |
| d | [d̪] | tongue tip on the upper teeth; no "duh" |
| g | [ɡ] | hard, voiced; no "guh" |
| t | [t̪] | tongue tip on the upper teeth; **no puff of air**; no "tuh" |
| k | [k] | **no puff of air** (unlike English "key"); no "kuh" |
| p | [p] | **no puff of air**; no "puh" |
| l | [l] | clear "l", tongue tip up (not English dark "l") |
| r | [ɾ] | one quick tap, not English "r" |
| y | [j] | glide, like "y" in "yes" |
| w | [w] | rounded lips glide |
| h | [h] | light breath then the vowel |

Length: the sound itself 0.30 to 0.55 s, slow and steady (about 20 to 30 percent slower than speech), ending slightly lower in pitch. Not a question tone, no sing-song.

Per syllable (the rightmost column is what Soniox speech recognition is likely to write for a correct child answer; see section 6):

| Syllable | IPA | Watch for | Recognised as |
|---|---|---|---|
| ma | /ma/ | Plain, steady. | mah, maa |
| sa | /sa/ | Plain, steady. | sah, saa |
| mi | /mi/ | Not English "mee" | mee |
| si | /si/ | Not English "see" | see, sea |
| mo | /mo/ | Not English "moh-w" (glide) | moh, mow, moe |
| so | /so/ | Not English "so" (glide) | soh, sew |
| ba | /ba/ | stop: no puff, no "uh". Plain, steady. | bah, baa |
| be | /bɛ/ | stop: no puff, no "uh". Not English "bay" | beh, bay |
| bi | /bi/ | stop: no puff, no "uh". Not English "bee" (glide) | bee |
| bo | /bo/ | stop: no puff, no "uh". Not English "bow/beau" (glide) | boh, bow, beau |
| bu | /bu/ | stop: no puff, no "uh". Not English "boo" (long) | boo |
| me | /mɛ/ | Plain, steady. | meh, may |
| se | /sɛ/ | Not English "say" | seh, say |
| mu | /mu/ | Not English "moo" | moo |
| su | /su/ | Not English "sue" | sue, soo |
| ta | /t̪a/ | stop: no puff, no "uh". Not aspirated English "tah" | tah, taa |
| te | /t̪ɛ/ | stop: no puff, no "uh". Not English "tay" | teh, tay |
| ti | /t̪i/ | stop: no puff, no "uh". Not English "tea" | tea, tee |
| to | /t̪o/ | stop: no puff, no "uh". Not English "toe" (glide) | toe, toh |
| tu | /t̪u/ | stop: no puff, no "uh". Not English "too" (puff + long) | too, two |
| ka | /ka/ | stop: no puff, no "uh". Plain, steady. | kah, kaa |
| ke | /kɛ/ | stop: no puff, no "uh". Not English "kay" | keh, kay |
| ki | /ki/ | stop: no puff, no "uh". Not English "key" (puff + long) | key, kee |
| ko | /ko/ | stop: no puff, no "uh". Not English "koh-w" (glide) | co, koh |
| ku | /ku/ | stop: no puff, no "uh". Not English "coo" | coo |
| la | /la/ | Plain, steady. | lah, laa |
| le | /lɛ/ | Not English "lay" | leh, lay |
| li | /li/ | Not English "lee" | lee |
| lo | /lo/ | Not English "low" (glide) | low, loh |
| lu | /lu/ | Not English "loo" | loo |
| ya | /ja/ | Plain, steady. | yah, yaa |
| ye | /jɛ/ | Not English "yeah" (also the recogniser hears it as "yeah") | yeah, yeh, yay, yey |
| yo | /jo/ | Not English "yo" | yoh |
| yu | /ju/ | Not English "you" (long, with a glide) | you, yoo, yew |
| na | /na/ | Plain, steady. | nah, naa |
| ga | /ɡa/ | stop: no puff, no "uh". Not soft or aspirated "g" | gah, gaa |
| pa | /pa/ | stop: no puff, no "uh". Plain, steady. | pah, paa |
| ra | /ɾa/ | Not English "r" instead of a tap | rah, raa |
| da | /d̪a/ | stop: no puff, no "uh". Plain, steady. | dah, daa |
| ha | /ha/ | Plain, steady. | hah, haa |
| wa | /wa/ | Plain, steady. | wah, waa |

Most commonly mispronounced by English speakers and TTS: be (bay), bi (bee), bu (boo), ke (kay), ki (key), ku (coo), te (tay), tu (too), se (say), le (lay), lu (loo), ta (puffed "tah"), ye (yeah), yu (you), ga (soft g), ko/lo/mo/so/to (glide "oh-w").

## 3. Production plan

### Route A (recommended): recording sheet

1. **Room:** quiet, no fan or aircon, soft furniture or a blanket to kill echo. Phone off or on airplane mode.
2. **Mic:** laptop mic works for a first pass; a phone voice recorder or a headset mic is better. Mouth 15 to 20 cm away, slightly off-axis so p, b, t do not pop. Same distance for all 41. Turn off noise suppression and automatic gain (the recorder page already does).
3. **Tool:** `pnpm content:build-recorder`, then open `docs/syllable-recorder.html` in Chrome. Click "Allow the microphone". It records 2.5 s per press, you say the syllable once, and it warns about clipping, a silent take, or a take longer than one syllable. (If you prefer a phone recorder: one file per syllable, named `ma_syllable.wav`.)
4. **Pace:** say it once, calm and slow, as a teacher modeling one sound; smile slightly; fall a little at the end. Do not drag the vowel; do not add "uh". One second of silence before and after.
5. **Takes:** 3 per syllable. Play them, press "Use this" on the best. Record all 41 in one sitting so voice and level stay the same.
6. **Export:** "Download zip". The zip has `ma_syllable.wav`, ... and `picked.csv`. Master quality is whatever the browser captured (usually 48 kHz). If you record elsewhere, keep a 48 kHz 24-bit WAV master.
7. **App format:** the import step trims silence, converts to 24 kHz mono 16-bit WAV (about 0.5 s is about 24 KB, 41 clips about 1 MB), and normalizes loudness. WAV is kept: it is small enough to preload on first tap, so no compressed copy is needed.
8. **Silence:** target lead 30 to 50 ms, tail 60 to 100 ms. I measured a test clip through the import filter: lead 30 ms, tail 93 ms, which meets your 50 and 100 ms, so I keep your numbers (the limits in the check script are looser: 60 and 130 ms, to avoid false alarms). Do not cut tighter: a stop consonant cut too early sounds clipped.
9. **Loudness:** `pnpm content:normalize-audio` (speech level about -16 dB RMS, peak below -1 dB, same as the word clips).
10. **Privacy:** these are an adult teacher's voice; get her consent to use her voice in the app. No child recording is made or stored.

Commands (Git Bash, in `~/marungko-app`; ffmpeg needed: `winget install Gyan.FFmpeg`, then reopen the terminal):

```
git pull origin redesign-basa-bata
pnpm content:build-recorder
# open docs/syllable-recorder.html in Chrome, record, download basa-bata-syllables.zip, unzip to ~/syllables
pnpm content:syllable-check -- --quarantine          # dry run: lists the old computer-voice syllable clips
pnpm content:syllable-check -- --quarantine --yes    # moves them to content/_old-tts-syllables (nothing deleted)
pnpm content:syllable-check -- --dir ~/syllables --any-source     # measure the new takes before import
pnpm content:import-voice -- --from ~/syllables --yes
pnpm content:normalize-audio
pnpm content:audio -- --manifest-only --syllables
pnpm content:syllable-check                           # must say every clip is human, 0 need attention
```

### Route B (Soniox TTS), only as a test or a stopgap

Verified settings (`docs/VOICE.md`, checked 2026-10-18): model `tts-rt-v2`, language `tl`, voice Maya or a cloned voice id, `speed` 0.7 to 1.3 (keep near 1), `wav` 24 kHz, no tags on phonics core, `reduce_silence` off. Fix ladder per failed syllable: (a) respell or add punctuation in `content/tts-respell.json` (what respelling makes Soniox read "ma" alone is **unverified**: try `ma.`, `"ma"`, `ma-`), (b) `--speed 0.9`, (c) regenerate twice and compare with `content:syllable-check`, (d) record it. Given the "mabuda" report, expect to end at (d) for many syllables, so go to Route A directly.

## 4. QA rubric

A native Filipino speaker scores each clip 1 to 5 on each line. Use this as a sheet (one row per syllable).

| Line | 5 | 3 | 1 |
|---|---|---|---|
| Vowel purity | pure, steady, no glide | slightly English | clearly English or wrong vowel |
| Consonant clarity | clean and crisp | soft or slightly puffed | unclear, wrong consonant |
| No extra "uh" | none | faint | clear "uh" or extra syllable |
| Intonation | neutral, slightly falling | flat or slight rise | question or sing-song |
| Pace | slow and steady | a little fast or drawn out | rushed or dragged |
| Silence trim | tight, even | a bit loose | long gaps or clipped sound |
| Loudness | same as the others | 2 dB off | very different |
| Voice consistency | same voice and distance | slightly different | different person or room |

**Pass rule:** pronunciation (vowel, consonant, "uh") and intonation must each be 4 or more. Anything lower is redone (re-record, or step down the ladder). Silence, loudness and voice lines can be fixed by the tools; rescore after.

Child check (3 to 5 children, with a parent's consent, nothing recorded): play each syllable once and ask the child to say it back. Count children who repeat it correctly and any who hear a different sound. Redo any clip two or more children get wrong.

`pnpm content:syllable-check` measures what a ruler can: source (human or not), length (over 0.70 s means extra sounds), several vowel beats (a heuristic: a one-syllable clip should show one; it is unreliable for nasal and glide words, so a "?" flag means listen), silence at both ends, loudness against the other clips, clipping, pitch against the guide voice and a rising end (heuristic). It does not replace the listening above.

## 5. Replacement and integration

- **Naming:** recorder zip `ma_syllable.wav` becomes the app file `frontend/assets/audio/words/ma.wav`. The app finds a clip only by `audioKey(text)`, so there is no second name that could be picked up by mistake. `content/audio-meta.json` records `voice: "human"` for every imported clip.
- **Old and new cannot mix:** `--quarantine` moves every syllable clip that is not marked human to `content/_old-tts-syllables/` before the import. A syllable with no clip shows no speaker button (the app plays only the saved file; there is no text-to-speech call and no fallback voice, checked in `useGuideAudio.ts`: it looks up `AUDIO[audioKey(text)]` only).
- **Stale cache:** after importing, rebuild the list (`--manifest-only --syllables`) and start Expo with `npx expo start --go -c` (clears the Metro cache). Fully close and reopen Expo Go on the phone.
- **Confirm no old clip survives:** `pnpm content:syllable-check` prints the source of all 41 clips; every one must say `human`, and the summary must say 0 need attention.
- **Example audio:** removed in commit `b03d95b`. The only places the guide speaks are the target (`LessonScreen`), the quiz word (`TapQuiz`), praise and the result line. Verified by searching every `say` and `sayAll` call.
- **After replacement, check on a phone:** (1) first-tap: tap the speaker once on all 41 syllables; zero double taps; (2) mic-open: tap the mic right after the clip ends, "listening" shows within 500 ms (stopwatch or screen recording; ask me to read frames from a recording); (3) the speaker stays available while the clip plays.

## 6. Speech recognition follow-up

Already in the app (`frontend/src/content/accepted.ts`): a list of English spellings accepted for a CORRECT child answer, with a self-check that none is another lesson syllable. At risk of being written as an English word: ye (yeah), yu (you), bi (bee), mi (mee), si (see), ti (tea), ki (key), li (lee), tu (too, two), ku (coo), lu (loo), mu (moo), bu (boo), su (sue), and the e-syllables (bay, say, lay, may, kay, tay) and o-syllables (toe, low, moh). The full list is in the "Recognised as" column in section 2.

- Language hint `tl` and per-lesson context terms (this lesson's items only) are already set (`useLiveTranscription.ts`, `docs/VOICE.md` section 8). Whether Soniox's models honour context for one-syllable audio is unverified: the test below shows it.
- Keep the lists tight: "ya" is not accepted for "ye"; "be" is not accepted for "bi" or "me" for "mi" because both are lesson syllables.
- Not built: after 2 misses, replay the model clip and offer a "Tama ito" parent button.
- **Test after re-recording:** each syllable 5 times by an adult, report pass rate and any spelling that is not on the list (dev builds print what was heard). Add a spelling only after your teacher agrees it is the correct sound.

## 7. Acceptance criteria

- 41 of 41 syllable clips are human recordings, rated 4 or more by a native speaker on pronunciation and intonation.
- `pnpm content:syllable-check` reports 0 clips needing attention (no clip over 0.70 s, same level, no clipping).
- Zero example audio; zero double taps on first tap (2 devices); mic listening within 500 ms of the tap.
- Every syllable passes speech recognition 5 of 5 for an adult; "ye" and "yelo" included.
