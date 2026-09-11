import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { colors, fontSerif, radius } from "@/theme";
import { Logo } from "@/components/Logo";

export default function SignInScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setStatus("Enter an email and password.");
      setIsError(true);
      return;
    }
    setSubmitting(true);
    setIsError(false);
    setStatus(mode === "signin" ? "Signing in…" : "Creating account…");

    const result = mode === "signin" ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      setStatus(result.error);
      setIsError(true);
      return;
    }
    if (mode === "signup" && "needsConfirmation" in result && result.needsConfirmation) {
      // Supabase deliberately returns this same shape both for a genuine
      // new signup pending confirmation AND for a signup attempt on an
      // email that already has an account (anti-enumeration) - the two
      // are indistinguishable here, so the copy has to cover both.
      setStatus("If you're new, check your email to confirm your account. Already have an account? Just sign in instead.");
      setIsError(false);
      return;
    }
    setStatus("");
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.panel}>
          <View style={styles.brand}>
            <Logo size={36} />
            <Text style={styles.brandName}>
              Frame<Text style={{ color: colors.orange }}>work</Text>
            </Text>
          </View>

          <Text style={styles.heading}>{mode === "signin" ? "Sign in" : "Create an account"}</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.gray}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.gray}
            secureTextEntry
          />

          <View style={styles.actions}>
            <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")} disabled={submitting}>
              <Text style={styles.toggleLink}>
                {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </Text>
            </Pressable>

            {!!status && <Text style={[styles.status, isError && styles.statusError]}>{status}</Text>}

            <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>{mode === "signin" ? "Sign in" : "Sign up"}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  panel: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 28,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginBottom: 24,
  },
  brandName: {
    fontFamily: fontSerif,
    fontSize: 19,
    color: colors.black,
  },
  heading: {
    fontFamily: fontSerif,
    fontSize: 22,
    color: colors.black,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.black,
    backgroundColor: colors.white,
  },
  actions: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 12,
  },
  toggleLink: {
    color: colors.orangeDark,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  status: {
    fontSize: 12.5,
    color: colors.gray,
  },
  statusError: {
    color: colors.danger,
  },
  submitBtn: {
    backgroundColor: colors.black,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
});
