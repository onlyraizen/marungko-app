/**
 * What speech recognition writes down when a child says a short syllable correctly.
 *
 * Soniox hears one or two sounds with no sentence around them, so it often picks an English word that sounds
 * the same: a child saying "ye" is written "yeah", "ti" becomes "tea". Each list holds only spellings of the
 * CORRECT sound. Nothing here may be another lesson item (that would let a wrong answer through). Check it with
 * `npx tsx src/content/accepted.ts` from the frontend folder: it must print OK.
 *
 * Decided so far (edit with your teacher): "ya" is NOT accepted for "ye" because "ya" is its own syllable.
 */
const ACCEPTED: Readonly<Record<string, readonly string[]>> = {
  ma: ["mah", "maa"],
  sa: ["sah", "saa"],
  mi: ["mee"],
  si: ["see", "sea"],
  mo: ["moh", "mow", "moe"],
  so: ["soh", "sew"],
  ba: ["bah", "baa"],
  be: ["beh", "bay"],
  bi: ["bee"],
  bo: ["boh", "bow", "beau"],
  bu: ["boo"],
  me: ["meh", "may"],
  se: ["seh", "say"],
  mu: ["moo"],
  su: ["sue", "soo"],
  ta: ["tah", "taa"],
  te: ["teh", "tay"],
  ti: ["tea", "tee"],
  to: ["toe", "toh"],
  tu: ["too", "two"],
  ka: ["kah", "kaa"],
  ke: ["keh", "kay"],
  ki: ["key", "kee"],
  ko: ["co", "koh"],
  ku: ["coo"],
  la: ["lah", "laa"],
  le: ["leh", "lay"],
  li: ["lee"],
  lo: ["low", "loh"],
  lu: ["loo"],
  ya: ["yah", "yaa"],
  ye: ["yeah", "yeh", "yay", "yey"],
  yo: ["yoh"],
  yu: ["you", "yoo", "yew"],
  na: ["nah", "naa"],
  ga: ["gah", "gaa"],
  pa: ["pah", "paa"],
  ra: ["rah", "raa"],
  da: ["dah", "daa"],
  ha: ["hah", "haa"],
  wa: ["wah", "waa"],
};

/** Extra accepted spellings for this target. Words and anything not listed have none. */
export function acceptedFor(target: string): readonly string[] {
  return ACCEPTED[target.trim().toLowerCase()] ?? [];
}

// Self-check, run directly with tsx: no alias may be another syllable (a wrong answer) or shared by two syllables.
const isMain = typeof process !== "undefined" && typeof process.argv?.[1] === "string" && process.argv[1].endsWith("accepted.ts");
if (isMain) {
  const owners = new Map<string, string>();
  const problems: string[] = [];
  for (const [syllable, aliases] of Object.entries(ACCEPTED)) {
    for (const alias of aliases) {
      if (ACCEPTED[alias] !== undefined) problems.push(`"${alias}" (for ${syllable}) is itself a lesson syllable`);
      const other = owners.get(alias);
      if (other !== undefined) problems.push(`"${alias}" is accepted for both ${other} and ${syllable}`);
      owners.set(alias, syllable);
    }
  }
  console.log(problems.length === 0 ? `OK: ${owners.size} spellings for ${Object.keys(ACCEPTED).length} syllables` : problems.join("\n"));
  process.exit(problems.length === 0 ? 0 : 1);
}
