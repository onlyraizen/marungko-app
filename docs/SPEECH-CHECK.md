# Speech check: hardening against rushed pronunciation

Written 2026-11-09. Finding: a panel member sped up his pronunciation of nearly every word ("pato" and others) and the app still said Tama. The syllable audio pipeline was not touched.

## Summary: the loopholes and the fix order

**The recogniser was never asked how fast the word was said.** Speech recognition returns text, and fast speech is easy for it, so "pato" in 0.25 s is the same answer as "pato" in 0.6 s. Nothing in the app measured time, and the confidence number was computed but only shown in development builds. That is the main loophole and it affects every word at once (certain: read in the code). Context hints (`context.terms` = every item of the lesson) may make it worse by pulling a rushed attempt onto the target (plausible, not tested).

Not loopholes (checked): the accepted lists (syllables only: spellings of the right sound; words have none), and the text match (exact after case, punctuation and spaces; 18,493 look-alikes of the 123 lesson items were tried and none passed).

Fix order, all done in this commit except where marked:
1. **Pace guard** from the microphone itself (new, enforced by default).
2. **Gentle "Almost" outcome** for a right word said too fast, with a slow-down message and no buzzer or red cross.
3. **Never stuck**: 2nd miss replays the word, 3rd miss makes "Tuloy tayo" the main button.
4. **Confidence**: measured and logged, not yet enforced (needs calibration).
5. **Context A/B switch** (`EXPO_PUBLIC_STT_CONTEXT`) so you can test hints on and off with a person speaking.
6. Not done: "Tama ito" parent override (your decision, see section 9).

What a recogniser can and cannot tell us: it transcribes words. It does not grade vowel purity, a swallowed consonant or enunciation, and its confidence is "how sure am I of this text", not "was it said well". Only the pace, measured by the app, can say "squeezed". Whether each sound was clear still needs a teacher's ears.

## 1. Root-cause analysis

| Cause | Verdict | Evidence |
|---|---|---|
| No check on word duration or rate | **Certain** | `LessonScreen` judged only `matchUtterance(text)`. The hook's `Token` type had no timing fields. |
| Confidence not used | **Certain** | The hook averaged final-token confidence into `confidence`; `LessonScreen` only printed it in a development line. For early-accepted answers it was often `null` (tokens not yet final). |
| Only the final transcript checked, no timestamps | **Certain** | Same as the first row. |
| Context biasing toward the target | **Plausible, untested** | `start(items)` sends every item of the lesson as `context.terms`, plus `language_hints ["tl"]`. Hints are meant to pull audio toward those words. Whether they let a blur through is what the A/B test (section 4) decides. |
| Accepted list too loose | **No** | Words have no list. Syllables list only spellings of the correct sound; a self-check proves no entry is another lesson item. |
| Matching too forgiving | **No** | Exact after normalising. "Almost" (a retry, not a pass) is only one letter off and only for targets of 4+ letters. `pnpm speech:confusable-test`: 123 targets, 18,493 look-alikes, 0 accepted. Saying the word twice ("ma ma") or syllable by syllable ("pa to") passes by design. |
| Endpoint or mic timing clips input | **No for this problem** | Endpoint is patient (level 2, 1000 ms). A right answer is accepted 450 ms after the text matches; that ends listening but cannot make a word faster. |

Snippets that would have confirmed it, if you want to double check: `LessonScreen.tsx` (matching), `useLiveTranscription.ts` (config at `socket.onopen`), `src/content/accepted.ts`.

## 2. Speed and rate guard (main fix)

### What is measured
Soniox tokens may carry `start_ms` and `end_ms`. **Unverified**: only a third-party copy of the Soniox schema (SLNG AsyncAPI) lists them, as optional; the official page could not be opened from this environment. So the guard does not depend on them. It measures the microphone audio on the phone: loudness for every 10 ms (a number, never audio kept), then first sound to last sound (`src/speech/pace.ts`). The token timing is read too, logged as `tokenSpanMs`, so you can compare once you see real values. Test: run one attempt in a development build and look at the `[speech]` line in the Metro console; `tokenSpanMs: null` means Soniox did not send timing.

