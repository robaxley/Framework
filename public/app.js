const CATEGORIES = [
  "Woodworking",
  "Electrical",
  "Plumbing",
  "Painting & Finishing",
  "Furniture",
  "Outdoor & Garden",
  "Wall & Flooring",
  "Storage & Organization",
  "Repair",
  "Other",
];

const state = {
  view: "library",
  draft: null,
  draftSourceUrl: null,
  editingProjectId: null,
  projects: [],
  currentProject: null,
  filters: { q: "", category: "", tag: "" },
};

function $(id) {
  return document.getElementById(id);
}

// ---------- Auth ----------

let supabaseClient = null;
let authMode = "signin";

async function authedFetch(url, options = {}) {
  const { data } = await supabaseClient.auth.getSession();
  const token = data.session?.access_token;
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

function setAuthStatus(message, isError) {
  const el = $("auth-status");
  el.textContent = message;
  el.classList.toggle("error", Boolean(isError));
}

function showAuthScreen() {
  $("auth-screen").classList.remove("hidden");
  $("app-shell").classList.add("hidden");
}

function showAppShell() {
  $("auth-screen").classList.add("hidden");
  $("app-shell").classList.remove("hidden");
}

function handleAuthToggleMode() {
  authMode = authMode === "signin" ? "signup" : "signin";
  $("auth-heading").textContent = authMode === "signin" ? "Sign in" : "Create an account";
  $("btn-auth-submit").textContent = authMode === "signin" ? "Sign in" : "Sign up";
  $("btn-auth-toggle-mode").textContent =
    authMode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in";
  setAuthStatus("", false);
}

async function handleAuthSubmit() {
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;
  if (!email || !password) {
    setAuthStatus("Enter an email and password.", true);
    return;
  }

  const btn = $("btn-auth-submit");
  btn.disabled = true;
  setAuthStatus(authMode === "signin" ? "Signing in…" : "Creating account…", false);

  const { error } =
    authMode === "signin"
      ? await supabaseClient.auth.signInWithPassword({ email, password })
      : await supabaseClient.auth.signUp({ email, password });

  btn.disabled = false;
  if (error) {
    setAuthStatus(error.message, true);
    return;
  }

  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    initApp();
    showAppShell();
  } else {
    setAuthStatus("Check your email to confirm your account, then sign in.", false);
  }
}

async function handleSignOut() {
  await supabaseClient.auth.signOut();
  showAuthScreen();
}

async function bootstrap() {
  const configRes = await fetch("/api/config");
  const { supabaseUrl, supabasePublishableKey } = await configRes.json();
  supabaseClient = supabase.createClient(supabaseUrl, supabasePublishableKey);

  $("btn-auth-toggle-mode").addEventListener("click", handleAuthToggleMode);
  $("btn-auth-submit").addEventListener("click", handleAuthSubmit);
  $("auth-password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleAuthSubmit();
  });

  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    initApp();
    showAppShell();
  } else {
    showAuthScreen();
  }
}

