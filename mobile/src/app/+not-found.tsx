import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";

import { useAuth } from "@/context/AuthContext";
import { setPendingShare } from "@/lib/pendingImport";
import { colors, fontSerif } from "@/theme";

// expo-share-intent's iOS extension hands off to the app via a bare
// framework://dataUrl=...#type link (not a real route), and on a cold
// start - the app wasn't already running - that's the FIRST url Expo
// Router sees, so it 404s here before (app)/_layout's own share listener
// ever gets a chance to mount. This screen is Expo Router's documented
// override point for exactly that case: catch it, hand off to Import
// (or, if the user isn't signed in yet, leave the intent live so
// (app)/_layout's listener picks it up right after they sign in), and
// only fall through to a plain "page not found" UI for a genuine bad link.
export default function NotFoundScreen() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!hasShareIntent) return;

    if (session) {
      // Instagram (and others) can share a URL AND caption text together in one
      // payload - keep both, don't let a present webUrl blank out real text.
      setPendingShare(shareIntent.webUrl ?? null, shareIntent.text ?? null);
      resetShareIntent();
      router.replace("/import");
    } else {
      router.replace("/");
    }
  }, [hasShareIntent, session]);

  if (hasShareIntent) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page not found</Text>
      <Text style={styles.body}>That link doesn't go anywhere in Framework.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream, padding: 24, gap: 8 },
  title: { fontFamily: fontSerif, fontSize: 20, color: colors.black },
  body: { fontSize: 14, color: colors.gray, textAlign: "center" },
});