### The rule (starting values; tunable)
- **Yardstick:** how long the guide voice's own clip of that same word takes, first sound to last sound (`src/speech/wordPace.ts`, 81 words, made by `pnpm speech:pace-test -- --write-table`). Median 540 ms for 2 syllables, 730 ms for 3. A word with no clip uses 330 + 220 ms per extra syllable.
- **Rushed** (2+ syllables): the attempt takes less than 0.6 of the yardstick, or more than 7.5 syllables per second.
- **Floor** (any word or syllable): under 100 ms per syllable is a click or blur.
- Too slow is never penalised. Children reading sound by sound take 1.5 to 3 times longer; that is Marungko.
- Not measurable (no loud enough sound, microphone problem): the guard steps aside and the text decides.

| Preset (`EXPO_PUBLIC_PACE_MODE`) | min ratio | max syll/s | floor | Catches (simulation) |
|---|---|---|---|---|
| `lenient` | 0.50 | 8.0 | 90 ms | about 2.2x and faster |
| `balanced` (default) | 0.60 | 7.5 | 100 ms | about 1.7x and faster |
| `strict` | 0.70 | 6.5 | 110 ms | about 1.5x and faster |
| `off` | | | | nothing |

Simulation (guide voice clips sped up with ffmpeg, 80 words of 2 or more syllables; `pnpm speech:pace-test`). "Rushed" = judged "Almost, slow down":

| Speed | lenient | balanced | strict |
|---|---|---|---|
| x0.8 (slower) | 0% | 0% | 0% |
| x1 | 0% | 0% | 0% |
| x1.25 | 0% | 1% | 5% |
| x1.5 | 1% | 8% | 88% |
| x1.75 | 11% | 83% | 100% |
| x2 | 30% | 100% | 100% |
| x2.5 and x3 | 100% | 100% | 100% |

Read it with care: this is a clear computer voice sped up, not a rushed person and not a child. Real rushed speech is also clipped differently.

### Too-long sounds ("mooooo")
The adviser noticed that "mo" was accepted when said as "moooooooooo". Two causes were fixed:
- **Early accept cut the measurement short.** The app used to stop the microphone 450 ms after the text matched, so a long vowel was never fully measured. Now it waits until the child has been quiet for 250 ms (at most 2.2 s), then judges.
- **No ceiling for one syllable.** `judgePace` now also returns `drawnOut` when the sound lasts more than `longRatio` times the guide voice's own clip and more than `longMs` (lenient 1100 ms / 3.5x, balanced 800 ms / 2.5x, strict 650 ms / 2.0x). The result is "Almost" with the line "Maikli lang ang tunog." (short sound).
- The ceiling is only used when there was clear quiet before the speech (lead of at least 60 ms). In a noisy room, or when the start of the sound cannot be told, the text decides (known limit).
- Simulation (guide clips stretched; `pnpm speech:pace-test`): balanced 0% false rejects at x1 and x0.7, 74% caught at 2.5x longer, 95% at 3x. Thresholds are not calibrated on real children; check with the same 3-adult procedure below.

### Tradeoff and what to do
A strict limit blocks gaming but may flag a confident fast speaker. Safe default: **balanced**. If the panel member's speed-ups still pass, move to `strict` after calibrating: have 3 adults say 20 words naturally 5 times; if the lowest natural ratio is 0.8 or more, `strict` is safe. If a child or fast adult is flagged more than 5% of natural attempts, go one step looser. Set it in `frontend/.env` (`EXPO_PUBLIC_PACE_MODE=strict`), then `npx expo start --go -c`.

### Calibration without keeping recordings
Every attempt prints `[speech] {"target","heard","kind","reason","spanMs","tokenSpanMs","ratio","sps","confidence"}` in the Metro console of a development session. Numbers only. Collect those lines, never the audio. Natural speech should cluster at ratio 0.8 to 1.5; rushed at 0.6 or less.

## 3. Layered validation

