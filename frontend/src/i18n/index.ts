import { useAppStore } from "../store/useAppStore";

/**
 * Filipino and English for the parts an adviser asked to have in both: the sign-in screens and Capi's cheerful
 * lines (praise, "try again", the lesson result). The words and syllables children read are always Tagalog and are
 * never translated.
 *
 * Add a string by adding one entry with both languages; the key is checked by TypeScript everywhere it is used.
 */
export type Lang = "fil" | "en";
export type Line = { fil: string; en: string };

export const LANGUAGES: readonly { id: Lang; label: string }[] = [
  { id: "fil", label: "Filipino" },
  { id: "en", label: "English" },
];

const S = {
  // Sign in
  welcomeAsk: { fil: "May account ka na ba?", en: "Do you have an account?" },
  signInButton: { fil: "Mag-sign in", en: "Sign in" },
  newAsk: { fil: "Bago ka sa Basa-Bata?", en: "New to Basa-Bata?" },
  startButton: { fil: "Simulan na", en: "Get started" },
  meetTitle: { fil: "Kumusta! Ako si Capi!", en: "Hello! I'm Capi!" },
  meetBody: { fil: "Tutulungan kitang magbasa, isang tunog sa bawat pagkakataon.", en: "I'll help you read, one sound at a time." },
  continueButton: { fil: "Ituloy", en: "Continue" },
  welcomeBack: { fil: "Maligayang pagbabalik!", en: "Welcome back!" },
  removeAccount: { fil: "ALISIN", en: "REMOVE" },
  removeAccountLabel: { fil: "Alisin ang {email}", en: "Remove {email}" },
  addAccount: { fil: "Magdagdag ng ibang account", en: "Add another account" },
  manageAccounts: { fil: "Pamahalaan ang mga account", en: "Manage accounts" },
  doneManaging: { fil: "Tapos na", en: "Done" },
  formTitle: { fil: "Ilagay ang iyong detalye", en: "Enter your details" },
  emailPlaceholder: { fil: "Email address", en: "Email address" },
  passwordPlaceholder: { fil: "Password (8+ titik)", en: "Password (8+ characters)" },
  showPassword: { fil: "Ipakita ang password", en: "Show password" },
  hidePassword: { fil: "Itago ang password", en: "Hide password" },
  createButton: { fil: "Gumawa ng account", en: "Create account" },
  forgotLink: { fil: "Nalimutan ang password", en: "Forgot password" },
  switchToSignUp: { fil: "Bago ka ba? Gumawa ng account", en: "New here? Create an account" },
  switchToSignIn: { fil: "May account na? Mag-sign in", en: "Have an account? Sign in" },
  or: { fil: "O", en: "OR" },
  socialButton: { fil: "MAG-SIGN IN GAMIT ANG {name}", en: "SIGN IN WITH {name}" },
  soonTitle: { fil: "Malapit na", en: "Coming soon" },
  soonBody: { fil: "Hindi pa magagamit ang pag-sign in gamit ang ibang app. Gumamit muna ng email.", en: "Signing in with another app is not ready yet. Please use email for now." },
  terms: { fil: "Sa pag-sign in, sumasang-ayon ka sa aming Mga Tuntunin at Patakaran sa Privacy.", en: "By signing in, you agree to our Terms and Privacy Policy." },
  backLabel: { fil: "Bumalik", en: "Back" },
  languageLabel: { fil: "Wika", en: "Language" },
  badEmail: { fil: "Maglagay ng tamang email address.", en: "Please enter a valid email address." },
  shortPassword: { fil: "Gumamit ng hindi bababa sa 8 titik para sa password.", en: "Use at least 8 characters for the password." },
  needEmailFirst: { fil: "Ilagay muna ang iyong email address.", en: "Enter your email address first." },
  // Email code (replaces the confirmation link: no link, no token in a web address)
  codeTitle: { fil: "Ilagay ang code", en: "Enter the code" },
  codeSent: { fil: "Ipinadala namin ang 6-digit na code sa\n{email}", en: "We sent the 6-digit code to\n{email}" },
  newPasswordBody: { fil: "Gumawa ng bagong password (hindi bababa sa 8 titik).", en: "Make a new password (at least 8 characters)." },
  codeBody: { fil: "Nagpadala kami ng 6-digit na code sa {email}. Ilagay ito dito.", en: "We sent a 6-digit code to {email}. Enter it here." },
  codePlaceholder: { fil: "6-digit na code", en: "6-digit code" },
  codeButton: { fil: "Kumpirmahin", en: "Confirm" },
  codeBadLength: { fil: "Ilagay ang 6 na numero mula sa email.", en: "Enter the 6 numbers from the email." },
  codeResend: { fil: "Ipadala ulit ang code", en: "Send the code again" },
  codeResendWait: { fil: "Ipadala ulit sa {seconds} segundo", en: "Send again in {seconds} s" },
  codeResent: { fil: "Nagpadala kami ng bagong code. Tingnan ang iyong email.", en: "We sent a new code. Check your email." },
  codeWrong: { fil: "Mali o paso na ang code. Subukan ulit o magpadala ng bago.", en: "That code is wrong or has expired. Try again or send a new one." },
  codeNotReceived: { fil: "Walang dumating? Tingnan ang Spam. Pwede ring magpadala ulit.", en: "Nothing arrived? Check Spam. You can also send it again." },
  badLogin: { fil: "Mali ang email o password.", en: "Wrong email or password." },
  notConfirmedSent: { fil: "Hindi pa na-kumpirma ang email na ito. Nagpadala kami ng bagong code.", en: "This email is not confirmed yet. We sent a new code." },
  tooManyTries: { fil: "Masyadong maraming subok. Maghintay sandali bago ulit.", en: "Too many tries. Please wait a moment and try again." },
  resetTitle: { fil: "Palitan ang password", en: "Reset your password" },
  resetBody: { fil: "Nagpadala kami ng 6-digit na code sa {email}. Ilagay ito at ang bago mong password.", en: "We sent a 6-digit code to {email}. Enter it and your new password." },
  newPasswordPlaceholder: { fil: "Bagong password (8+ titik)", en: "New password (8+ characters)" },
  resetButton: { fil: "Palitan ang password", en: "Save new password" },
  resetNotSaved: { fil: "Hindi napalitan ang password. Subukan ulit.", en: "The password was not changed. Please try again." },
  createdNeedsCode: { fil: "Nagawa na ang account. Ilagay ang code mula sa email.", en: "Account created. Enter the code from the email." },
  // Lesson: Capi's feedback
  tapRightTitle: { fil: "Magaling!", en: "Great job!" },
  tapWrongTitle: { fil: "Hindi pa tama", en: "Not quite yet" },
  tapMeaning: { fil: "Kahulugan:", en: "Meaning:" },
  tapAnswer: { fil: "Tamang sagot:", en: "The answer:" },
  heardKicker: { fil: "Narinig ni Capi:", en: "Capi heard:" },
  heardNothing: { fil: "Walang narinig si Capi.", en: "Capi did not hear anything." },
  heardLine: { fil: "Narinig ni Capi: {heard}", en: "Capi heard: {heard}" },
  rightLine: { fil: "{parts}, tamang-tama ang tunog!", en: "{parts}, that sounds just right!" },
  next: { fil: "Susunod", en: "Next" },
  finish: { fil: "Tapusin", en: "Finish" },
  tryAgainTitle: { fil: "Subukan ulit", en: "Try again" },
  almostTitle: { fil: "Halos tama!", en: "Almost!" },
  slowTitle: { fil: "Dahan-dahan lang tayo", en: "Let's go slowly" },
  shortTitle: { fil: "Maikli lang ang tunog", en: "Keep the sound short" },
  moveOnTitle: { fil: "Okay lang! Tuloy tayo.", en: "That's okay! Let's keep going." },
  tryKicker: { fil: "Subukan ulit:", en: "Try again:" },
  slowKicker: { fil: "Tama ang salita! Sabihin natin nang paisa-isang tunog:", en: "That's the right word! Let's say it one sound at a time:" },
  shortKicker: { fil: "Tama ang tunog! Gawin nating maikli, hindi mahaba:", en: "That's the right sound! Let's make it short, not long:" },
  slowlyNote: { fil: "{slash}, dahan-dahan lang", en: "{slash}, nice and slow" },
  retryButton: { fil: "Subukan muli", en: "Try again" },
  moveOnButton: { fil: "Tuloy tayo", en: "Let's keep going" },
  skipLink: { fil: "Laktawan", en: "Skip" },
  didYouKnow: { fil: "ALAM MO BA?", en: "DID YOU KNOW?" },
  // Lesson: screens
  repeatTitle: { fil: "Ulitin pagkatapos ni Capi", en: "Say it after Capi" },
  tapQuizTitle: { fil: "Pindutin ang naririnig mo", en: "Tap what you hear" },
  micHintSyllable: { fil: "Pindutin ang mikropono at sabihin ang pantig", en: "Tap the microphone and say the sound" },
  micHintWord: { fil: "Pindutin ang mikropono at sabihin ang salita", en: "Tap the microphone and say the word" },
  micNeeded: { fil: "Kailangan ang mikropono para makapagsalita", en: "The microphone is needed to speak" },
  stopRecording: { fil: "PINDUTIN ULIT PARA TUMIGIL", en: "TAP AGAIN TO STOP" },
  micSpeakLabel: { fil: "Magsalita", en: "Speak" },
  micStopLabel: { fil: "Itigil ang pagrekord", en: "Stop recording" },
  cantSpeak: { fil: "DI MAKAPAGSALITA NGAYON", en: "CAN'T SPEAK RIGHT NOW" },
  cantListen: { fil: "DI MAKAPAKINIG NGAYON", en: "CAN'T LISTEN RIGHT NOW" },
  check: { fil: "Suriin", en: "Check" },
  explain: { fil: "Ipaliwanag ang sagot ko", en: "Explain my answer" },
  listenLabel: { fil: "Pakinggan", en: "Listen" },
  slowLabel: { fil: "Pakinggan nang mabagal", en: "Listen slowly" },
  slowText: { fil: "Mabagal", en: "Slow" },
  guideOk: { fil: "Sige", en: "OK" },
  partWord: { fil: "Bahagi {n} ng {total}", en: "Part {n} of {total}" },
  part1: { fil: "Isang pantig", en: "One syllable" },
  part2: { fil: "Dalawang pantig", en: "Two syllables" },
  part3: { fil: "Tatlong pantig", en: "Three syllables" },
  part4: { fil: "Apat o higit pang pantig", en: "Four or more syllables" },
  part1Body: { fil: "Pakinggan at sabihin ang bawat tunog.", en: "Listen and say each sound." },
  part2Body: { fil: "Ngayon, mga salitang may dalawang pantig.", en: "Now, words with two syllables." },
  part3Body: { fil: "Ngayon, mga salitang may tatlong pantig.", en: "Now, words with three syllables." },
  part4Body: { fil: "Ngayon, mga mahahabang salita.", en: "Now, longer words." },
  partGo: { fil: "Tara!", en: "Let's go!" },
  googleFailedTitle: { fil: "Hindi natuloy ang Google", en: "Google sign-in did not finish" },
  googleFailedBody: { fil: "Subukan ulit, o gamitin ang email at password. Kung may problema pa rin, tingnan ang koneksyon sa internet.", en: "Try again, or use email and password. If it keeps failing, check the internet connection." },
  parentOnly: { fil: "Para sa magulang lang", en: "For parents only" },
  parentHold: { fil: "Pindutin nang matagal ang butones sa loob ng 3 segundo para magpatuloy.", en: "Press and hold the button for 3 seconds to continue." },
  parentBack: { fil: "BUMALIK", en: "GO BACK" },
  parentTag: { fil: "PARA SA MAGULANG", en: "FOR PARENTS" },
  parentAsk: { fil: "Tama ba ang pagkakasabi ng bata?", en: "Did the child say it right?" },
  parentYes: { fil: "TAMA ITO", en: "YES, IT'S RIGHT" },
  parentNo: { fil: "HINDI, ULITIN", en: "NO, TRY AGAIN" },
  parentNote: { fil: "Mamarkahan itong tama at lalabas sa ulat ng progreso.", en: "It will be marked right and shown in the progress report." },
  parentLock: { fil: "Tama ito (para sa magulang)", en: "It's right (for a parent)" },
  partChip: { fil: "BAHAGI {n}", en: "PART {n}" },
  partStart: { fil: "SIMULAN", en: "START" },
  partClap1: { fil: "Isang palakpak, isang tunog", en: "One clap, one sound" },
  partClap2: { fil: "Dalawang palakpak, dalawang tunog", en: "Two claps, two sounds" },
  partClap3: { fil: "Tatlong palakpak, tatlong tunog", en: "Three claps, three sounds" },
  partClap4: { fil: "Maraming palakpak, maraming tunog", en: "Many claps, many sounds" },
  // Lesson: result
  resultDone: { fil: "Natapos mo ang aralin!", en: "You finished the lesson!" },
  reviewDone: { fil: "Tapos na ang balik-aral!", en: "Review complete!" },
  xpEarned: { fil: "KUHANG XP", en: "XP EARNED" },
  correctLabel: { fil: "TAMA", en: "CORRECT" },
  streakKicker: { fil: "APOY NG PAG-AARAL", en: "LEARNING STREAK" },
  streakDays: { fil: "{n} araw na magkakasunod!", en: "{n} days in a row!" },
  medalKicker: { fil: "BAGONG MEDALYA", en: "NEW MEDAL" },
} as const satisfies Record<string, Line>;

export type StringKey = keyof typeof S;
export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  const text: string = S[key][lang];
  if (vars === undefined) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

/** `const t = useT(); t("signInButton")`: the text in the language the person chose. Re-renders when it changes. */
export function useT(): Translate {
  const lang = useAppStore((state) => state.language);
  return (key, vars) => translate(lang, key, vars);
}

export function useLang(): Lang {
  return useAppStore((state) => state.language);
}
