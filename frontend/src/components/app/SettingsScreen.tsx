import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore } from "../../store/useAppStore";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { Image } from "expo-image";
import { PARENT_ICONS } from "../art/assets";
import { CapiPeek } from "../art/Capi";
import Button3D from "../ui/Button3D";
import { BackIcon, ChevronIcon, CloseIcon } from "../ui/Icons";
import MicTutorial from "../lesson/MicTutorial";
import TextLink from "../ui/TextLink";

type Route = "root" | "prefs" | "profile" | "notif" | "sound" | "parent" | "privacy" | "help" | "feedback" | "terms";

type Props = {
  childName: string;
  email: string;
  slow: boolean;
  onSlow: (value: boolean) => void;
  unlockAll: boolean;
  onUnlockAll: (value: boolean) => void;
  check: string | null;
  onCheckBackend: () => void;
  onOpenLive: () => void;
  onOpenMic: () => void;
  onOpenReport: () => void;
  onSwitchChild: () => void;
  onLogout: () => void;
  onClose: () => void;
};

const ACCOUNT: { id: Route; label: string }[] = [
  { id: "prefs", label: "Preferences" },
  { id: "profile", label: "Profile" },
  { id: "notif", label: "Notifications" },
  { id: "sound", label: "Sound & Voice" },
  { id: "parent", label: "For Parents" },
  { id: "privacy", label: "Privacy Settings" },
];
const SUPPORT: { id: Route; label: string }[] = [
  { id: "help", label: "Help" },
  { id: "feedback", label: "Feedback" },
];
const TITLES: Record<Route, string> = {
  root: "Settings",
  prefs: "Preferences",
  profile: "Profile",
  notif: "Notifications",
  sound: "Sound & Voice",
  parent: "For Parents",
  privacy: "Privacy Settings",
  help: "Help",
  feedback: "Feedback",
  terms: "Terms",
};

/** "Settings": the list from the design, with a small page behind each row. */
export default function SettingsScreen(props: Props) {
  const insets = useSafeAreaInsets();
  const [route, setRoute] = useState<Route>("root");
  const root = route === "root";
  const [tutorial, setTutorial] = useState(false);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => (root ? props.onClose() : setRoute("root"))}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel={root ? "Close" : "Back"}
        >
          {root ? <CloseIcon /> : <BackIcon />}
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {TITLES[route]}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {root ? <Root {...props} go={setRoute} /> : <Page route={route} {...props} go={setRoute} onTutorial={() => setTutorial(true)} />}
      </ScrollView>
      {tutorial ? <MicTutorial onClose={() => setTutorial(false)} /> : null}
    </View>
  );
}

function Root({ onLogout, go }: Props & { go: (route: Route) => void }) {
  return (
    <>
      <Text style={styles.section}>ACCOUNT</Text>
      <Group rows={ACCOUNT} go={go} />
      <Text style={styles.section}>SUPPORT</Text>
      <Group rows={SUPPORT} go={go} />

      <View style={styles.sleepy}>
        <CapiPeek peek="sleepy" width={150} />
      </View>
      <Button3D label="Log out" tone="outlineDanger" onPress={onLogout} />
      <View style={styles.legal}>
        <TextLink label="Terms" onPress={() => go("terms")} />
        <TextLink label="Privacy Policy" onPress={() => go("privacy")} />
        <TextLink label="Credits" onPress={() => Alert.alert("Credits", CREDITS)} />
      </View>
      <Text style={styles.version}>Basa-Bata v1.0</Text>
    </>
  );
}

function Group({ rows, go }: { rows: { id: Route; label: string }[]; go: (route: Route) => void }) {
  return (
    <View style={styles.group}>
      {rows.map((row, i) => (
        <Pressable
          key={row.id}
          onPress={() => go(row.id)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && { backgroundColor: colors.infoBg }]}
        >
          <Text style={styles.rowText}>{row.label}</Text>
          <ChevronIcon />
        </Pressable>
      ))}
    </View>
  );
}

function ToggleRow({ title, text, value, onChange }: { title: string; text: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.body}>{text}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.line }} thumbColor="#FFFFFF" />
    </View>
  );
}

function AnimationsToggle() {
  const animations = useAppStore((state) => state.animations);
  const setAnimations = useAppStore((state) => state.setAnimations);
  return (
    <ToggleRow
      title="Animations"
      text="Short animations when a book opens or a lesson starts. Turn them off if your phone feels slow."
      value={animations}
      onChange={setAnimations}
    />
  );
}

