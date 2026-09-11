import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { deleteProject, getProject, toggleMaterial, toggleStep, type Project } from "@/lib/api";
import { setPendingEdit } from "@/lib/pendingImport";
import { categoryDotColor, colors, DIFFICULTY_COLORS, fontSerif, radius } from "@/theme";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const p = await getProject(id);
      setProject(p);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleToggleStep(index: number) {
    if (!project) return;
    try {
      const updated = await toggleStep(project.id, index);
      setProject(updated);
    } catch {
      Alert.alert("Couldn't save that change", "Check your connection and try again.");
    }
  }

  async function handleToggleMaterial(index: number) {
    if (!project) return;
    try {
      const updated = await toggleMaterial(project.id, index);
      setProject(updated);
    } catch {
      Alert.alert("Couldn't save that change", "Check your connection and try again.");
    }
  }

  function handleEdit() {
    if (!project) return;
    setPendingEdit(project);
    router.push("/import");
  }

  function handleDelete() {
    if (!project) return;
    Alert.alert("Delete project?", `"${project.title}" will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProject(project.id);
            router.replace("/");
          } catch {
            Alert.alert("Couldn't delete", "Check your connection and try again.");
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  if (error || !project) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Couldn't load this project.</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const metaParts = [project.difficulty, project.estTime, project.estCost].filter(Boolean);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.backLink}>← Back to library</Text>
      </Pressable>

      <View style={styles.panel}>
        <View style={styles.headerRow}>
          <View style={styles.flex1}>
            <View style={styles.badgeRow}>
              <View style={[styles.dot, { backgroundColor: categoryDotColor(project.category) }]} />
              <Text style={styles.badgeText}>{project.category.toUpperCase()}</Text>
            </View>
            <Text style={styles.title}>{project.title}</Text>
            {!!project.sourceUrl && (
              <Pressable onPress={() => Linking.openURL(project.sourceUrl!)}>
                <Text style={styles.sourceLink}>View original source →</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.secondaryBtn} onPress={handleEdit}>
              <Text style={styles.secondaryBtnText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.dangerBtn} onPress={handleDelete}>
              <Text style={styles.dangerBtnText}>Delete</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.metaRow}>
          {metaParts.map((part, i) => (
            <View key={i} style={styles.metaItemRow}>
              {i > 0 && <Text style={styles.metaSep}>·</Text>}
              <Text
                style={[
                  styles.metaText,
                  i === 0 && { color: DIFFICULTY_COLORS[project.difficulty] ?? colors.gray, textTransform: "capitalize" },
                ]}
              >
                {part}
              </Text>
            </View>
          ))}
        </View>

        {project.tools.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Tools</Text>
            {project.tools.map((tool, i) => (
              <Text key={i} style={styles.plainItem}>
                {tool}
              </Text>
            ))}
          </View>
        )}

        {project.materials.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Materials</Text>
            {project.materials.map((m, i) => {
              const meta = [m.qty, m.cost].filter(Boolean).join(", ");
              return (
                <Pressable key={i} style={styles.checkRow} onPress={() => handleToggleMaterial(i)}>
                  <View style={[styles.checkbox, m.owned && styles.checkboxChecked]}>
                    {m.owned && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.checkText, m.owned && styles.checkTextDone]}>
                    {m.name}
                    {meta ? <Text style={styles.checkMeta}> ({meta})</Text> : null}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {project.steps.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Steps</Text>
            {project.steps.map((s, i) => (
              <Pressable key={i} style={styles.checkRow} onPress={() => handleToggleStep(i)}>
                <View style={[styles.checkbox, s.done && styles.checkboxChecked]}>
                  {s.done && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkText, s.done && styles.checkTextDone]}>{s.text}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {project.tags.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Tags</Text>
            <View style={styles.tagRow}>
              {project.tags.map((tag, i) => (
                <View key={i} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 16, paddingBottom: 48 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream, gap: 16 },
  errorText: { color: colors.gray, fontSize: 14 },
  retryBtn: { backgroundColor: colors.black, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  retryBtnText: { color: colors.white, fontSize: 13, fontWeight: "600" },
  backLink: { color: colors.gray, fontSize: 13, marginBottom: 14 },
  panel: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  flex1: { flex: 1 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10.5, fontWeight: "600", color: colors.gray, letterSpacing: 0.5 },
  title: { fontFamily: fontSerif, fontSize: 24, color: colors.black, marginBottom: 6 },
  sourceLink: { fontSize: 12.5, color: colors.orangeDark },
  headerActions: { flexDirection: "row", gap: 8 },
  secondaryBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  secondaryBtnText: { fontSize: 12.5, fontWeight: "600", color: colors.black },
  dangerBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  dangerBtnText: { fontSize: 12.5, fontWeight: "600", color: colors.danger },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingBottom: 18, marginBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  metaItemRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaSep: { color: colors.line },
  metaText: { fontSize: 13, color: colors.gray },
  block: { marginBottom: 22 },
  blockTitle: { fontSize: 11, fontWeight: "700", color: colors.gray, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  plainItem: { fontSize: 13.5, color: colors.black, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.cream2 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.cream2 },
  checkbox: { width: 18, height: 18, borderRadius: 3, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: colors.orange, borderColor: colors.orange },
  checkmark: { color: colors.white, fontSize: 11, fontWeight: "700" },
  checkText: { fontSize: 13.5, color: colors.black, flex: 1 },
  checkTextDone: { color: colors.gray, textDecorationLine: "line-through" },
  checkMeta: { color: colors.gray, fontSize: 12.5 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tagChip: { backgroundColor: colors.cream2, borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 4 },
  tagChipText: { fontSize: 12, color: colors.black },
});
