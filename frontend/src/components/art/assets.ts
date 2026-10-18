// Capi art from the Basa-Bata UI pack. All original, drawn for this project.
// The two animated loops are APNG files stored with a .png extension so Metro bundles them.

export const POSES = {
  rest: require("../../../assets/art/capi/poses/01-idle-rest.png"),
  blink: require("../../../assets/art/capi/poses/02-idle-blink.png"),
  curious: require("../../../assets/art/capi/poses/03-idle-curious.png"),
  book: require("../../../assets/art/capi/poses/04-idle-lesson-book.png"),
  wave: require("../../../assets/art/capi/poses/05-gesture-wave.png"),
  point: require("../../../assets/art/capi/poses/06-gesture-point-board.png"),
  palms: require("../../../assets/art/capi/poses/07-gesture-open-palms.png"),
  tip: require("../../../assets/art/capi/poses/08-gesture-tip.png"),
  cheer: require("../../../assets/art/capi/poses/09-expr-cheer.png"),
  nice: require("../../../assets/art/capi/poses/10-expr-nice-job.png"),
  thinking: require("../../../assets/art/capi/poses/11-expr-thinking.png"),
  almost: require("../../../assets/art/capi/poses/12-expr-almost.png"),
  tryAgain: require("../../../assets/art/capi/poses/try-again.png"),
  celebrate: require("../../../assets/art/capi/poses/celebrate.png"),
  pointRight: require("../../../assets/art/capi/poses/point-right.png"),
  pointUp: require("../../../assets/art/capi/poses/point-up.png"),
  sign: require("../../../assets/art/capi/poses/holding-sign.png"),
  noInternet: require("../../../assets/art/capi/poses/no-internet.png"),
  micBlocked: require("../../../assets/art/capi/poses/mic-blocked.png"),
  oops: require("../../../assets/art/capi/poses/something-wrong.png"),
} as const;
export type Pose = keyof typeof POSES;

export const PEEKS = {
  cheer: require("../../../assets/art/capi/peeks/capi-peek-cheer.png"),
  curious: require("../../../assets/art/capi/peeks/capi-peek-curious.png"),
  excited: require("../../../assets/art/capi/peeks/capi-peek-excited.png"),
  sleepy: require("../../../assets/art/capi/peeks/capi-peek-sleepy.png"),
  thinking: require("../../../assets/art/capi/peeks/capi-peek-thinking.png"),
  wink: require("../../../assets/art/capi/peeks/capi-peek-wink.png"),
  proud: require("../../../assets/art/capi/peeks/capi-peek-proud.png"),
  surprised: require("../../../assets/art/capi/peeks/capi-peek-surprised.png"),
} as const;
export type Peek = keyof typeof PEEKS;

export const LOOPS = {
  talk: require("../../../assets/art/capi/talk-anim.png"),
  listen: require("../../../assets/art/capi/listen-anim.png"),
  hello: require("../../../assets/art/capi/hello-anim.png"),
  reading: require("../../../assets/art/capi/reading-anim.png"),
  celebrate: require("../../../assets/art/capi/celebrate-anim.png"),
  micTutorial: require("../../../assets/art/capi/mic-tutorial-anim.png"),
} as const;
export type Loop = keyof typeof LOOPS;

/** Stills of the two newest animations, shown while the animation file is still decoding. */
export const STILLS = {
  hello: require("../../../assets/art/capi/hello-static.png"),
  reading: require("../../../assets/art/capi/reading-static.png"),
} as const;

/** Tab bar and button icons from the UI pack (192px PNGs). */
export const ICONS = {
  libro: require("../../../assets/art/icons/nav-libro.png"),
  balikAral: require("../../../assets/art/icons/nav-balik-aral.png"),
  tagumpay: require("../../../assets/art/icons/nav-tagumpay.png"),
  profile: require("../../../assets/art/icons/nav-profile.png"),
  higitPa: require("../../../assets/art/icons/nav-higit-pa.png"),
  settings: require("../../../assets/art/icons/nav-settings.png"),
  lock: require("../../../assets/art/icons/lock.png"),
  review: require("../../../assets/art/icons/review-button-icon.png"),
  star: require("../../../assets/art/icons/star-filled.png"),
  starEmpty: require("../../../assets/art/icons/star-empty.png"),
  turtle: require("../../../assets/art/icons/turtle.png"),
} as const;
export type IconName = keyof typeof ICONS;

export const LOGO_FACE = require("../../../assets/art/capi/logo-face.png");

