import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore } from "../../store/useAppStore";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
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
  onSwitchChild: () => void;
  onLogout: () => void;
  onClose: () => void;
};

const ACCOUNT: { id: Route; label: string }[] = [
  { id: "prefs", label: "Mga Kagustuhan" },
  { id: "profile", label: "Profile" },
  { id: "notif", label: "Mga Abiso" },
  { id: "sound", label: "Tunog at Boses" },
  { id: "parent", label: "Para sa Magulang" },
  { id: "privacy", label: "Mga Setting ng Privacy" },
];
const SUPPORT: { id: Route; label: string }[] = [
  { id: "help", label: "Tulong" },
  { id: "feedback", label: "Puna" },
];
const TITLES: Record<Route, string> = {
  root: "Mga Setting",
  prefs: "Mga Kagustuhan",
  profile: "Profile",
  notif: "Mga Abiso",
  sound: "Tunog at Boses",
  parent: "Para sa Magulang",
  privacy: "Mga Setting ng Privacy",
  help: "Tulong",
  feedback: "Puna",
  terms: "Mga Tuntunin",
};

/** "Mga Setting": the list from the design, with a small page behind each row. */
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
          accessibilityLabel={root ? "Isara" : "Bumalik"}
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
      <Text style={styles.section}>SUPORTA</Text>
      <Group rows={SUPPORT} go={go} />

      <View style={styles.sleepy}>
        <CapiPeek peek="sleepy" width={150} />
      </View>
      <Button3D label="Mag-log out" tone="outlineDanger" onPress={onLogout} />
      <View style={styles.legal}>
        <TextLink label="Mga Tuntunin" onPress={() => go("terms")} />
        <TextLink label="Patakaran sa Privacy" onPress={() => go("privacy")} />
        <TextLink label="Mga Pasasalamat" onPress={() => Alert.alert("Mga Pasasalamat", CREDITS)} />
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
      title="Mga animasyon"
      text="Maiikling animasyon kapag nagbubukas ng libro o nagsisimula ng aralin. Patayin kung bumabagal ang telepono."
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
            title="Mabagal na boses"
            text="Mas mabagal magsalita si Capi para marinig ang bawat tunog."
            value={p.slow}
            onChange={p.onSlow}
          />
          {route === "prefs" ? <AnimationsToggle /> : null}
          {route === "sound" ? (
            <Text style={styles.body}>
              Pindutin lang ang mikropono nang isang beses. Kusa itong titigil kapag tapos nang magsalita ang bata. Kung hindi gumagana,
              payagan ang mikropono sa mga setting ng telepono.
            </Text>
          ) : null}
        </>
      );
    case "profile":
      return (
        <>
          <Info label="Mag-aaral" value={p.childName} />
          <Info label="Email ng magulang" value={p.email || "-"} />
          <Button3D label="Palitan ang mag-aaral" tone="info" onPress={p.onSwitchChild} />
        </>
      );
    case "notif":
      return <Text style={styles.body}>Malapit na! Dito mo maaayos ang mga paalala para hindi mawala ang streak.</Text>;
    case "feedback":
      return <Text style={styles.body}>Malapit na! Dito ka makakapagpadala ng puna tungkol sa Basa-Bata.</Text>;
    case "help":
      return (
        <>
          <Text style={styles.body}>
            Mag-aral kasama ang bata: pakinggan si Capi, ulitin ang salita, at pindutin ang mga pantig na naririnig.
          </Text>
          <Text style={styles.body}>
            Kapag hindi marinig ng telepono ang bata, subukan sa tahimik na lugar at ilapit nang kaunti ang telepono.
          </Text>
          <Button3D label="Panoorin ang tutorial sa mikropono" tone="info" onPress={onTutorial} />
        </>
      );
    case "privacy":
      return <Text style={styles.body}>{PRIVACY}</Text>;
    case "terms":
      return <Text style={styles.body}>{TERMS}</Text>;
    case "parent":
      return (
        <>
          <ToggleRow
            title="Buksan lahat ng aralin"
            text="Para sa demo: bukas ang lahat ng libro at aralin kahit hindi pa natatapos ang nauna."
            value={p.unlockAll}
            onChange={p.onUnlockAll}
          />
          <Text style={styles.section}>PARA SA MGA DEVELOPER</Text>
          <Button3D label="Suriin ang backend" tone="neutral" small onPress={p.onCheckBackend} />
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

const CREDITS = "Basa-Bata ay ginawa nina Raizen at Karylle Ann Herrera ng ICI College. Ang mga larawan at si Capi ay orihinal na gawa para sa proyektong ito.";
const PRIVACY =
  "Draft: Palayaw lang ng bata ang kailangan namin. Ang boses ay ginagamit lang para suriin ang binabasa at hindi ito itinatabi. Ang email ng magulang ay ginagamit lang para sa pag-sign in. Susuriin muna ito ng guro at ng may-akda bago ang opisyal na paglabas.";
const TERMS = "Draft: Gamitin ang Basa-Bata para sa pag-aaral ng pagbasa. Susuriin muna ito ng guro at ng may-akda bago ang opisyal na paglabas.";

const styles = StyleSheet.create({
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
