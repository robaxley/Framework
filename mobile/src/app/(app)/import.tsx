import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { ApiError, createProject, extractProject, fetchOEmbed, updateProject, type Material } from "@/lib/api";
import { consumePendingImport } from "@/lib/pendingImport";
import { CATEGORIES, colors, DIFFICULTIES, fontSerif, radius } from "@/theme";

type Phase = "form" | "draft";

export default function ImportScreen() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("form");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [status, setStatus] = useState("");
  const [statusError, setStatusError] = useState(false);

  const [draftTitle, setDraftTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [difficulty, setDifficulty] = useState<string>(DIFFICULTIES[0]);
  const [estTime, setEstTime] = useState("");
  const [estCost, setEstCost] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const pending = consumePendingImport();
    if (pending.editingProject) {
      const p = pending.editingProject;
      setEditingProjectId(p.id);
      setDraftTitle(p.title);
      setCategory(p.category);
      setDifficulty(p.difficulty);
      setEstTime(p.estTime);
      setEstCost(p.estCost);
      setTools(p.tools);
      setMaterials(p.materials.map((m) => ({ ...m })));
      setSteps(p.steps.map((s) => s.text));
      setTags(p.tags);
      setSourceUrl(p.sourceUrl || "");
      setPhase("draft");
    } else if (pending.sharedUrl || pending.sharedText) {
      setSourceUrl(pending.sharedUrl || "");
      setRawText(pending.sharedText || "");
      if (pending.sharedUrl) prefillFromUrl(pending.sharedUrl);
    }
  }, []);

  async function prefillFromUrl(url: string) {
    try {
      const meta = await fetchOEmbed(url);
      if (meta.title) setTitle((t) => t || meta.title!);
      if (meta.description) setRawText((t) => t || meta.description!);
    } catch {
      // best-effort only
    }
  }

  function onUrlBlur() {
    if (sourceUrl && !title) prefillFromUrl(sourceUrl);
  }

  async function handleExtract() {
    if (!rawText.trim()) {
      setStatus("Paste some caption or transcript text first.");
      setStatusError(true);
      return;
    }
    setExtracting(true);
    setStatus("Extracting…");
    setStatusError(false);
    try {
      const { draft } = await extractProject({ sourceUrl, title, rawText });
      setEditingProjectId(null);
      setDraftTitle(draft.title);
      setCategory(draft.category);
      setDifficulty(draft.difficulty);
      setEstTime(draft.estTime);
      setEstCost(draft.estCost);
      setTools(draft.tools);
      setMaterials(draft.materials.map((m) => ({ ...m, owned: false })));
      setSteps(draft.steps);
      setTags(draft.tags);
      setStatus("");
      setPhase("draft");
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Extraction failed.");
      setStatusError(true);
    } finally {
      setExtracting(false);
    }
  }

  function resetForm() {
    setPhase("form");
    setEditingProjectId(null);
    setSourceUrl("");
    setTitle("");
    setRawText("");
    setStatus("");
    setStatusError(false);
    setDraftTitle("");
    setCategory(CATEGORIES[0]);
    setDifficulty(DIFFICULTIES[0]);
    setEstTime("");
    setEstCost("");
    setTools([]);
    setMaterials([]);
    setSteps([]);
    setTags([]);
    setTagInput("");
  }

  function handleDiscard() {
    if (editingProjectId) {
      router.replace(`/project/${editingProjectId}`);
    } else {
      resetForm();
    }
  }

  async function handleSave() {
    const payload = {
      title: draftTitle.trim() || "Untitled Project",
      category,
      difficulty,
      estTime: estTime.trim(),
      estCost: estCost.trim(),
      tools: tools.map((t) => t.trim()).filter(Boolean),
      materials: materials.map((m) => ({ ...m, name: m.name.trim() })).filter((m) => m.name),
      steps: steps.map((s) => s.trim()).filter(Boolean),
      tags: tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
      sourceUrl: sourceUrl || null,
    };

    setSaving(true);
    try {
      const project = editingProjectId ? await updateProject(editingProjectId, payload) : await createProject(payload);
      resetForm();
      router.replace(`/project/${project.id}`);
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Could not save project.");
      setStatusError(true);
    } finally {
      setSaving(false);
    }
  }

  function addTag() {
    const value = tagInput.trim().toLowerCase();
    if (value) setTags((t) => [...t, value]);
    setTagInput("");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {phase === "form" ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Import a project</Text>

          <Field label="Source URL (optional)">
            <TextInput
              style={styles.input}
              value={sourceUrl}
              onChangeText={setSourceUrl}
              onBlur={onUrlBlur}
              placeholder="https://www.tiktok.com/…"
              placeholderTextColor={colors.gray}
              autoCapitalize="none"
              keyboardType="url"
            />
          </Field>

          <Field label="Title">
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Auto-filled from URL, or type your own"
              placeholderTextColor={colors.gray}
            />
          </Field>

          <Field label="Caption / description / transcript">
            <TextInput
              style={[styles.input, styles.textArea]}
              value={rawText}
              onChangeText={setRawText}
              placeholder="Paste the caption, description, or transcript you copied from the video…"
              placeholderTextColor={colors.gray}
              multiline
              numberOfLines={8}
            />
            {/* TikTok blocks server-side fetches (confirmed: hits their CAPTCHA
                wall), unlike YouTube/Instagram - the only caption source here
                is what the user pastes themselves, so say so plainly. */}
            {sourceUrl.includes("tiktok.com") && !rawText && (
              <Text style={styles.hint}>TikTok captions can't be auto-read — paste yours above for the best results.</Text>
            )}
          </Field>

          <View style={styles.actionsRow}>
            {!!status && <Text style={[styles.status, statusError && styles.statusError]}>{status}</Text>}
            <Pressable style={styles.primaryBtn} onPress={handleExtract} disabled={extracting}>
              {extracting ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.primaryBtnText}>Extract project</Text>}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{editingProjectId ? "Edit project" : "Review & edit"}</Text>

          <Field label="Title">
            <TextInput style={styles.input} value={draftTitle} onChangeText={setDraftTitle} />
          </Field>

          <Field label="Category">
            <ChipPicker options={CATEGORIES} value={category} onChange={setCategory} />
          </Field>

          <Field label="Difficulty">
            <ChipPicker options={[...DIFFICULTIES]} value={difficulty} onChange={setDifficulty} />
          </Field>

          <View style={styles.row2}>
            <View style={styles.flex1}>
              <Field label="Est. time">
                <TextInput style={styles.input} value={estTime} onChangeText={setEstTime} placeholder="2-3 hours" placeholderTextColor={colors.gray} />
              </Field>
            </View>
            <View style={styles.flex1}>
              <Field label="Est. cost">
                <TextInput style={styles.input} value={estCost} onChangeText={setEstCost} placeholder="$40-60" placeholderTextColor={colors.gray} />
              </Field>
            </View>
          </View>

          <ListEditor
            label="Tools"
            items={tools}
            renderItem={(value, onChange) => (
              <TextInput style={[styles.input, styles.flex1]} value={value} onChangeText={onChange} placeholder="drill" placeholderTextColor={colors.gray} />
            )}
            onAdd={() => setTools((t) => [...t, ""])}
            onChangeItem={(i, v) => setTools((t) => t.map((x, idx) => (idx === i ? v : x)))}
            onRemove={(i) => setTools((t) => t.filter((_, idx) => idx !== i))}
          />

          <View style={styles.listBlock}>
            <View style={styles.listHeader}>
              <Text style={styles.fieldLabel}>Materials</Text>
              <Pressable onPress={() => setMaterials((m) => [...m, { name: "", qty: "", cost: "", owned: false }])}>
                <Text style={styles.addLink}>+ Add</Text>
              </Pressable>
            </View>
            {materials.map((m, i) => (
              <View key={i} style={styles.listRow}>
                <TextInput
                  style={[styles.input, styles.flex2]}
                  value={m.name}
                  onChangeText={(v) => setMaterials((arr) => arr.map((x, idx) => (idx === i ? { ...x, name: v } : x)))}
                  placeholder="Name"
                  placeholderTextColor={colors.gray}
                />
                <TextInput
                  style={[styles.input, styles.qtyInput]}
                  value={m.qty}
                  onChangeText={(v) => setMaterials((arr) => arr.map((x, idx) => (idx === i ? { ...x, qty: v } : x)))}
                  placeholder="Qty"
                  placeholderTextColor={colors.gray}
                />
                <TextInput
                  style={[styles.input, styles.costInput]}
                  value={m.cost}
                  onChangeText={(v) => setMaterials((arr) => arr.map((x, idx) => (idx === i ? { ...x, cost: v } : x)))}
                  placeholder="Cost"
                  placeholderTextColor={colors.gray}
                />
                <Pressable onPress={() => setMaterials((arr) => arr.filter((_, idx) => idx !== i))}>
                  <Text style={styles.removeBtn}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <View style={styles.listBlock}>
            <View style={styles.listHeader}>
              <Text style={styles.fieldLabel}>Steps</Text>
              <Pressable onPress={() => setSteps((s) => [...s, ""])}>
                <Text style={styles.addLink}>+ Add</Text>
              </Pressable>
            </View>
            {steps.map((s, i) => (
              <View key={i} style={styles.listRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.flex1]}
                  value={s}
                  onChangeText={(v) => setSteps((arr) => arr.map((x, idx) => (idx === i ? v : x)))}
                  placeholder="Sand all edges with 120-grit sandpaper"
                  placeholderTextColor={colors.gray}
                />
                <Pressable onPress={() => setSteps((arr) => arr.filter((_, idx) => idx !== i))}>
                  <Text style={styles.removeBtn}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <Field label="Tags">
            <View style={styles.tagRow}>
              {tags.map((tag, i) => (
                <View key={i} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                  <Pressable onPress={() => setTags((t) => t.filter((_, idx) => idx !== i))}>
                    <Text style={styles.tagChipRemove}>×</Text>
                  </Pressable>
                </View>
              ))}
              <TextInput
                style={styles.tagInput}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
                onBlur={addTag}
                placeholder="+ tag"
                placeholderTextColor={colors.gray}
              />
            </View>
          </Field>

          <View style={styles.actionsRow}>
            {!!status && <Text style={[styles.status, statusError && styles.statusError]}>{status}</Text>}
            <Pressable style={styles.secondaryBtn} onPress={handleDiscard} disabled={saving}>
              <Text style={styles.secondaryBtnText}>Discard</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.primaryBtnText}>Save to library</Text>}
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ChipPicker({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.pickerRow}>
        {options.map((opt) => (
          <Pressable key={opt} style={[styles.pickerChip, value === opt && styles.pickerChipActive]} onPress={() => onChange(opt)}>
            <Text style={[styles.pickerChipText, value === opt && styles.pickerChipTextActive]}>{opt}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function ListEditor({
  label,
  items,
  renderItem,
  onAdd,
  onChangeItem,
  onRemove,
}: {
  label: string;
  items: string[];
  renderItem: (value: string, onChange: (v: string) => void) => React.ReactNode;
  onAdd: () => void;
  onChangeItem: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <View style={styles.listBlock}>
      <View style={styles.listHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Pressable onPress={onAdd}>
          <Text style={styles.addLink}>+ Add</Text>
        </Pressable>
      </View>
      {items.map((item, i) => (
        <View key={i} style={styles.listRow}>
          {renderItem(item, (v) => onChangeItem(i, v))}
          <Pressable onPress={() => onRemove(i)}>
            <Text style={styles.removeBtn}>×</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 16, paddingBottom: 48 },
  panel: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 20 },
  sectionTitle: { fontFamily: fontSerif, fontSize: 20, color: colors.black, marginBottom: 16 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: colors.gray, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 },
  hint: { fontSize: 12.5, color: colors.gray, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 13.5,
    color: colors.black,
    backgroundColor: colors.white,
  },
  textArea: { minHeight: 120, textAlignVertical: "top" },
  row2: { flexDirection: "row", gap: 12 },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
  status: { flex: 1, fontSize: 12.5, color: colors.gray },
  statusError: { color: colors.danger },
  primaryBtn: { backgroundColor: colors.black, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 18, alignItems: "center" },
  primaryBtnText: { color: colors.white, fontSize: 13, fontWeight: "600" },
  secondaryBtn: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 18 },
  secondaryBtnText: { color: colors.black, fontSize: 13, fontWeight: "600" },
  listBlock: { marginBottom: 16 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  addLink: { color: colors.orangeDark, fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  listRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  qtyInput: { width: 56 },
  costInput: { width: 72 },
  removeBtn: { color: colors.gray, fontSize: 18, paddingHorizontal: 6 },
  stepNumber: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.cream2, alignItems: "center", justifyContent: "center" },
  stepNumberText: { fontSize: 11, fontWeight: "700", color: colors.black },
  pickerRow: { flexDirection: "row", gap: 8 },
  pickerChip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.white },
  pickerChipActive: { backgroundColor: colors.black, borderColor: colors.black },
  pickerChipText: { fontSize: 12, color: colors.gray, fontWeight: "600" },
  pickerChipTextActive: { color: colors.cream },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  tagChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.cream2, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  tagChipText: { fontSize: 12, color: colors.black },
  tagChipRemove: { fontSize: 13, color: colors.gray },
  tagInput: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, minWidth: 80, color: colors.black },
});
