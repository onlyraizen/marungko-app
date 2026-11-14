import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Pre-release leak check. Looks for secrets and for places where a token could end up in a log or a URL.
 *
 *   pnpm leak-check                  files tracked by git (what the APK and the repository contain)
 *   pnpm leak-check -- --history     also searches every past commit for key-shaped text (slow, thorough)
 *
 * Exit code 1 if anything is found. It prints the file and line only, NEVER the secret itself.
 * It cannot see a secret typed into a screenshot or sent in chat; those you must check by eye.
 */
const root = join(import.meta.dirname, "..");
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

const SECRET_SHAPES: Array<[string, RegExp]> = [
  ["JWT-shaped token (eyJ...)", /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["Google client secret (GOCSPX-)", /GOCSPX-[A-Za-z0-9_-]{10,}/],
  ["Supabase secret key (sb_secret_)", /sb_secret_[A-Za-z0-9_-]{10,}/],
  ["API key shape (sk-...)", /\bsk-[A-Za-z0-9_-]{20,}/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["token in a URL", /[?#&](access_token|refresh_token|provider_token)=[A-Za-z0-9._-]{8,}/],
];
const LOG_WITH_TOKEN = /console\.(log|info|debug|warn|error)\([^)]*\b(access_?token|refresh_?token|session|jwt|password|otp|secret|authorization)\b/i;
const SECRET_IN_APP = /EXPO_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD)/;

const tracked = git("ls-files").split("\n").filter(Boolean);
const text = tracked.filter((f) => !/\.(png|jpe?g|wav|mp3|ttf|otf|woff2?|ico|webp|gif|pdf|lock|svg)$/i.test(f) && !f.endsWith("pnpm-lock.yaml"));
const problems: string[] = [];

for (const f of tracked) if (/(^|\/)\.env(\.|$)/.test(f) && !f.endsWith(".example")) problems.push(`${f}: an .env file is tracked by git`);
for (const f of text) {
  const path = join(root, f);
  if (!existsSync(path) || f === "scripts/leak-check.mts") continue;
  const lines = readFileSync(path, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const [name, re] of SECRET_SHAPES) if (re.test(line)) problems.push(`${f}:${i + 1}: ${name}`);
    if (/^(frontend\/src|backend\/src)\//.test(f) && LOG_WITH_TOKEN.test(line)) problems.push(`${f}:${i + 1}: a log line mentions a token, session or password`);
    if (/^frontend\//.test(f) && SECRET_IN_APP.test(line)) problems.push(`${f}:${i + 1}: a secret-looking name starts with EXPO_PUBLIC_ (it would be inside the app)`);
  });
}
const config = readFileSync(join(root, "frontend", "app.config.ts"), "utf8");
if (!/allowBackup:\s*false/.test(config)) problems.push("frontend/app.config.ts: android.allowBackup is not false");

if (process.argv.includes("--history")) {
  for (const [name, re] of SECRET_SHAPES) {
    const out = git("log", "--all", "--oneline", "-G", re.source).trim();
    if (out) problems.push(`git history: "${name}" appears in ${out.split("\n").length} commit(s), first: ${out.split("\n")[0]?.slice(0, 7)}`);
  }
}

console.log(`${text.length} text files checked${process.argv.includes("--history") ? " plus history" : ""}.`);
if (problems.length === 0) {
  console.log("No secret, token log or token URL found.");
} else {
  console.log(`FOUND ${problems.length}:\n  ${problems.join("\n  ")}`);
  console.log("\nIf a real secret was committed: rotate it first (new key in the Google/Supabase/Soniox dashboard), then clean the history.");
}
process.exit(problems.length === 0 ? 0 : 1);