| Layer | What | Status |
|---|---|---|
| 1 Text | Exact match after normalising, against the target and a tight accepted list (English spellings of the CORRECT sound for the 41 syllables, e.g. ye: yeah yeh yay yey). Anything else is wrong or "almost" (one letter off, 4+ letters). | Verified by test |
| 2 Confidence | Mean confidence of the recognised words. Starting minimums 0.30 (1 syllable), 0.40 (2), 0.45 (3+). **Logged only** (`confidenceEnforced: false`): Soniox gives no recommended threshold and children's speech can score low. Soniox says per-token confidence is 0 to 1 (docs, checked 2026-10-18). | Measured, not enforced |
| 3 Pace | Section 2. Turns a text match into "almost", never a pass into a fail and never a wrong word into a pass. | Enforced (balanced) |
| 4 Confusable words | `pnpm speech:confusable-test`: dropped or added syllable or letter, swapped vowel, neighbouring consonant, every other lesson item. `--show pato` lists them: pako, pat, apat, patong, pata, bato, pito all judged "almost" or wrong, never correct. | 0 leaks of 18,493 |
| 5 Tiered outcome | Pass; **Almost** (one letter off, or too fast); retry with a replay on the 2nd miss; "Tuloy tayo" as the main button after the 3rd miss. | Built; "Tama ito" parent override not built |

A wrong word that is only one letter off ("bato" for "pato") shows "Halos tama!" and a retry. It never passes.

## 4. Context-biasing experiment

Switch (no code change): `EXPO_PUBLIC_STT_CONTEXT=lesson | target | none` in `frontend/.env`, restart with `npx expo start --go -c`. The `[speech]` line records which mode ran.

Protocol (no recordings kept): the same adult, the same 10 words, spoken at three speeds on the phone: clear, about 1.5x, about 2x, 5 times each, once per mode. Write down from the log whether `heard` matched the target.

| Setup | Hints | What to look for |
|---|---|---|
| A `none` | none | Baseline. Rushed words that still match here are the recogniser's own tolerance. |
| B `lesson` (current) | every item of the lesson | Rushed words that match in B but not in A: hints are pulling. Also check real child speech (pilot, section 8) is no worse in A. |
| C `target` | only the word being practised | Narrowest. If rushed attempts match in C but not in A or B, the hints are doing it. Risk: a child saying the neighbouring word may be pulled onto the target. |

Decision rule: pick the setup with the fewest rushed matches that does not raise the false-reject rate for natural speech (adult and the child pilot) by more than 2 points. Until measured, the default stays B, and the pace guard is what stops rushed speech (it works whatever the hints do). Whether hints bias fast speech is **unverified**.

## 5. Red-team test matrix

Words (24): pato, mama, masa, baso, mesa, ubas, mata, bata, kama, bola, tasa, yaya, yelo, pusa, puso, dila, araw, ilaw, bahay, gatas, ibon, kabayo, dalawa, bulaklak. Short syllables: ma, si, be, bu, ta, ke, ko, lu, ye, yu, ga.

Run each word in the cases below on a phone in a development build. Write the result from the `[speech]` log.

| Case | Expected |
|---|---|
| Slow and clear, sound by sound | pass |
| Normal | pass |
| Fast, about 1.5x | pass or almost (balanced passes most; strict flags) |
| Very fast, about 2x | almost |
| Extreme (clipped, compressed) | almost |
| Mumbled | pass only if the text still matches and the pace is fine; log it |
| Whispered | almost or wrong (too quiet to measure: text decides) |
| First or last syllable dropped | wrong or almost |
| Wrong vowel / wrong consonant | wrong or almost, never pass |
| Stretched or sing-song | pass (slow is fine) |
| English accent, child voice, adult voice | pass if the text matches; log false rejects |
| Noisy room | pass if the text matches; **rushed speech may pass** (see below) |
| Silence | wrong ("walang narinig") |
| Random sounds | wrong |
| Background TV | wrong or random; log |
| A parent prompting from behind | passes if the child stays silent and the parent says it: **cannot be told apart** |
| The app's own prompt audio leaking in | cannot happen in normal use (section 6) |
| A recording of a correct answer played into the mic | passes: **cannot be told apart** |

Results table (copy to a sheet):

| word | case | expected | actual | confidence | spanMs | ratio | syll/s | notes |
|---|---|---|---|---|---|---|---|---|

Simulation results already run (`pnpm speech:test`, guide-voice clips): normal and x0.8 pass; x1.25 passes; x2 and x3 give "almost" for pato, bahay, kabayo, bulaklak, ilong; wrong word gives "almost" (one letter) or wrong; silence gives wrong; rushed with synthetic noise at -50 and -40 dB still gives "almost"; **rushed with noise at -30 dB passes** (the noise fills the span). That last one is a real limit: in a very loud room the pace cannot be measured, though recognition also suffers there.

## 6. Anti-echo and input hygiene

