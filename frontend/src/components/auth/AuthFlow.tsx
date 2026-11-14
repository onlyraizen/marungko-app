import { useEffect, useState } from "react";
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
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LANGUAGES, useT, type Translate } from "../../i18n";
import { supabase } from "../../services/supabase";
import { useAppStore } from "../../store/useAppStore";
import { font } from "../../theme/fonts";
import { CapiPeek } from "../art/Capi";
import { Capi } from "../art/Capi";
import Button3D from "../ui/Button3D";
import { BackIcon, EyeIcon } from "../ui/Icons";
import TextLink from "../ui/TextLink";
import { signInWithGoogle } from "../../services/googleAuth";
import { CodeBoxes, CodeKeypad } from "./CodeKeypad";
import { dark, darkStyles, DarkPage, HelloCapi } from "./dark";

type Step = "welcome" | "meet" | "saved" | "form" | "code";
type Mode = "signIn" | "signUp";
/** What the emailed code is for: confirming a new account, or setting a new password. */
type CodeFor = "signup" | "recovery";

/** Seconds before another code may be asked for. Supabase allows one per 60 s per person, so ask no sooner. */
const RESEND_SECONDS = 60;

/**
 * Everything before the app: welcome, meeting Capi, saved accounts, the email + password form, and the 6-digit code.
 * The home screen reacts to the new session, so nothing here has to navigate when sign-in works.
 *
 * Why a code and not a link: the confirmation link of a hosted Supabase project opens a web page whose address carries
 * the sign-in token, and the default page it opens is "localhost", which is a security finding and a dead end for a
 * parent. A code typed into the app never puts a token in a web address. (The email template must show the code:
 * docs/AUTH-SETUP.md, step 1.)
 */
