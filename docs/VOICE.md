# Basa-Bata voice plan (Soniox TTS, STT, own recordings)

Checked against the Soniox docs on 2026-10-18. "Verified" means a docs page states it. Everything else is a test you run.

## 1. What Soniox can and cannot do

Soniox gives us a good Tagalog voice (`language: "tl"`), expressive audio tags, a `speed` control and voice cloning. It does **not** document any way to set the stress of one word, to remove the "uh" after b/k/t/d/p/g, or to control a glottal stop. Cloning copies voice, accent, speed and breathing, not correct diin. So the plan is hybrid: your own recordings for the sounds and syllables that carry the lesson, Soniox TTS for words and phrases, every clip generated once, checked by a Filipino teacher and shipped as a file. Clarity beats cheerfulness for phonics core.

## 2. Capability map

| Need | Status | What the docs say |
|---|---|---|
| Tagalog output | Verified | `tl` is a supported TTS language ([supported languages](https://soniox.com/docs/tts/concepts/supported-languages)). No Tagalog accuracy notes. |
| Stress (diin) on one word | Not supported | No phoneme or stress control documented. `*word*` and CAPS give expressive emphasis only ([emotion & tone](https://soniox.com/docs/tts/concepts/emotion-and-tone)). Effect on Tagalog is unverified. |
| Syllable pacing | Partly verified | `...`, `,`, `[pause]` and hyphenated text exist. Whether "sa... ging" is read cleanly in Tagalog is unverified: run `pnpm voice:test`. |
| Speed | Verified | `speed` 0.7 to 1.3, default 1.0. Docs say keep changes small; it rescales the whole clip and can flatten rhythm ([speech speed](https://soniox.com/docs/tts/concepts/speech-speed)). |
| Cheerful, warm tone | Verified | English tags `[happy] [warm] [delighted] [playful] [calm] [softly] [slowly]`. A tag the model does not know "may be spoken". Tags do not override the text. |
| "uh" after stops | Not supported | Nothing documented. Fix by recording, or avoid isolated stops in TTS. |
| /ng/ (ŋ) | Unverified | Test with ngayon, ngipin, ilong, bangka. |
| Glottal stop | Unverified | No control documented. Test luha, tuwa, sampu, maaga. |
| Same clip every play | Verified by design | We ship the saved file, so playback is identical. Regenerating may differ: determinism is not documented. |
| Voice cloning | Verified | Clip up to 2 minutes and 35 MB, one clean speaker, consistent tone. Voice ID goes in the `voice` field. 20 voices per organisation. New models need "recompute" ([voice cloning](https://soniox.com/docs/tts/concepts/voice-cloning)). Accepted file types are not listed. |
| `reduce_silence` | Verified | Shortens gaps between words. Leave it off for teaching. |
| Audio formats | Verified | `wav`, `pcm_s16le`, `mp3`, `opus`... default 24 000 Hz ([audio formats](https://soniox.com/docs/tts/concepts/audio-formats)). |
| STT language hint | Verified | `language_hints: ["tl"]` biases, does not restrict ([language hints](https://soniox.com/docs/stt/concepts/language-hints)). |
| STT context | Verified | `context.terms` array; up to about 8 000 tokens ([context](https://soniox.com/docs/stt/concepts/context)). Which models honour it is unverified. |
| STT confidence | Verified | Per token 0 to 1, no recommended threshold ([confidence](https://soniox.com/docs/stt/concepts/confidence-scores)). |
| Endpoint detection | Verified | `endpoint_latency_adjustment_level` 0 to 3, `endpoint_sensitivity` -1 to 1, `max_endpoint_delay_ms` 500 to 3000 ([endpoint detection](https://soniox.com/docs/stt/rt/endpoint-detection)). |

## 3. Persona and ten lines

Cheerful "Ate/Kuya" teacher, mid pitch, smiling, patient. Short sentences. Praise is bright, retries are calm, nothing scolds. Phonics core (sounds, syllables, words) is read plain: no tags, no exclamation marks. Tags only on praise and retry lines.

| Line | Use | Delivery note |
|---|---|---|
| Pakinggan mo. | prompt | plain, calm, short pause after |
| Sabay tayo! | prompt | `[warm]`, friendly, not shouted |
| Basahin mo. | prompt | plain |
| Handa ka na ba? | question | plain, light rise on "ba" |
| Magaling! | praise | `[happy]`, bright, falls at the end |
| Ang galing mo! | praise | `[delighted]`, one beat of excitement |
| Tama! | praise | short and crisp |
| Halos na! | near miss | `[warm]`, encouraging |
| Subukan nating muli. | retry | `[calm]`, slower, kind |
| Okay lang, isa pa! | retry | `[reassuringly]`, soft smile |

## 4. TTS settings

| Setting | Value | Why |
|---|---|---|
| model | `tts-rt-v2` | the model the scripts already use |
| language | `tl` | Tagalog, primary language of the whole text |
| voice | built-in "Maya" now, or a cloned voice ID | keep one voice for everything |
| speed | omit (1.0) for sounds and syllables; 0.9 to 0.85 only for words that are too fast | docs say small changes |
| tags | none on phonics core; `[happy]`, `[calm]` on praise and retry | clarity first |
| silence | `reduce_silence` off | we want pauses |
| format | `wav`, 24 000 Hz, mono | what the app plays; normalised afterwards |

## 5. Voice clone plan (optional)

1. Record 30 to 60 seconds (the limit is 2 minutes) of you reading calm, varied Tagalog sentences in the teacher voice you want, at one steady energy. Quiet room, phone 15 to 20 cm away, no music, no heavy noise reduction, no echo.
2. Upload in the Soniox Console under Voices, name it, wait until it plays back. Put the voice ID in `SONIOX_TTS_VOICE`.
3. Run `pnpm voice:test -- --yes` with that voice and rate it exactly like the built-in voice. A clone that fails stress or "uh" is still fine for praise lines but not for phonics core.

## 6. The 30-word test

`content/voice-test-set.json` holds 30 words (malumay, malumi, mabilis, maragsa, ng, b/k/t/d/p/g, glottal stops) with stress marks. The marks are a first draft: a Filipino teacher must confirm each one. `pnpm voice:test -- --yes` makes four styles of every word (plain, plain second take, syllables-then-word, speed 0.85; add `--cheerful` for a bright style) and a rating page with six scores (diin, linaw, bilis, "uh", consistency, cheerfulness). Rule: an item fails when diin, linaw or "uh" is 2 or less; **if 3 or more of the 30 fail, the voice fails for phonics core.**

## 7. Fix ladder (per failing item)

1. Respell or space it in `content/tts-respell.json` (`"saging": "sa, ging"`, or add a hyphen or comma). Regenerate that item: `pnpm content:audio -- --yes --only saging`.
2. Add a tag or lower speed (`--speed 0.9`), regenerate, compare.
3. Regenerate once more and compare takes. If takes differ, pick the better one and ship that file.
4. Record it yourself and import it (`pnpm content:import-voice`). Anything still failing after step 3 goes here.

## 8. STT plan for children

STT grades words and syllables, not isolated phonemes. Settings now in `useLiveTranscription.ts`: `language_hints ["tl"]`, `context.terms` = this lesson's items only, endpoint level 2, sensitivity 0, max delay 1000 ms. A correct answer is accepted 450 ms after the text matches. Near matches: only targets of 4+ letters, one letter off ("Halos na"). Short sounds never get "almost", on purpose. Confidence is shown in dev builds only; set a threshold after you have real recordings of children (Soniox gives none). Suggested retry policy (not built yet): after two misses, replay the model audio, then move on kindly with "Okay lang, isa pa!". Children's audio is not stored by default.

## 9. Pipeline and runbook

Names: the app keys clips by `audioKey(text)`: `m.wav` (sound), `ma.wav` (syllable), `saging.wav` (word). The import script also accepts `m_sound.m4a`, `ma_syllable.wav`, `saging_word.mp3`.

1. Generate or import: `pnpm content:audio -- --yes --syllables` (words, syllables, phrases) and/or `pnpm content:import-voice -- --from <folder> --yes` (own recordings).
2. Listen. Fix with the ladder. Pick the take.
3. `pnpm content:normalize-audio`, then `pnpm content:audio -- --manifest-only --syllables` to rebuild the manifest.
4. `content/audio-meta.json` records voice, model and date of every clip.
5. When Soniox releases a new TTS model: change `MODEL`, run `pnpm voice:test -- --yes`, rate it, regenerate only if it passes, and run recompute for cloned voices.

## 10. Risks and open questions

- Stress, "uh", ng and the glottal stop are all unverified for Tagalog TTS: run the 30-word test first.
- Letter sounds (m as "mmm") cannot be asked of TTS by spelling the letter; it reads the letter name. Record the 19 sounds.
- The async STT call in `backend/src/services/sonioxAsync.service.ts` sends `context` as a text string; the docs describe an object. Test before relying on it.
- The `ng` digraph is not a lesson item yet, but it is in your Marungko sequence: decide whether to add it.
- Test endpoint settings with real Grade 1 to 3 children and a teacher; the numbers here are a first guess.
- Data: no child audio is kept; get parental consent as the Data Privacy Act (RA 10173) requires.
