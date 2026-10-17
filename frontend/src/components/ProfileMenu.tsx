import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { font } from "../theme/fonts";
import Button3D from "./ui/Button3D";

type Props = {
  childName: string;
  email: string;
  unlockAll: boolean;
  check: string | null;
  onToggleUnlock: () => void;
  onSwitchChild: () => void;
  onCheckBackend: () => void;
  onOpenLive: () => void;
  onOpenMic: () => void;
  onSignOut: () => void;
  onClose: () => void;
};

/** Profile and developer tools, kept out of the child's way. */
export default function ProfileMenu(props: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
    >
      <Text style={styles.title}>{props.childName}</Text>
      <Text style={styles.muted}>{props.email}</Text>

      <Button3D label="Palitan ang mag-aaral" tone="info" onPress={props.onSwitchChild} />

      <Text style={styles.section}>Para sa demo</Text>
      <Button3D
        label={props.unlockAll ? "Naka-unlock lahat: ON" : "Naka-unlock lahat: OFF"}
        tone={props.unlockAll ? "accent" : "neutral"}
        onPress={props.onToggleUnlock}
      />

      <Text style={styles.section}>Mga tool para sa developer</Text>
      <Button3D label="Check backend login" tone="neutral" small onPress={props.onCheckBackend} />
      {props.check ? <Text style={styles.result}>{props.check}</Text> : null}
      <Button3D label="Live transcript" tone="neutral" small onPress={props.onOpenLive} />
      <Button3D label="Mic spike" tone="neutral" small onPress={props.onOpenMic} />

      <View style={styles.gap} />
      <Button3D label="Sign out" tone="danger" onPress={props.onSignOut} />
      <Button3D label="Isara" tone="neutral" onPress={props.onClose} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  title: { color: colors.text, fontFamily: font.display, fontSize: 34 },
  muted: { color: colors.muted, fontFamily: font.body, fontSize: 14, marginBottom: 8 },
  section: { color: colors.muted, fontFamily: font.bold, fontSize: 13, letterSpacing: 1, marginTop: 16, textTransform: "uppercase" },
  result: { color: colors.text, fontFamily: font.body, fontSize: 14 },
  gap: { height: 16 },
});
