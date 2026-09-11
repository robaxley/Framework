import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { listProjects, type Project } from "@/lib/api";
import { clearPendingImport } from "@/lib/pendingImport";
import { CATEGORIES, categoryDotColor, colors, DIFFICULTY_COLORS, fontSerif, radius } from "@/theme";

export default function LibraryScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState(false);

  const load = useCallback(async (q: string, cat: string) => {
    setLoading(true);
    setError(false);
    try {
      const data = await listProjects({ q: q || undefined, category: cat || undefined });
      setProjects(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(search, category);
    }, [search, category])
  );

  function onSearchChange(text: string) {
    setSearch(text);
  }

  function onCategoryPress(cat: string) {
    setCategory(cat === category ? "" : cat);
  }

  function goImport() {
    clearPendingImport();
    router.replace("/import");
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search your projects…"
        placeholderTextColor={colors.gray}
        value={search}
        onChangeText={onSearchChange}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipRowContent}>
        {["", ...CATEGORIES].map((cat) => (
          <Pressable
            key={cat || "all"}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => onCategoryPress(cat)}
          >
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat || "All"}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={styles.loading} color={colors.orange} />
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Couldn't load your projects. Check your connection and try again.</Text>
          <Pressable style={styles.emptyBtn} onPress={() => load(search, category)}>
            <Text style={styles.emptyBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : projects.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No projects yet.</Text>
          <Pressable style={styles.emptyBtn} onPress={goImport}>
            <Text style={styles.emptyBtnText}>+ Import your first project</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ProjectCard project={item} onPress={() => router.push(`/project/${item.id}`)} />}
        />
      )}
    </View>
  );
}

function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const done = project.steps.filter((s) => s.done).length;
  const total = project.steps.length;
  const metaParts = [project.estTime, project.estCost].filter(Boolean);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={styles.badgeRow}>
          <View style={[styles.dot, { backgroundColor: categoryDotColor(project.category) }]} />
          <Text style={styles.badgeText}>{project.category.toUpperCase()}</Text>
        </View>
        <Text style={[styles.difficulty, { color: DIFFICULTY_COLORS[project.difficulty] ?? colors.gray }]}>
          {project.difficulty}
        </Text>
      </View>

      <Text style={styles.cardTitle}>{project.title}</Text>

      {metaParts.length > 0 && (
        <Text style={styles.cardMeta}>{metaParts.join("  ·  ")}</Text>
      )}

      {total > 0 && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round((done / total) * 100)}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {done}/{total}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream, padding: 16 },
  search: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    backgroundColor: colors.white,
    color: colors.black,
  },
  chipRow: { marginTop: 10, flexGrow: 0 },
  chipRowContent: { gap: 8, paddingVertical: 10 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.black, borderColor: colors.black },
  chipText: { fontSize: 12, color: colors.gray, fontWeight: "600" },
  chipTextActive: { color: colors.cream },
  loading: { marginTop: 40 },
  empty: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 60,
    alignItems: "center",
    gap: 16,
  },
  emptyText: { color: colors.gray, fontSize: 14 },
  emptyBtn: { backgroundColor: colors.black, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  emptyBtnText: { color: colors.white, fontSize: 13, fontWeight: "600" },
  list: { gap: 1, paddingTop: 4 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: -1,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10.5, fontWeight: "600", color: colors.gray, letterSpacing: 0.5 },
  difficulty: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  cardTitle: { fontFamily: fontSerif, fontSize: 17, color: colors.black, marginBottom: 6 },
  cardMeta: { fontSize: 12.5, color: colors.gray, marginBottom: 10 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: { flex: 1, height: 3, backgroundColor: colors.cream2, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.orange },
  progressLabel: { fontSize: 11, color: colors.gray },
});