export default function AuthFlow() {
  const saved = useAppStore((state) => state.savedAccounts);
  const [step, setStep] = useState<Step>(saved.length > 0 ? "saved" : "welcome");
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [codeFor, setCodeFor] = useState<CodeFor>("signup");

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
  if (step === "code") {
    return <CodeStep email={email} purpose={codeFor} onBack={() => setStep("form")} />;
  }
  if (step === "form") {
    return (
      <Form
        mode={mode}
        email={email}
        onEmail={setEmail}
        onBack={() => setStep(saved.length > 0 ? "saved" : "welcome")}
        onSwitchMode={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
        onNeedCode={(purpose) => {
          setCodeFor(purpose);
          setStep("code");
        }}
      />
    );
  }
  return <Welcome onSignIn={() => toForm("signIn")} onNew={() => setStep("meet")} />;
}

/** "FIL | EN": the sign-in screens in Filipino or English. */
export function LanguageSwitch() {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const t = useT();
  return (
    <View style={styles.switch} accessibilityRole="radiogroup" accessibilityLabel={t("languageLabel")}>
      {LANGUAGES.map((option) => {
        const on = option.id === language;
        return (
          <Pressable
            key={option.id}
            onPress={() => setLanguage(option.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={option.label}
            hitSlop={6}
            style={[styles.switchItem, on && styles.switchOn]}
          >
            <Text style={[styles.switchText, on && styles.switchTextOn]}>{option.id === "fil" ? "FIL" : "EN"}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Welcome({ onSignIn, onNew }: { onSignIn: () => void; onNew: () => void }) {
  const t = useT();
  return (
    <DarkPage>
      <View style={styles.topRight}>
        <LanguageSwitch />
      </View>
      <View style={styles.hero}>
        <HelloCapi size={190} />
      </View>
      <View style={styles.askCard}>
        <Text style={styles.askTitle}>{t("welcomeAsk")}</Text>
        <Button3D label={t("signInButton")} onPress={onSignIn} />
        <View style={styles.divider}>
          <View style={styles.rule} />
          <Text style={darkStyles.label}>{t("or")}</Text>
          <View style={styles.rule} />
        </View>
        <Text style={styles.askTitle}>{t("newAsk")}</Text>
        <Button3D label={t("startButton")} tone="infoLight" onPress={onNew} />
      </View>
      <View style={styles.pondSpace} />
    </DarkPage>
  );
}

export function Meet({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const t = useT();
  return (
    <DarkPage>
      <View style={styles.headerRow}>
        <BackButton onPress={onBack} />
        <LanguageSwitch />
      </View>
      <View style={styles.hero}>
        <Capi pose="palms" size={250} />
        <Text style={darkStyles.title}>{t("meetTitle")}</Text>
        <Text style={darkStyles.body}>{t("meetBody")}</Text>
      </View>
      <Button3D label={t("continueButton")} onPress={onNext} />
    </DarkPage>
  );
}

export function SavedAccounts({ onPick, onOther }: { onPick: (email: string) => void; onOther: () => void }) {
  const t = useT();
  const saved = useAppStore((state) => state.savedAccounts);
  const forget = useAppStore((state) => state.forgetAccount);
  const [managing, setManaging] = useState(false);
  return (
    <DarkPage>
      <ScrollView contentContainerStyle={styles.savedScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRight}>
          <LanguageSwitch />
        </View>
        <View style={styles.hero}>
          <HelloCapi size={190} />
          <Text style={darkStyles.title}>{t("welcomeBack")}</Text>
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
              <Pressable onPress={() => forget(address)} accessibilityLabel={t("removeAccountLabel", { email: address })} hitSlop={10}>
                <Text style={styles.remove}>{t("removeAccount")}</Text>
              </Pressable>
            ) : null}
          </Pressable>
        ))}
        <Button3D label={t("addAccount")} tone="outlineLight" onPress={onOther} />
        <TextLink
          label={managing ? t("doneManaging") : t("manageAccounts")}
          color={dark.blue}
          onPress={() => setManaging(!managing)}
        />
      </ScrollView>
    </DarkPage>
  );
}

/** A message for the person, from a Supabase error: our own words for the common ones, never a token or a raw code. */
function friendly(error: { message: string; status?: number; code?: string }, t: Translate): string {
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") return t("tooManyTries");
  if (error.code === "invalid_credentials") return t("badLogin");
  if (error.code === "otp_expired" || error.code === "invalid_otp") return t("codeWrong");
  return error.message;
}

export function Form({
  mode,
  email,
  onEmail,
  onBack,
  onSwitchMode,
  onNeedCode,
}: {
  mode: Mode;
  email: string;
  onEmail: (value: string) => void;
  onBack: () => void;
  onSwitchMode: () => void;
  onNeedCode: (purpose: CodeFor) => void;
}) {
  const t = useT();
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
      setMessage(t("badEmail"));
      return;
    }
    if (password.length < 8) {
      setMessage(t("shortPassword"));
      return;
    }
    setBusy(true);
    setMessage(null);
    if (isSignIn) {
      const { error } = await supabase.auth.signInWithPassword({ email: address, password });
      if (error?.code === "email_not_confirmed") {
        // The account exists but was never confirmed: send a fresh code and go to the code screen.
        const sent = await supabase.auth.resend({ type: "signup", email: address });
        if (sent.error) setMessage(friendly(sent.error, t));
        else {
          onEmail(address);
          setMessage(null);
          Alert.alert("", t("notConfirmedSent"));
          onNeedCode("signup");
        }
      } else if (error) setMessage(friendly(error, t));
      else remember(address);
    } else {
      const { data, error } = await supabase.auth.signUp({ email: address, password });
      if (error) {
        setMessage(friendly(error, t));
      } else if (!data.session) {
        // Email confirmation is on: the account exists but is unconfirmed until the code from the email is entered.
        onEmail(address);
        onNeedCode("signup");
      } else {
        remember(address);
      }
    }
    setBusy(false);
  };

  const forgot = async () => {
    const address = email.trim().toLowerCase();
    if (!address.includes("@")) {
      setMessage(t("needEmailFirst"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(address);
    setBusy(false);
    if (error) {
      setMessage(friendly(error, t));
      return;
    }
    onEmail(address);
    onNeedCode("recovery");
  };

  const soon = () => Alert.alert(t("soonTitle"), t("soonBody"));
  const [googleBusy, setGoogleBusy] = useState(false);
  const google = async () => {
    if (googleBusy) return;
    setGoogleBusy(true);
    try {
      const result = await signInWithGoogle();
      // Cancelling is not an error: the person simply came back. The signed-in session is picked up by the app.
      if (!result.ok && !result.cancelled) Alert.alert(t("googleFailedTitle"), t("googleFailedBody"));
    } catch {
      Alert.alert(t("googleFailedTitle"), t("googleFailedBody"));
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <DarkPage scene="plain" style={{ paddingTop: insets.top + 16 }}>
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <BackButton onPress={onBack} />
          </View>
          <View style={styles.peekWrap}>
            <CapiPeek peek="thinking" width={150} />
          </View>
          <Text style={darkStyles.title}>{t("formTitle")}</Text>

          <TextInput
            style={styles.field}
            placeholder={t("emailPlaceholder")}
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
              placeholder={t("passwordPlaceholder")}
              placeholderTextColor={dark.muted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!show}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShow(!show)} style={styles.eye} accessibilityRole="button" accessibilityLabel={show ? t("hidePassword") : t("showPassword")}>
              <EyeIcon off={!show} />
            </Pressable>
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {busy ? (
            <ActivityIndicator color={dark.green} style={styles.spinner} />
          ) : (
            <Button3D label={isSignIn ? t("signInButton") : t("createButton")} disabled={!filled} onPress={submit} />
          )}
          {isSignIn ? <TextLink label={t("forgotLink")} color={dark.blue} onPress={forgot} /> : null}
          <TextLink label={isSignIn ? t("switchToSignUp") : t("switchToSignIn")} color={dark.blue} onPress={onSwitchMode} />

          <View style={styles.divider}>
            <View style={styles.rule} />
            <Text style={darkStyles.label}>{t("or")}</Text>
            <View style={styles.rule} />
          </View>
          {["Google", "Facebook", "Apple"].map((name) => (
            <Pressable key={name} onPress={name === "Google" ? google : soon} disabled={googleBusy} accessibilityRole="button" style={styles.social}>
              <Text style={styles.socialText}>{t("socialButton", { name: name.toUpperCase() })}</Text>
            </Pressable>
          ))}
          <Text style={styles.terms}>{t("terms")}</Text>
        </ScrollView>
      </DarkPage>
    </KeyboardAvoidingView>
  );
}

/**
 * "Tingnan ang iyong email": the 6-digit code from the email. For a new account it confirms the email; for a forgotten
 * password it also takes the new password, so the person is signed in with it straight away.
 */
export function CodeStep({ email, purpose, onBack }: { email: string; purpose: CodeFor; onBack: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const remember = useAppStore((state) => state.rememberAccount);
  const [digits, setDigits] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);
  // A forgotten password has two steps: the code (on the number pad), then the new password (on the keyboard).
  const [phase, setPhase] = useState<"code" | "password">("code");
  const recovery = purpose === "recovery";

  // The code was just sent: count down before another one may be asked for.
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const press = (digit: string) => {
    // After a wrong code the next key starts a fresh one.
    const base = wrong ? "" : digits;
    setWrong(false);
    setMessage(null);
    if (base.length < 6) setDigits(base + digit);
    else setDigits(base);
  };
  const erase = () => {
    setWrong(false);
    setMessage(null);
    setDigits((current) => (wrong ? "" : current.slice(0, -1)));
  };

  const confirm = async () => {
    if (digits.length < 6) {
      setMessage(t("codeBadLength"));
      return;
    }
    if (recovery && phase === "code") {
      setPhase("password");
      return;
    }
    if (recovery && password.length < 8) {
      setMessage(t("shortPassword"));
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.verifyOtp({ email, token: digits, type: purpose });
    if (error) {
      setBusy(false);
      setMessage(friendly(error, t));
      setWrong(true);
      // A wrong code on a forgotten password goes back to the number pad.
      if (recovery) setPhase("code");
      return;
    }
    // Signed in now. For a forgotten password the new one is saved straight away; if that fails, sign out so the
    // person stays on this screen with the message instead of landing in the app with the old password.
    if (recovery) {
      const saved = await supabase.auth.updateUser({ password });
      if (saved.error) {
        await supabase.auth.signOut();
        setBusy(false);
        setMessage(t("resetNotSaved"));
        return;
      }
    }
    remember(email);
    setBusy(false);
  };

  const resend = async () => {
    if (wait > 0) return;
    setMessage(null);
    setWrong(false);
    const { error } = recovery ? await supabase.auth.resetPasswordForEmail(email) : await supabase.auth.resend({ type: "signup", email });
    if (error) {
      setMessage(friendly(error, t));
      return;
    }
    setDigits("");
    setWait(RESEND_SECONDS);
    setMessage(t("codeResent"));
  };

  if (phase === "password") {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <DarkPage scene="plain" style={{ paddingTop: insets.top + 16 }}>
          <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <BackButton onPress={() => setPhase("code")} />
            </View>
            <View style={styles.peekWrap}>
              <CapiPeek peek="curious" width={150} />
            </View>
            <Text style={darkStyles.title}>{t("resetTitle")}</Text>
            <Text style={darkStyles.body}>{t("newPasswordBody")}</Text>
            <View style={styles.passRow}>
              <TextInput
                style={[styles.field, styles.passField]}
                placeholder={t("newPasswordPlaceholder")}
                placeholderTextColor={dark.muted}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!show}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setShow(!show)} style={styles.eye} accessibilityRole="button" accessibilityLabel={show ? t("hidePassword") : t("showPassword")}>
                <EyeIcon off={!show} />
              </Pressable>
            </View>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            {busy ? <ActivityIndicator color={dark.green} style={styles.spinner} /> : <Button3D label={t("resetButton")} disabled={password.length === 0} onPress={confirm} />}
          </ScrollView>
        </DarkPage>
      </KeyboardAvoidingView>
    );
  }

  // Capi shrinks (or leaves) on short phones so the number pad never covers the button.
  const capiSize = Math.max(0, Math.min(150, height - 294 - insets.top - insets.bottom - 372));
  const resendText = wait > 0 ? t("codeResendWait", { seconds: wait }) : t("codeResend");
  return (
    <DarkPage scene="clouds" style={{ paddingTop: insets.top + 6 }}>
      <View style={styles.headerRow}>
        <BackButton onPress={onBack} />
      </View>
      <View style={styles.codeBody}>
        {capiSize >= 80 ? <Capi pose={wrong ? "tryAgain" : "sign"} size={capiSize} /> : null}
        <Text style={darkStyles.title}>{recovery ? t("resetTitle") : t("codeTitle")}</Text>
        <Text style={[darkStyles.body, { textAlign: "center" }]}>{t("codeSent", { email })}</Text>
        <CodeBoxes digits={digits} wrong={wrong} />
        {message ? <Text style={[styles.message, { textAlign: "center" }]}>{message}</Text> : null}
        <TextLink label={resendText} color={wait > 0 ? dark.muted : dark.blue} onPress={resend} />
        {busy ? <ActivityIndicator color={dark.green} style={styles.spinner} /> : <Button3D label={recovery ? t("continueButton") : t("codeButton")} disabled={digits.length < 6} onPress={confirm} style={{ alignSelf: "stretch" }} />}
      </View>
      <CodeKeypad onDigit={press} onBack={erase} disabled={busy} />
    </DarkPage>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  const t = useT();
  return (
    <Pressable onPress={onPress} style={styles.back} accessibilityRole="button" accessibilityLabel={t("backLabel")} hitSlop={10}>
      <BackIcon color={dark.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: dark.bg },
  codeBody: { alignItems: "center", gap: 10 },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  brand: { fontFamily: font.display, fontSize: 44, lineHeight: 62, color: dark.text, includeFontPadding: false },
  actions: { gap: 14 },
  ask: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1.4, color: dark.muted, textAlign: "center", textTransform: "uppercase" },
  askCard: {
    gap: 12,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: dark.line,
    borderRadius: 26,
  },
  askTitle: { fontFamily: font.display, fontSize: 26, lineHeight: 38, color: dark.text, textAlign: "center", includeFontPadding: false },
  pondSpace: { height: 150 },
  back: { width: 44, height: 44, justifyContent: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topRight: { alignItems: "flex-end" },
  switch: { flexDirection: "row", borderWidth: 2, borderColor: dark.line, borderRadius: 14, overflow: "hidden", backgroundColor: dark.field },
  switchItem: { minWidth: 46, height: 34, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  switchOn: { backgroundColor: dark.green },
  switchText: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1.2, color: dark.muted },
  switchTextOn: { color: "#1D3B1A" },
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
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: dark.coral, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: font.display, fontSize: 24, lineHeight: 34, color: "#FFFFFF", includeFontPadding: false },
  accountText: { flex: 1, fontFamily: font.bold, fontSize: 17, color: dark.text },
  remove: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1.2, color: dark.coralDark },
  formScroll: { gap: 14, paddingBottom: 20 },
  peekWrap: { alignItems: "center", marginBottom: -4 },
  field: { height: 56, paddingHorizontal: 16, borderRadius: 16, backgroundColor: dark.field, color: dark.text, fontFamily: font.body, fontSize: 18 },
  code: { textAlign: "center", fontSize: 26, letterSpacing: 6 },
  passRow: { justifyContent: "center" },
  passField: { paddingRight: 56 },
  eye: { position: "absolute", right: 0, width: 54, height: 56, alignItems: "center", justifyContent: "center" },
  message: { fontFamily: font.bold, fontSize: 15, lineHeight: 21, color: dark.coralDark },
  spinner: { height: 60 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  rule: { flex: 1, height: 2, backgroundColor: dark.line },
  social: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: "#CDBFA4",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  socialText: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1, color: dark.text },
  terms: { fontFamily: font.body, fontSize: 13, lineHeight: 19, color: dark.muted, textAlign: "center", marginTop: 4 },
});
