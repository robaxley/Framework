import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { ShareIntentProvider } from "expo-share-intent";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { colors } from "@/theme";

export default function RootLayout() {
  return (
    <ShareIntentProvider>
      <AuthProvider>
        <RootNavigation />
      </AuthProvider>
    </ShareIntentProvider>
  );
}

// Stack.Protected excludes its screens from the navigator entirely when its
// guard is false, so a signed-out user's client never mounts (app) - and
// its data-fetching effects - in the first place. An imperative redirect
// (check session in an effect, router.replace elsewhere) mounts the wrong
// screen first and only corrects course a tick later, which is exactly the
// race that let an unauthenticated request reach the API during testing.
function RootNavigation() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  return (
    <Stack key={session ? "app" : "auth"} screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream,
  },
});
