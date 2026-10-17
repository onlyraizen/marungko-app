import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../services/supabase";
import { useAppStore } from "../../store/useAppStore";
import { font } from "../../theme/fonts";
import { CapiPeek } from "../art/Capi";
import { Capi } from "../art/Capi";
import Button3D from "../ui/Button3D";
import { BackIcon, EyeIcon } from "../ui/Icons";
import TextLink from "../ui/TextLink";
import { dark, darkStyles, DarkPage, HelloCapi } from "./dark";

type Step = "welcome" | "meet" | "saved" | "form";
type Mode = "signIn" | "signUp";

/**
 * Everything before the app: welcome, meeting Capi, saved accounts, and the email + password form.
 * The home screen reacts to the new session, so nothing here has to navigate when sign-in works.
 */
export default function AuthFlow() {
  const saved = useAppStore((state) => state.savedAccounts);
  const [step, setStep] = useState<Step>(saved.length > 0 ? "saved" : "welcome");
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");

  const toForm = (nextMode: Mode, address = "") => {
    setMode(nextMode);
    setEmail(address);
    setStep("form");
  };

  if (step === "saved") {
    return <SavedAccounts onPick={(address) => toForm("signIn", address)} onOther={() => setStep("welcome")} />;
  }
  if (step === "meet") {
    return <Meet onNext={() => toForm("signUp")} onBack={() => setStep("welcome")} />;
  }
  if (step === "form") {
    return (
      <Form
        mode={mode}
        email={email}
        onEmail={setEmail}
        onBack={() => setStep(saved.length > 0 ? "saved" : "welcome")}
        onSwitchMode={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
      />
    );
  }
  return <Welcome onSignIn={() => toForm("signIn")} onNew={() => setStep("meet")} />;
}

export function Welcome({ onSignIn, onNew }: { onSignIn: () => void; onNew: () => void }) {
  return (
    <DarkPage>
      <View style={styles.hero}>
        <HelloCapi size={250} />
        <Text style={styles.brand}>Basa-Bata</Text>
      </View>
      <View style={styles.actions}>
        <Text style={styles.ask}>May account ka na ba?</Text>
        <Button3D label="Mag-sign in" onPress={onSignIn} />
        <Text style={styles.ask}>Bago ka sa Basa-Bata?</Text>
        <Button3D label="Simulan na" tone="outlineLight" labelColor={dark.green} onPress={onNew} />
      </View>
    </DarkPage>
  );
}

export function Meet({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <DarkPage>
      <BackButton onPress={onBack} />
      <View style={styles.hero}>
        <Capi pose="palms" size={250} />
        <Text style={darkStyles.title}>Kumusta! Ako si Capi!</Text>
        <Text style={darkStyles.body}>Tutulungan kitang magbasa, isang tunog sa bawat pagkakataon.</Text>
      </View>
      <Button3D label="Ituloy" onPress={onNext} />
    </DarkPage>
  );
}

export function SavedAccounts({ onPick, onOther }: { onPick: (email: string) => void; onOther: () => void }) {
  const saved = useAppStore((state) => state.savedAccounts);
  const forget = useAppStore((state) => state.forgetAccount);
  const [managing, setManaging] = useState(false);
  return (
    <DarkPage>
      <ScrollView contentContainerStyle={styles.savedScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <HelloCapi size={190} />
          <Text style={darkStyles.title}>Maligayang pagbabalik!</Text>
        </View>
        {saved.map((address) => (
          <Pressable
            key={address}
            onPress={() => (managing ? undefined : onPick(address))}
            accessibilityRole="button"
            style={({ pressed }) => [styles.account, pressed && !managing && { marginTop: 3, borderBottomWidth: 2 }]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{address.slice(0, 1).toUpperCase()}</Text>
            </View>
            <Text style={styles.accountText} numberOfLines={1}>
              {address}
            </Text>
            {managing ? (
              <Pressable onPress={() => forget(address)} accessibilityLabel={`Alisin ang ${address}`} hitSlop={10}>
                <Text style={styles.remove}>ALISIN</Text>
              </Pressable>
            ) : null}
          </Pressable>
        ))}
        <Button3D label="Magdagdag ng ibang account" tone="outlineLight" onPress={onOther} />
        <TextLink
          label={managing ? "Tapos na" : "Pamahalaan ang mga account"}
          color={dark.blue}
          onPress={() => setManaging(!managing)}
        />
      </ScrollView>
    </DarkPage>
  );
}

export function Form({
  mode,
  email,
  onEmail,
  onBack,
  onSwitchMode,
}: {
  mode: Mode;
  email: string;
  onEmail: (value: string) => void;
  onBack: () => void;
  onSwitchMode: () => void;
}) {
  const insets = useSafeAreaInsets();
  const remember = useAppStore((state) => state.rememberAccount);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isSignIn = mode === "signIn";
  const filled = email.trim().length > 0 && password.length > 0;

  const submit = async () => {
    const address = email.trim().toLowerCase();
    if (!address.includes("@")) {
      setMessage("Maglagay ng tamang email address.");
      return;
    }
    if (password.length < 8) {
      setMessage("Gumamit ng hindi bababa sa 8 titik para sa password.");
      return;
    }
    setBusy(true);
    setMessage(null);
    if (isSignIn) {
      const { error } = await supabase.auth.signInWithPassword({ email: address, password });
      if (error) setMessage(error.message);
      else remember(address);
    } else {
      const { data, error } = await supabase.auth.signUp({ email: address, password });
      if (error) {
        setMessage(error.message);
      } else if (!data.session) {
        // Happens while email confirmation is on: the account exists but is unconfirmed.
        setMessage("Nagawa ang account. Kailangan itong ma-confirm bago ka makapag-sign in.");
        remember(address);
      } else {
        remember(address);
      }
    }
    setBusy(false);
  };

  const forgot = async () => {
    const address = email.trim().toLowerCase();
    if (!address.includes("@")) {
      setMessage("Ilagay muna ang iyong email address.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(address);
    setMessage(error ? error.message : "Nagpadala kami ng link para palitan ang password. Tingnan ang iyong email.");
  };

  const soon = () => Alert.alert("Malapit na", "Hindi pa magagamit ang pag-sign in gamit ang ibang app. Gumamit muna ng email.");

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <DarkPage style={{ paddingTop: insets.top + 16 }}>
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <BackButton onPress={onBack} />
          <View style={styles.peekWrap}>
            <CapiPeek peek="thinking" width={150} />
          </View>
          <Text style={darkStyles.title}>Ilagay ang iyong detalye</Text>

          <TextInput
            style={styles.field}
            placeholder="Email address"
            placeholderTextColor={dark.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={onEmail}
          />
          <View style={styles.passRow}>
            <TextInput
              style={[styles.field, styles.passField]}
              placeholder="Password (8+ titik)"
              placeholderTextColor={dark.muted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!show}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShow(!show)} style={styles.eye} accessibilityRole="button" accessibilityLabel={show ? "Itago ang password" : "Ipakita ang password"}>
              <EyeIcon off={!show} />
            </Pressable>
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {busy ? (
            <ActivityIndicator color={dark.green} style={styles.spinner} />
          ) : (
            <Button3D label={isSignIn ? "Mag-sign in" : "Gumawa ng account"} disabled={!filled} onPress={submit} />
          )}
          {isSignIn ? <TextLink label="Nalimutan ang password" color={dark.blue} onPress={forgot} /> : null}
          <TextLink
            label={isSignIn ? "Bago ka ba? Gumawa ng account" : "May account na? Mag-sign in"}
            color={dark.blue}
            onPress={onSwitchMode}
          />

          <View style={styles.divider}>
            <View style={styles.rule} />
            <Text style={darkStyles.label}>O</Text>
            <View style={styles.rule} />
          </View>
          {["Google", "Facebook", "Apple"].map((name) => (
            <Pressable key={name} onPress={soon} accessibilityRole="button" style={styles.social}>
              <Text style={styles.socialText}>MAG-SIGN IN GAMIT ANG {name.toUpperCase()}</Text>
            </Pressable>
          ))}
          <Text style={styles.terms}>
            Sa pag-sign in, sumasang-ayon ka sa aming Mga Tuntunin at Patakaran sa Privacy.
          </Text>
        </ScrollView>
      </DarkPage>
    </KeyboardAvoidingView>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.back} accessibilityRole="button" accessibilityLabel="Bumalik" hitSlop={10}>
      <BackIcon color={dark.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: dark.bg },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  brand: { fontFamily: font.display, fontSize: 44, lineHeight: 62, color: dark.text, includeFontPadding: false },
  actions: { gap: 14 },
  ask: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1.4, color: dark.muted, textAlign: "center", textTransform: "uppercase" },
  back: { width: 44, height: 44, justifyContent: "center" },
  savedScroll: { flexGrow: 1, gap: 14, paddingBottom: 12 },
  account: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
    backgroundColor: dark.field,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: dark.line,
    borderRadius: 18,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: dark.blue, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: font.display, fontSize: 24, lineHeight: 34, color: "#12303F", includeFontPadding: false },
  accountText: { flex: 1, fontFamily: font.bold, fontSize: 17, color: dark.text },
  remove: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1.2, color: dark.coral },
  formScroll: { gap: 14, paddingBottom: 20 },
  peekWrap: { alignItems: "center", marginBottom: -4 },
  field: { height: 56, paddingHorizontal: 16, borderRadius: 16, backgroundColor: dark.field, color: dark.text, fontFamily: font.body, fontSize: 18 },
  passRow: { justifyContent: "center" },
  passField: { paddingRight: 56 },
  eye: { position: "absolute", right: 0, width: 54, height: 56, alignItems: "center", justifyContent: "center" },
  message: { fontFamily: font.bold, fontSize: 15, lineHeight: 21, color: dark.coral },
  spinner: { height: 60 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  rule: { flex: 1, height: 2, backgroundColor: dark.line },
  social: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: dark.line,
    borderRadius: 16,
  },
  socialText: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1, color: dark.text },
  terms: { fontFamily: font.body, fontSize: 13, lineHeight: 19, color: dark.muted, textAlign: "center", marginTop: 4 },
});
