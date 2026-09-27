import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRootNavigationState, useRouter, usePathname } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";

import { useAuth } from "@/context/AuthContext";
import { setPendingShare } from "@/lib/pendingImport";
import { colors, fontSerif } from "@/theme";
import { Logo } from "@/components/Logo";

export default function AppLayout() {
  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <AppHeader />
      <ShareIntentListener />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="import" />
        <Stack.Screen name="project/[id]" />
      </Stack>
    </SafeAreaView>
  );
}

function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Logo size={30} />
        <Text style={styles.brandName}>
          Frame<Text style={{ color: colors.orange }}>work</Text>
        </Text>
      </View>

      <View style={styles.nav}>
        <Pressable onPress={() => router.replace("/")}>
          <Text style={[styles.navBtn, pathname === "/" && styles.navBtnActive]}>Library</Text>
        </Pressable>
        <Pressable onPress={() => router.replace("/import")}>
          <Text style={[styles.navBtn, pathname === "/import" && styles.navBtnActive]}>Import</Text>
        </Pressable>
        <Pressable onPress={signOut}>
          <Text style={styles.navBtn}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Watches for an incoming OS share (Instagram/TikTok/YouTube -> "Save to
// Framework") and routes to Import with the shared content queued up.
function ShareIntentListener() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const router = useRouter();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!navState?.key || !hasShareIntent) return;

    // Instagram (and others) can share a URL AND caption text together in one
    // payload - keep both, don't let a present webUrl blank out real text.
    setPendingShare(shareIntent.webUrl ?? null, shareIntent.text ?? null);
    resetShareIntent();
    router.push("/import");
  }, [hasShareIntent, navState?.key]);

  return null;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandName: {
    fontFamily: fontSerif,
    fontSize: 17,
    color: colors.black,
  },
  nav: {
    flexDirection: "row",
    gap: 18,
  },
  navBtn: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray,
    paddingVertical: 4,
  },
  navBtnActive: {
    color: colors.black,
    borderBottomWidth: 2,
    borderBottomColor: colors.orange,
  },
});