export const POND = {
  capyFront: require("../../../assets/art/pond/capy-front.png"),
  capyLeft: require("../../../assets/art/pond/capy-look-left.png"),
  capyRight: require("../../../assets/art/pond/capy-look-right.png"),
  waterBack: require("../../../assets/art/pond/water-back.png"),
  waterFront: require("../../../assets/art/pond/water-front.png"),
  frogSit: require("../../../assets/art/pond/frog-sit.png"),
  frogBlink: require("../../../assets/art/pond/frog-sit-blink.png"),
  frogAir: require("../../../assets/art/pond/frog-air.png"),
} as const;

/** The little picture on a capybara's label for each themed lesson (letters use their own letters). */
export const UNIT_ICONS: Readonly<Record<string, number>> = {
  "unit-05": require("../../../assets/art/icons/unit-bilang.png"),
  "theme-hayop": require("../../../assets/art/icons/unit-hayop.png"),
  "theme-pamilya": require("../../../assets/art/icons/unit-pamilya.png"),
  "theme-katawan": require("../../../assets/art/icons/unit-katawan.png"),
  "theme-pagkain": require("../../../assets/art/icons/unit-pagkain.png"),
  "theme-kulay": require("../../../assets/art/icons/unit-kulay.png"),
  "theme-kalikasan": require("../../../assets/art/icons/unit-kalikasan.png"),
  "theme-magalang": require("../../../assets/art/icons/unit-magalang.png"),
  "theme-bagay": require("../../../assets/art/icons/unit-bagay.png"),
};

/** Tagumpay medals: the coloured one and its grey, locked twin. */
export const MEDAL_ART = {
  first: { on: require("../../../assets/art/medals/medal-first-lesson.png"), off: require("../../../assets/art/medals/medal-first-lesson-locked.png") },
  five: { on: require("../../../assets/art/medals/medal-lessons-5.png"), off: require("../../../assets/art/medals/medal-lessons-5-locked.png") },
  ten: { on: require("../../../assets/art/medals/medal-lessons-10.png"), off: require("../../../assets/art/medals/medal-lessons-10-locked.png") },
  perfect: { on: require("../../../assets/art/medals/medal-perfect-score.png"), off: require("../../../assets/art/medals/medal-perfect-score-locked.png") },
  s3: { on: require("../../../assets/art/medals/medal-streak-3.png"), off: require("../../../assets/art/medals/medal-streak-3-locked.png") },
  s7: { on: require("../../../assets/art/medals/medal-streak-7.png"), off: require("../../../assets/art/medals/medal-streak-7-locked.png") },
  xp100: { on: require("../../../assets/art/medals/medal-xp-100.png"), off: require("../../../assets/art/medals/medal-xp-100-locked.png") },
  xp500: { on: require("../../../assets/art/medals/medal-xp-500.png"), off: require("../../../assets/art/medals/medal-xp-500-locked.png") },
  book1: { on: require("../../../assets/art/medals/medal-book-1.png"), off: require("../../../assets/art/medals/medal-book-1-locked.png") },
  book2: { on: require("../../../assets/art/medals/medal-book-2.png"), off: require("../../../assets/art/medals/medal-book-2-locked.png") },
  book3: { on: require("../../../assets/art/medals/medal-book-3.png"), off: require("../../../assets/art/medals/medal-book-3-locked.png") },
  book4: { on: require("../../../assets/art/medals/medal-book-4.png"), off: require("../../../assets/art/medals/medal-book-4-locked.png") },
  book5: { on: require("../../../assets/art/medals/medal-book-5.png"), off: require("../../../assets/art/medals/medal-book-5-locked.png") },
  book6: { on: require("../../../assets/art/medals/medal-book-6.png"), off: require("../../../assets/art/medals/medal-book-6-locked.png") },
} as const;
export type MedalId = keyof typeof MEDAL_ART;

/** Child avatars. A child picks one; it is kept on this phone. */
export const AVATARS = {
  capi: require("../../../assets/art/avatars/avatar-capi.png"),
  aso: require("../../../assets/art/avatars/avatar-aso.png"),
  pusa: require("../../../assets/art/avatars/avatar-pusa.png"),
  kuneho: require("../../../assets/art/avatars/avatar-kuneho.png"),
  leon: require("../../../assets/art/avatars/avatar-leon.png"),
  palaka: require("../../../assets/art/avatars/avatar-palaka.png"),
  pato: require("../../../assets/art/avatars/avatar-pato.png"),
  sisiw: require("../../../assets/art/avatars/avatar-sisiw.png"),
} as const;
export type AvatarId = keyof typeof AVATARS;
export const AVATAR_IDS = Object.keys(AVATARS) as AvatarId[];

/** Short sound effects (not Capi's voice). */
export const SFX = {
  correct: require("../../../assets/audio/sfx/correct.mp3"),
  finished: require("../../../assets/audio/sfx/lesson-finished.mp3"),
  medal: require("../../../assets/audio/sfx/medal-earned.mp3"),
} as const;
export type SfxName = keyof typeof SFX;
