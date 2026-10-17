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