function Page({ route, go, onTutorial, ...p }: Props & { route: Route; go: (route: Route) => void; onTutorial: () => void }) {
  switch (route) {
    case "prefs":
    case "sound":
      return (
        <>
          <ToggleRow
            title="Slow voice"
            text="Capi talks more slowly so every sound is easy to hear."
            value={p.slow}
            onChange={p.onSlow}
          />
          {route === "prefs" ? <AnimationsToggle /> : null}
          {route === "sound" ? (
            <Text style={styles.body}>
              Tap the microphone once. It stops by itself when the child finishes speaking. If it does not work, allow the microphone
              in your phone settings.
            </Text>
          ) : null}
        </>
      );
    case "profile":
      return (
        <>
          <Info label="Student" value={p.childName} />
          <Info label="Parent email" value={p.email || "-"} />
          <Button3D label="Switch student" tone="info" onPress={p.onSwitchChild} />
        </>
      );
    case "notif":
      return (
        <View style={styles.soon}>
          <Image source={PARENT_ICONS.bell} contentFit="contain" style={styles.soonIcon} />
          <Text style={styles.body}>Coming soon! You will be able to set reminders here so the streak is not lost.</Text>
        </View>
      );
    case "feedback":
      return <Text style={styles.body}>Coming soon! You will be able to send feedback about Basa-Bata here.</Text>;
    case "help":
      return (
        <>
          <Text style={styles.body}>
            Learn together with your child: listen to Capi, repeat the word, and tap the syllables you hear.
          </Text>
          <Text style={styles.body}>
            If the phone cannot hear your child, try a quiet place and hold the phone a little closer.
          </Text>
          <Button3D label="Watch the microphone tutorial" tone="info" onPress={onTutorial} />
        </>
      );
    case "privacy":
      return <Text style={styles.body}>{PRIVACY}</Text>;
    case "terms":
      return <Text style={styles.body}>{TERMS}</Text>;
    case "parent":
      return (
        <>
          <View style={styles.reportRow}>
            <Image source={PARENT_ICONS.report} contentFit="contain" style={styles.reportIcon} />
            <View style={styles.reportButton}>
              <Button3D label="Progress report" tone="info" onPress={p.onOpenReport} />
            </View>
          </View>
          <ToggleRow
            title="Unlock all lessons"
            text="For demos: every book and lesson is open even if the one before is not finished."
            value={p.unlockAll}
            onChange={p.onUnlockAll}
          />
          <Text style={styles.section}>FOR DEVELOPERS</Text>
          <Button3D label="Check backend" tone="neutral" small onPress={p.onCheckBackend} />
          {p.check ? <Text style={styles.body}>{p.check}</Text> : null}
          <Button3D label="Live transcript" tone="neutral" small onPress={p.onOpenLive} />
          <Button3D label="Mic test" tone="neutral" small onPress={p.onOpenMic} />
        </>
      );
    default:
      return null;
  }
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.section}>{label.toUpperCase()}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const CREDITS = "Basa-Bata was made by Raizen and Karylle Ann Herrera of ICI College. The pictures and Capi are original artwork made for this project.";
const PRIVACY =
  "Draft: We only need your child's nickname. The voice is used only to check what is being read and is not saved. The parent's email is used only for signing in. A teacher and the authors will review this before the official release.";
const TERMS = "Draft: Use Basa-Bata for learning to read. A teacher and the authors will review this before the official release.";

const styles = StyleSheet.create({
  reportRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  reportIcon: { width: 56, height: 56 },
  reportButton: { flex: 1 },
  soon: { alignItems: "center", gap: 10 },
  soonIcon: { width: 96, height: 96 },
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: font.display, fontSize: 24, lineHeight: 36, color: colors.ink, includeFontPadding: false },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  section: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1.6, color: colors.muted, marginTop: 8, marginLeft: 4 },
  group: { backgroundColor: colors.white, borderWidth: 2, borderBottomWidth: 5, borderColor: colors.border, borderRadius: 20, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 60, paddingHorizontal: 18 },
  rowLine: { borderTopWidth: 2, borderTopColor: "#F1E8D4" },
  rowText: { fontFamily: font.bold, fontSize: 17, color: colors.ink },
  sleepy: { alignItems: "center", marginTop: 16, marginBottom: -4 },
  legal: { alignItems: "center", marginTop: 4 },
  version: { fontFamily: font.body, fontSize: 13, color: colors.muted, textAlign: "center" },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 23, color: colors.muted },
  toggle: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, backgroundColor: colors.white, borderWidth: 2, borderBottomWidth: 5, borderColor: colors.border, borderRadius: 20 },
  toggleText: { flex: 1, gap: 2 },
  toggleTitle: { fontFamily: font.bold, fontSize: 17, color: colors.ink },
  info: { gap: 2 },
  infoValue: { fontFamily: font.display, fontSize: 22, lineHeight: 32, color: colors.ink, includeFontPadding: false },
});