Checked in the code:
- The mic opens only when the child taps it. Tapping stops Capi first (`guide.stop()`), then switches the phone to record mode.
- The speaker button is disabled while the mic is listening (`RoundSpeaker disabled={listening}`), so the prompt cannot be replayed into the mic.
- Feedback voice plays after the mic has closed.
- Listening limits: 7 s with no speech, 12 s maximum, and 450 ms after a match.
- A loud tail of Capi's last word right at the tap is possible only if the child taps during the last milliseconds; `guide.stop()` pauses it at once. Test: tap the mic while Capi speaks and check `heard` is empty.

Not detectable by any of this: a parent prompting, a replayed recording, TV that says the word. State them as limits; they do not matter for a learning app but matter for the thesis claim, so say so.

## 7. Feedback copy

| Outcome | On screen | Capi says | Delivery |
|---|---|---|---|
| Pass | Magaling magsalita! | "Tama!" / "Magaling!" | bright, short, falling |
| Almost: right word, too fast | Dahan-dahan lang tayo. Tama ang salita! Sabihin natin nang paisa-isang tunog: /pa/ ... /to/ | "Dahan-dahan lang tayo." then "Sabihin natin nang paisa-isang tunog." | calm, smiling, slower than normal, a short pause between |
| Almost: one letter off | Halos tama! | "Halos na!" | warm, encouraging |
| Retry | Subukan ulit | "Subukan ulit." | calm, kind |
| 2nd miss | same text | the line, then the word again | patient |
| Fallback (3rd miss) | Okay lang! Tuloy tayo. | "Okay lang! Tuloy tayo." | cheerful, no blame |

No red, no cross: try-again sheets are warm cream with a round-arrow badge. Three new lines need audio (cost about $0.003): `pnpm content:audio -- --yes --syllables --only "Dahan-dahan lang tayo.,Sabihin natin nang paisa-isang tunog.,Okay lang! Tuloy tayo."` Until then the text shows and the voice for those lines is skipped. This touches phrases only: the syllable clips and the picks are not regenerated.

## 8. Metrics and acceptance criteria

| Metric | Target before release | How |
|---|---|---|
| Rushed (about 2x) accepted as Tama | 5% or less | 24 words x 5 times x 2 adults rushed on purpose, from the `[speech]` log: share with `kind: correct` |
| Rushed about 1.5x accepted | decide: 30% or less on balanced, 10% or less on strict | same |
| Natural adult speech flagged too fast | 3% or less | 3 adults, 20 words, 5 times each (300 attempts: if none is flagged, the true rate is below about 1% with 95% confidence) |
| Natural child speech flagged too fast | 5% or less of 50 or more attempts | child pilot |
| Wrong words passed | 0 | confusable test (0 of 18,493) plus the red-team rows |
| A child stuck on one word | 0 (never more than 3 tries) | built in |

Child pilot: 3 to 5 children with a parent's written consent (RA 10173), a teacher present, a development build. **No audio is recorded or kept**; an observer writes down, per child, how many natural attempts were flagged "dahan-dahan", from the `[speech]` numbers. Loosen one preset if more than 5% of natural child attempts are flagged, or if any child hits the 3-miss fallback twice because of pace. Adult calibration likewise keeps numbers only, not audio. No test in this document needs a stored recording.

## 9. Risks and open questions

Unverified: (1) `start_ms` / `end_ms` in real-time tokens (official docs not reachable here; test with the `tokenSpanMs` log); (2) whether context hints pull rushed speech (section 4); (3) good confidence thresholds (calibrate from logs); (4) how phone microphones with automatic gain change the measurement (test two phones); (5) real rushed human speech versus the sped-up computer voice used here.

Known limits: loud rooms hide the pace; the yardstick is a calm computer voice, so very fast natural speakers may need `lenient`; if any word's guide clip is regenerated, rerun `pnpm speech:pace-test -- --write-table`; a replayed recording or a prompting parent cannot be detected.

Product options if more confidence is needed: ask for the word in syllables first, then whole (the app already shows /pa/ ... /to/); count a pass only when both parts are heard; or require two good attempts for lesson mastery.

Questions: (1) Roughly how much faster than normal did the panel member speak? It decides `balanced` or `strict`. (2) Do you want a "Tama ito" parent or teacher override? It makes progress data less strict, so it needs your adviser's view. (3) Can 3 adults give you 5 natural attempts of 20 words with the development build, to calibrate the numbers?
