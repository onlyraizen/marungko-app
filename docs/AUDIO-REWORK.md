# Narrator audio rework: so, mais, tu, kanin (+ review list for Books 1-4)

Status: **not yet fixed**. Nothing here has been listened to. The sandbox cannot play audio or call Soniox, so the
steps below run on the laptop and a native speaker decides. Anything marked (unverified) was not checked.

## 1. Where each clip comes from (from `content/audio-meta.json`)

| Clip | Source | Settings | Likely cause (confidence) |
|---|---|---|---|
| so | Soniox TTS, Maya, bare text `so.` (batch 2026-10-18, picked 2026-11-08) | speed 1, "plain" | The engine reads a bare 2-letter token with English rules, so /o/ ends in a glide ("soh-w"). Medium. Same batch as the other `o` syllables, so check `bo ko lo mo to yo` too. |
| tu | same batch, `tu.` | speed 1, "plain" | English "too/two": aspirated, long /u/. Medium. |
| mais | Soniox TTS, Maya, `2-period` word style (compiled 2026-10-16) | gain per `audio-meta.json` | The engine spells "ai" as a diphthong /aɪ/ or "ay-s", heard as "ma-es". Medium. It is a word, so a respell is the first thing to try (a hyphen or "ma-ís"). |
| kanin | same `2-period` style | -0.6 dB, 0.68 s | 0.68 s is short for 2 syllables with the stress on "ka". The final "n" is probably cut by the trim. Low to medium; check the raw file before trimming. |
| Mixed voice / stale cache | all four are Maya; the app bundles the `.wav` files and `audio-meta.json` lists them | n/a | Low. Check `content/audio-meta.json`: all four entries must name voice Maya. |

## 2. Fix ladder (run on the laptop, in `~/marungko-app`)

Respell candidates are guesses (unverified). The tool makes all of them so you pick by ear.

```bash
# Syllables so / tu: --try makes plain, slower and 3x variants for each spelling you list (spellings are guesses)
pnpm content:syllable-tts -- --yes --only so --try "soh,sô,saw"
pnpm content:syllable-tts -- --yes --only tu --try "tuh,tú,tu-u"

# Words mais / kanin: `content:audio` has no --try. Put a respelling in content/tts-respell.json
# (key = audio key), e.g. {"mais": "ma-ís", "kanin": "ka... nin"}, then make trial files in another folder:
pnpm content:audio -- --yes --only mais,kanin --out-dir ~/trial-words
pnpm content:audio -- --yes --only mais,kanin --out-dir ~/trial-words-slow --speed 0.85
# Listen to ~/trial-words*, copy the winner over frontend/assets/audio/words/<key>.wav, and keep the respell entry.
```

For the syllables, open the pick page it prints, choose by ear, and apply:

```bash
pnpm content:apply-picks            # writes the chosen files
pnpm content:normalize-audio        # same loudness as the rest
pnpm content:audio -- --manifest-only --syllables
```
For the words, after copying the file run `pnpm content:normalize-audio` and update `content/audio-meta.json` (source, variant, date).

(d) Preferred for these four: record a real voice with `docs/syllable-recorder.html`, then
`pnpm content:import-voice`. Recording rules: only the target word, one take, quiet room, no example sentence,
steady pace; keep the leading silence at 50 ms or less and the trailing at 100 ms or less (the normalizer trims to
that). Children's voices are not recorded or stored by the app (RA 10173); this is the adult narrator only.

Native-speaker targets (to confirm, not assumed): so = pure /o/, no glide; tu = short pure /u/; mais = ma-IS, two
clear syllables, the stress as the speaker says it; kanin = long stressed "ka", clear final "nin".

Soniox: the language code and respell behaviour above come from our own earlier tests, not re-checked against the
current official docs today (unverified). Check https://soniox.com/docs before relying on any new option.

## 3. Scan of Books 1-4 (82 words, 41 syllables) for similar problems

Automatic, spelling-based, so it only finds *candidates*; it cannot hear.

| Pattern | Why it may go wrong | Clips to review |
|---|---|---|
| Open /o/ | English "oh" glide | syllables bo ko lo mo to yo; words abo aso baso bola dahon ibon ilong kabayo libro lola lolo manok opo pato pito po puno puso tatlo walo yelo |
| /u/ | English "oo/two" length or aspiration | syllables bu ku lu mu su tu yu; words asul bituin bulaklak buwan kuya pula pusa puti sampu tubig ubas ube magandang umaga |
| ai, ay, aw, iw, ua | diphthong or glide read as two vowels | mais araw bahay dalawa dilaw ilaw kabayo kamay nanay paa tatay tinapay yaya buwan |
| Final consonant | last sound clipped by trimming or a fast read | apat bibig bulaklak dahon gatas ibon ilong kanin lapis manok mansanas saging salamat tubig ubas |
| Stress | stress shifts (mais, kanin, aso, baso, puso) | confirm each with a native speaker |

Priority 1 (same batch/style as the reported ones): bo ko lo mo to yo bu ku lu mu su yu, then mais-like words (araw,
bahay, kamay, nanay, tatay), then closed words (apat, gatas, lapis, manok, salamat). Words already flagged in
`docs/VOICE-AUDIT.md`: the 47 non-`2-period` words and extreme gains (ubas +10.7 dB, kahel +7.0, sisiw +6.9).

## 4. Native-speaker rating sheet

One row per clip. 1 = wrong, 3 = acceptable, 5 = perfect. "Verdict": OK / redo / re-record. Leave blank what you
did not check. Copy the CSV below into a spreadsheet.

```csv
clip,type,stress (1-5),clarity (1-5),speed (1-5),ending sound (1-5),same voice as the rest (1-5),verdict,notes
so,syllable,,,,,,,
tu,syllable,,,,,,,
mais,word,,,,,,,
kanin,word,,,,,,,
bo,syllable,,,,,,,
ko,syllable,,,,,,,
lo,syllable,,,,,,,
mo,syllable,,,,,,,
to,syllable,,,,,,,
yo,syllable,,,,,,,
bu,syllable,,,,,,,
ku,syllable,,,,,,,
lu,syllable,,,,,,,
mu,syllable,,,,,,,
su,syllable,,,,,,,
yu,syllable,,,,,,,
araw,word,,,,,,,
bahay,word,,,,,,,
kamay,word,,,,,,,
nanay,word,,,,,,,
tatay,word,,,,,,,
apat,word,,,,,,,
gatas,word,,,,,,,
lapis,word,,,,,,,
manok,word,,,,,,,
salamat,word,,,,,,,
aso,word,,,,,,,
puso,word,,,,,,,
```

## 5. Replace and verify

1. After picks, run `pnpm content:syllable-check` and `pnpm content:phrases-check`.
2. Start the app with `npx expo start --go -c` (the `-c` clears the Metro cache so the old `.wav` is not reused).
3. Tap each reworked clip in a lesson and in the quiz speaker; it must be the same Maya voice and level.
4. The new guide prompt "Pindutin dito!" / "Tap here!" also needs its clip: `pnpm content:audio -- --yes` (Filipino) and `pnpm content:audio -- --english --yes` (English); `pnpm content:phrases-check` lists what is still missing.
