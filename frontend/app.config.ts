import type { ConfigContext, ExpoConfig } from "expo/config";

const MIC_REASON =
  "Basa-Bata listens to your child's voice so it can check how they read each sound and word.";

// Plugins we re-add below with options; drop any plain copy from app.json.
const MANAGED = new Set(["expo-audio", "expo-dev-client"]);

type PluginEntry = NonNullable<ExpoConfig["plugins"]>[number];

const pluginName = (entry: PluginEntry): string =>
  Array.isArray(entry) ? String(entry[0]) : String(entry);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Basa-Bata",
  slug: "marungko-app",
  scheme: "marungko",
  ios: {
    ...config.ios,
    bundleIdentifier: "com.marungko.app",
    infoPlist: {
      ...config.ios?.infoPlist,
      NSMicrophoneUsageDescription: MIC_REASON,
    },
  },
  android: {
    ...config.android,
    package: "com.marungko.app",
    permissions: ["RECORD_AUDIO", "MODIFY_AUDIO_SETTINGS"],
  },
  plugins: [
    ...(config.plugins ?? []).filter((entry) => !MANAGED.has(pluginName(entry))),
    "expo-dev-client",
    ["expo-audio", { microphonePermission: MIC_REASON }],
  ],
});