function categorySlug(category) {
  return category.toLowerCase().split(" ")[0];
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function metaRowHtml(parts) {
  return parts
    .filter(Boolean)
    .map((p) => `<span>${p}</span>`)
    .join('<span class="meta-sep">·</span>');
}

function showView(name) {
  state.view = name;
  document.querySelectorAll(".view").forEach((el) => el.classList.remove("active"));
  $(`view-${name}`).classList.add("active");
  $("nav-library").classList.toggle("active", name === "library");
  $("nav-import").classList.toggle("active", name === "import");
}

// ---------- Import / Extraction ----------

async function fetchOEmbedPrefill() {
  const url = $("import-url").value.trim();
  const titleField = $("import-title");
  if (!url || titleField.value.trim()) return;
  try {
    const res = await authedFetch(`/api/oembed?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (data.title) titleField.value = data.title;
  } catch {
    // best-effort only
  }
}

function setExtractStatus(message, isError) {
  const el = $("extract-status");
  el.textContent = message;
  el.classList.toggle("error", Boolean(isError));
}

async function handleExtractClick() {
  const sourceUrl = $("import-url").value.trim();
  const title = $("import-title").value.trim();
  const rawText = $("import-text").value.trim();

  const btn = $("btn-extract");
  btn.disabled = true;
  setExtractStatus("Extracting…", false);

  try {
    const res = await authedFetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUrl, title, rawText }),
    });
    const data = await res.json();
    if (!res.ok) {
      setExtractStatus(data.message || "Extraction failed.", true);
      return;
    }
    state.editingProjectId = null;
    state.draftSourceUrl = sourceUrl || null;
    state.draft = data.draft;
    setExtractStatus("", false);
    $("draft-heading").textContent = "Review & edit";
    renderDraftEditor();
    $("import-form").classList.add("hidden");
    $("import-draft").classList.remove("hidden");
  } catch (err) {
    setExtractStatus("Network error - is the server running?", true);
  } finally {
    btn.disabled = false;
  }
}

function createRemovableRow(innerEls) {
  const row = document.createElement("div");
  row.className = "draft-list-item";
  innerEls.forEach((el) => row.appendChild(el));
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn-remove-row";
  removeBtn.setAttribute("aria-label", "Remove");
  removeBtn.textContent = "×";
  removeBtn.addEventListener("click", () => {
    row.remove();
    if (row.parentElement === $("draft-steps-list")) renumberStepRows();
  });
  row.appendChild(removeBtn);
  return row;
}

function addToolRow(value = "") {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "text-input";
  input.placeholder = "drill";
  input.value = value;
  $("draft-tools-list").appendChild(createRemovableRow([input]));
}

function addMaterialRow(material = { name: "", qty: "", cost: "" }) {
  const name = document.createElement("input");
  name.type = "text";
  name.className = "text-input";
  name.placeholder = "Name";
  name.value = material.name || "";

  const qty = document.createElement("input");
  qty.type = "text";
  qty.className = "text-input qty-input";
  qty.placeholder = "Qty";
  qty.value = material.qty || "";

  const cost = document.createElement("input");
  cost.type = "text";
  cost.className = "text-input cost-input";
  cost.placeholder = "Cost";
  cost.value = material.cost || "";

  const row = createRemovableRow([name, qty, cost]);
  row.classList.add("draft-material-row");
  $("draft-materials-list").appendChild(row);
}

function renumberStepRows() {
  $("draft-steps-list")
    .querySelectorAll(".step-number")
    .forEach((el, i) => (el.textContent = String(i + 1)));
}

function addStepRow(text = "") {
  const number = document.createElement("span");
  number.className = "step-number";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "text-input";
  input.placeholder = "Sand all edges with 120-grit sandpaper";
  input.value = text;

  const row = createRemovableRow([number, input]);
  $("draft-steps-list").appendChild(row);
  renumberStepRows();
}

function addTagChip(text) {
  const chip = document.createElement("span");
  chip.className = "tag-chip";
  const label = document.createElement("span");
  label.textContent = text;
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.setAttribute("aria-label", "Remove tag");
  removeBtn.textContent = "×";
  removeBtn.addEventListener("click", () => chip.remove());
  chip.append(label, removeBtn);
  $("draft-tags-row").insertBefore(chip, $("draft-tag-input"));
}

function handleTagInputKeydown(evt) {
  if (evt.key !== "Enter" && evt.key !== ",") return;
  evt.preventDefault();
  const input = evt.target;
  const value = input.value.trim().toLowerCase();
  if (value) addTagChip(value);
  input.value = "";
}

function populateCategorySelect(selectEl, selected) {
  selectEl.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    if (cat === selected) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function renderDraftEditor() {
  const d = state.draft;
  $("draft-title").value = d.title || "";
  populateCategorySelect($("draft-category"), d.category);
  $("draft-difficulty").value = d.difficulty || "beginner";
  $("draft-time").value = d.estTime || "";
  $("draft-cost").value = d.estCost || "";

  $("draft-tools-list").innerHTML = "";
  (d.tools || []).forEach((t) => addToolRow(t));

  $("draft-materials-list").innerHTML = "";
  (d.materials || []).forEach((m) => addMaterialRow(m));

  $("draft-steps-list").innerHTML = "";
  (d.steps || []).forEach((s) => addStepRow(typeof s === "string" ? s : s.text));

  $("draft-tags-row").querySelectorAll(".tag-chip").forEach((chip) => chip.remove());
  (d.tags || []).forEach((t) => addTagChip(t));
  $("draft-tag-input").value = "";

  $("import-draft").classList.remove("hidden");
}

function collectDraftFromForm() {
  const tools = Array.from($("draft-tools-list").querySelectorAll("input"))
    .map((i) => i.value.trim())
    .filter(Boolean);

  const materials = Array.from($("draft-materials-list").querySelectorAll(".draft-list-item"))
    .map((row) => {
      const [nameEl, qtyEl, costEl] = row.querySelectorAll("input");
      return { name: nameEl.value.trim(), qty: qtyEl.value.trim(), cost: costEl.value.trim() };
    })
    .filter((m) => m.name);

  const steps = Array.from($("draft-steps-list").querySelectorAll("input"))
    .map((i) => i.value.trim())
    .filter(Boolean);

  const tags = Array.from($("draft-tags-row").querySelectorAll(".tag-chip"))
    .map((chip) => chip.firstChild.textContent.trim())
    .filter(Boolean);

  return {
    title: $("draft-title").value.trim() || "Untitled Project",
    category: $("draft-category").value,
    difficulty: $("draft-difficulty").value,
    estTime: $("draft-time").value.trim(),
    estCost: $("draft-cost").value.trim(),
    tools,
    materials,
    steps,
    tags,
    sourceUrl: state.draftSourceUrl,
  };
}

function resetImportForm() {
  $("import-url").value = "";
  $("import-title").value = "";
  $("import-text").value = "";
  $("import-form").classList.remove("hidden");
  $("import-draft").classList.add("hidden");
  $("draft-tools-list").innerHTML = "";
  $("draft-materials-list").innerHTML = "";
  $("draft-steps-list").innerHTML = "";
  $("draft-tags-row").querySelectorAll(".tag-chip").forEach((chip) => chip.remove());
  state.draft = null;
  state.draftSourceUrl = null;
  state.editingProjectId = null;
  setExtractStatus("", false);
}

async function handleSaveDraftClick() {
  const payload = collectDraftFromForm();
  const btn = $("btn-save");
  btn.disabled = true;
  try {
    const isEdit = Boolean(state.editingProjectId);
    const res = await authedFetch(isEdit ? `/api/projects/${state.editingProjectId}` : "/api/projects", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const project = await res.json();
    if (!res.ok) {
      setExtractStatus(project.message || "Could not save project.", true);
      return;
    }
    resetImportForm();
    state.currentProject = project;
    renderProjectDetail();
    showView("detail");
  } finally {
    btn.disabled = false;
  }
}

function handleDiscardDraft() {
  if (state.editingProjectId) {
    resetImportForm();
    renderProjectDetail();
    showView("detail");
  } else {
    resetImportForm();
  }
}

// ---------- Library ----------

async function loadLibrary() {
  const params = new URLSearchParams();
  if (state.filters.q) params.set("q", state.filters.q);
  if (state.filters.category) params.set("category", state.filters.category);
  if (state.filters.tag) params.set("tag", state.filters.tag);

  const res = await authedFetch(`/api/projects?${params.toString()}`);
  state.projects = await res.json();
  renderLibraryGrid();
}

function stepsProgress(project) {
  const total = project.steps.length;
  const done = project.steps.filter((s) => s.done).length;
  return { done, total };
}

function renderLibraryGrid() {
  const grid = $("library-grid");
  grid.innerHTML = "";

  $("library-empty").classList.toggle("hidden", state.projects.length !== 0);

  state.projects.forEach((project) => {
    const card = document.createElement("article");
    card.className = "project-card";

    const top = document.createElement("div");
    top.className = "card-top";

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.dataset.cat = categorySlug(project.category);
    badge.textContent = project.category;

    const difficulty = document.createElement("span");
    difficulty.className = `difficulty difficulty-${project.difficulty}`;
    difficulty.textContent = project.difficulty;

    top.append(badge, difficulty);

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = project.title;

    const meta = document.createElement("div");
    meta.className = "card-meta";
    meta.innerHTML = metaRowHtml([project.estTime, project.estCost]);

    card.append(top, title, meta);

    const { done, total } = stepsProgress(project);
    if (total) {
      const progressRow = document.createElement("div");
      progressRow.className = "progress-row";
      progressRow.innerHTML = `
        <div class="progress-track"><div class="progress-fill" style="width:${Math.round((done / total) * 100)}%"></div></div>
        <span class="progress-label">${done}/${total}</span>
      `;
      card.append(progressRow);
    }
    card.addEventListener("click", () => openProjectDetail(project.id));
    grid.appendChild(card);
  });
}

let searchDebounce = null;
function handleLibraryFilterChange() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.filters.q = $("library-search").value.trim();
    state.filters.category = $("library-category").value;
    state.filters.tag = "";
    loadLibrary();
  }, 200);
}

// ---------- Detail ----------

async function openProjectDetail(id) {
  const res = await authedFetch(`/api/projects/${id}`);
  if (!res.ok) return;
  state.currentProject = await res.json();
  renderProjectDetail();
  showView("detail");
}

function renderProjectDetail() {
  const p = state.currentProject;

  const badge = $("detail-badge");
  badge.className = "badge";
  badge.dataset.cat = categorySlug(p.category);
  badge.textContent = p.category;

  $("detail-title").textContent = p.title;

  const link = $("detail-source-link");
  if (p.sourceUrl) {
    link.href = p.sourceUrl;
    link.hidden = false;
  } else {
    link.hidden = true;
  }

  const difficultyHtml = `<span class="difficulty difficulty-${p.difficulty}">${capitalize(p.difficulty)}</span>`;
  $("detail-meta-row").innerHTML = metaRowHtml([difficultyHtml, p.estTime, p.estCost]);

  const toolsList = $("detail-tools");
  toolsList.innerHTML = "";
  (p.tools || []).forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    toolsList.appendChild(li);
  });

  const materialsList = $("detail-materials");
  materialsList.innerHTML = "";
  (p.materials || []).forEach((m, index) => {
    const li = document.createElement("li");
    li.className = "checklist-item";
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = m.owned;
    checkbox.addEventListener("change", () => handleToggleMaterial(index));
    const span = document.createElement("span");
    const qtyCost = [m.qty ? `× ${m.qty}` : "", m.cost ? m.cost : ""].filter(Boolean);
    span.innerHTML = `${m.name} ${qtyCost.map((t) => `<em class="cost">${t}</em>`).join(" ")}`;
    label.append(checkbox, span);
    li.appendChild(label);
    materialsList.appendChild(li);
  });

  const stepsList = $("detail-steps");
  stepsList.innerHTML = "";
  (p.steps || []).forEach((s, index) => {
    const li = document.createElement("li");
    li.className = "checklist-item";
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = s.done;
    checkbox.addEventListener("change", () => handleToggleStep(index));
    const span = document.createElement("span");
    span.textContent = s.text;
    label.append(checkbox, span);
    li.appendChild(label);
    stepsList.appendChild(li);
  });

  const tagsWrap = $("detail-tags");
  tagsWrap.innerHTML = "";
  (p.tags || []).forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip-static";
    chip.textContent = tag;
    tagsWrap.appendChild(chip);
  });
}

async function handleToggleStep(index) {
  const res = await authedFetch(`/api/projects/${state.currentProject.id}/steps/${index}`, { method: "PATCH" });
  if (!res.ok) return;
  state.currentProject = await res.json();
  renderProjectDetail();
}

async function handleToggleMaterial(index) {
  const res = await authedFetch(`/api/projects/${state.currentProject.id}/materials/${index}`, { method: "PATCH" });
  if (!res.ok) return;
  state.currentProject = await res.json();
  renderProjectDetail();
}

function handleEditProjectClick() {
  const p = state.currentProject;
  state.editingProjectId = p.id;
  state.draftSourceUrl = p.sourceUrl || null;
  state.draft = p;
  $("draft-heading").textContent = "Edit project";
  $("import-form").classList.add("hidden");
  renderDraftEditor();
  showView("import");
}

async function handleDeleteProject() {
  if (!confirm(`Delete "${state.currentProject.title}"? This can't be undone.`)) return;
  const res = await authedFetch(`/api/projects/${state.currentProject.id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) return;
  showView("library");
  loadLibrary();
}

// ---------- Init ----------

let appInitialized = false;

function initApp() {
  if (appInitialized) {
    showView("library");
    loadLibrary();
    return;
  }
  appInitialized = true;

  $("nav-library").addEventListener("click", () => {
    showView("library");
    loadLibrary();
  });
  $("nav-import").addEventListener("click", () => {
    resetImportForm();
    showView("import");
  });
  $("nav-sign-out").addEventListener("click", handleSignOut);
  document.querySelectorAll('[data-view-link="import"]').forEach((el) => {
    el.addEventListener("click", () => {
      resetImportForm();
      showView("import");
    });
  });

  $("import-url").addEventListener("blur", fetchOEmbedPrefill);
  $("btn-extract").addEventListener("click", handleExtractClick);
  $("btn-save").addEventListener("click", handleSaveDraftClick);
  $("btn-discard").addEventListener("click", handleDiscardDraft);
  $("draft-tag-input").addEventListener("keydown", handleTagInputKeydown);

  document.querySelectorAll("#import-draft .btn-add-row").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      if (target === "tools") addToolRow();
      else if (target === "materials") addMaterialRow();
      else if (target === "steps") addStepRow();
    });
  });

  $("library-search").addEventListener("input", handleLibraryFilterChange);
  $("library-category").addEventListener("change", handleLibraryFilterChange);

  $("btn-back-to-library").addEventListener("click", () => {
    showView("library");
    loadLibrary();
  });
  $("btn-edit-project").addEventListener("click", handleEditProjectClick);
  $("btn-delete-project").addEventListener("click", handleDeleteProject);

  showView("library");
  loadLibrary();
}

document.addEventListener("DOMContentLoaded", bootstrap);
