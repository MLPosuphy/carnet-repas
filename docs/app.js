(() => {
  "use strict";

  /* =========================================================================
   * Carnet repas — application statique (GitHub Pages)
   * Synchro familiale via l'API pCloud (OAuth), lecture + écriture PC & mobile.
   * Aucune dépendance, aucun build : tout tient dans ce fichier.
   * ========================================================================= */

  /* ----------------------------- Configuration ---------------------------- */

  const STORAGE_KEY = "carnetRepas.static.v2";
  const AUTH_KEY = "carnetRepas.pcloud.auth";
  const DEVICE_KEY = "carnetRepas.device";
  const THEME_KEY = "carnetRepas.theme";
  const LAST_EXPORT_KEY = "carnetRepas.lastExport";

  const SEED_FILE = "carnet-recettes.json"; // graine livrée avec l'app
  const DATA_FILE = "carnet-recettes.json"; // nom du fichier dans pCloud
  const DEFAULT_FOLDER = "/Carnet repas"; // dossier pCloud partagé
  const IMAGES_SUBDIR = "images";

  // Client ID de l'application pCloud (à créer une fois sur docs.pcloud.com).
  // Peut aussi être renseigné dans Réglages puis stocké dans les données.
  const PCLOUD_CLIENT_ID = "PCLOUD_CLIENT_ID_A_REMPLACER";

  const PLACEHOLDER_STEP = "Compléter les ingrédients et les étapes de préparation.";
  const BACKUP_REMINDER_DAYS = 14;
  const POLL_MS = 20000;
  const PUSH_DEBOUNCE_MS = 900;

  const KNOWN_UNITS = new Set([
    "g", "kg", "mg", "ml", "cl", "dl", "l", "cc", "càc", "c.à.c", "cs", "càs", "c.à.s",
    "cuillère", "cuillères", "pièce", "pièces", "tranche", "tranches", "boîte", "boîtes",
    "sachet", "sachets", "pincée", "pincées", "gousse", "gousses", "verre", "verres",
    "pot", "pots", "feuille", "feuilles", "branche", "branches", "filet", "filets",
  ]);

  /* ------------------------------- Catégories ----------------------------- */
  // Rayons pour la liste de courses (mot-clé -> rayon).
  const AISLES = [
    ["Fruits & légumes", ["tomate", "salade", "carotte", "oignon", "ail", "échalote", "pomme", "banane", "citron", "courgette", "poivron", "champignon", "pomme de terre", "patate", "épinard", "brocoli", "concombre", "fraise", "framboise", "avocat", "persil", "basilic", "coriandre", "menthe", "herbe", "poireau", "céleri", "haricot", "petit pois", "chou", "aubergine", "radis", "betterave", "fenouil", "endive", "orange", "raisin", "poire", "melon", "pastèque", "ananas", "mangue", "kiwi", "gingembre"]],
    ["Boucherie & poisson", ["poulet", "boeuf", "bœuf", "porc", "veau", "agneau", "dinde", "saucisse", "lardon", "jambon", "steak", "viande", "poisson", "saumon", "thon", "cabillaud", "crevette", "merlu", "colin", "filet", "escalope", "côte", "bacon", "chorizo", "magret", "canard"]],
    ["Crèmerie & œufs", ["lait", "beurre", "crème", "yaourt", "fromage", "oeuf", "œuf", "parmesan", "mozzarella", "gruyère", "emmental", "ricotta", "mascarpone", "feta", "comté", "chèvre", "margarine"]],
    ["Boulangerie", ["pain", "baguette", "brioche", "pâte feuilletée", "pâte brisée", "pâte à pizza", "tortilla", "wrap", "biscotte"]],
    ["Épicerie salée", ["farine", "riz", "pâtes", "pâte", "semoule", "lentille", "pois chiche", "huile", "vinaigre", "sel", "poivre", "épice", "moutarde", "sauce soja", "ketchup", "mayonnaise", "bouillon", "conserve", "tomate pelée", "concentré", "lait de coco", "olive", "câpre", "cornichon", "miel", "couscous", "quinoa", "boulgour", "maïs"]],
    ["Épicerie sucrée", ["sucre", "chocolat", "cacao", "levure", "vanille", "confiture", "amande", "noisette", "noix", "miel", "sirop", "biscuit", "céréale", "compote", "fruit sec", "raisin sec", "pépite"]],
    ["Surgelés", ["surgelé", "glace", "glaçon", "petits pois surgelés"]],
    ["Boissons", ["eau", "jus", "vin", "bière", "soda", "café", "thé", "limonade", "sirop"]],
  ];

  function aisleFor(name) {
    const n = String(name || "").toLowerCase();
    for (const [aisle, keywords] of AISLES) {
      if (keywords.some((k) => n.includes(k))) return aisle;
    }
    return "Autres";
  }
  const AISLE_ORDER = [...AISLES.map((a) => a[0]), "Autres"];

  /* ------------------------------- Icônes SVG ----------------------------- */
  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>',
    book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
    basket: '<path d="M5 9h14l-1.5 10.5a2 2 0 0 1-2 1.5H8.5a2 2 0 0 1-2-1.5z"/><path d="M9 9 12 3l3 6"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.2 11h10l2-7H6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9h17M8 3v4M16 3v4"/>',
    cloud: '<path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17.5 11 3.5 3.5 0 0 1 17 18z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    flame: '<path d="M12 3c2 3 5 4 5 8a5 5 0 0 1-10 0c0-2 1-3 2-4 .5 1.5 1.5 2 2 1 .5-1.5-1-3-1-5z"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 13V9M9 2h6"/>',
    check: '<path d="m5 12 5 5L20 6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
    moon: '<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
    download: '<path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14"/>',
    upload: '<path d="M12 20V9m0 0 4 4m-4-4-4 4M5 4h14"/>',
    printer: '<path d="M7 9V3h10v6"/><rect x="5" y="9" width="14" height="7" rx="1.5"/><path d="M7 16h10v5H7z"/>',
    left: '<path d="m14 6-6 6 6 6"/>',
    right: '<path d="m10 6 6 6-6 6"/>',
    x: '<path d="M6 6 18 18M18 6 6 18"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    star: '<path d="m12 4 2.4 5 5.6.6-4 3.8 1 5.6-5-2.8-5 2.8 1-5.6-4-3.8 5.6-.6z"/>',
    sparkles: '<path d="M12 4l1.6 4L18 9.6 13.6 11 12 15l-1.6-4L6 9.6 10.4 8z"/><path d="M18 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    link: '<path d="M9 15l6-6"/><path d="M11 7l1-1a3.5 3.5 0 0 1 5 5l-1 1"/><path d="M13 17l-1 1a3.5 3.5 0 0 1-5-5l1-1"/>',
    back: '<path d="M11 6 5 12l6 6"/><path d="M5 12h14"/>',
  };
  function icon(name, cls) {
    const body = ICONS[name] || "";
    return `<svg class="icon ${cls || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  /* ------------------------------ État global ----------------------------- */
  const appEl = document.getElementById("app");
  const toastEl = document.getElementById("toast");

  let state = null;
  let pushTimer = null;
  let pollTimer = null;
  let toastTimer = null;
  let writing = false;
  let lastRemoteHash = null; // hash pCloud du dernier fichier connu
  const imageLinkCache = new Map(); // path pcloud -> url temporaire
  let undoEntry = null; // { label, restore }
  let undoTimer = null;
  let cook = null; // état du mode cuisson { recipeId, index, timers }

  const ui = { search: "", chapter: "all", status: "all", planWeek: 0 };

  const pcloud = { token: null, host: null, email: null, userid: null, connected: false };

  /* ------------------------------- Utilitaires ---------------------------- */
  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
  function nowIso() {
    return new Date().toISOString();
  }
  function asArray(v) {
    return Array.isArray(v) ? v : [];
  }
  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function slugify(v) {
    const s = String(v || "recette")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return s || "recette";
  }
  function deviceName() {
    let n = localStorage.getItem(DEVICE_KEY);
    if (!n) {
      n = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "Téléphone" : "Ordinateur";
      localStorage.setItem(DEVICE_KEY, n);
    }
    return n;
  }
  function setDeviceName(name) {
    localStorage.setItem(DEVICE_KEY, String(name || "").trim() || "Appareil");
  }

  function formatDate(value) {
    if (!value) return "Jamais";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(value));
  }
  function formatShortDate(date) {
    return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" }).format(date);
  }
  function relativeDays(value) {
    if (!value) return null;
    return Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  }
  function formatTime(minutes) {
    const v = Number(minutes) || 0;
    if (v <= 0) return "À renseigner";
    if (v < 60) return `${v} min`;
    const h = Math.floor(v / 60), r = v % 60;
    return r ? `${h} h ${r}` : `${h} h`;
  }
  function formatQuantity(value) {
    if (value === null || value === undefined || value === "") return "";
    const n = Number(value);
    if (Number.isFinite(n)) {
      const rounded = Math.round(n * 100) / 100;
      return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
    }
    return String(value);
  }

  /* ----------------------- Normalisation des données ---------------------- */
  function ingredientText(item) {
    if (!item) return "";
    if (item.text) return String(item.text);
    const main = [formatQuantity(item.quantity), item.unit, item.name].filter(Boolean).join(" ");
    const note = item.note || item.notes;
    return note ? `${main} · ${note}` : main;
  }

  function normalizeDoc(doc) {
    const base = doc && typeof doc === "object" ? doc : {};
    const recipes = asArray(base.recipes).map((r) => ({
      ...r,
      id: r.id || uid("recipe"),
      title: r.title || "Recette sans titre",
      slug: r.slug || slugify(r.title),
      description: r.description || "",
      servings: Number(r.servings) || 4,
      prepTimeMinutes: Number(r.prepTimeMinutes) || 0,
      cookTimeMinutes: Number(r.cookTimeMinutes) || 0,
      totalTimeMinutes: Number(r.totalTimeMinutes) || 0,
      difficulty: r.difficulty || "easy",
      costLevel: r.costLevel || "medium",
      season: r.season || "all_year",
      sourceType: r.sourceType || "personal",
      sourceName: r.sourceName || null,
      sourceUrl: r.sourceUrl || null,
      imageUrl: r.imageUrl || null,
      personalNotes: r.personalNotes || "",
      createdAt: r.createdAt || Date.now(),
      updatedAt: r.updatedAt || Date.now(),
      lastCookedAt: r.lastCookedAt || null,
      averageRating: r.averageRating ?? null,
      cookCount: Number(r.cookCount) || 0,
      ingredients: asArray(r.ingredients),
      steps: asArray(r.steps),
      tags: asArray(r.tags),
      chapters: asArray(r.chapters),
    }));

    return {
      schemaVersion: 2,
      rev: Number(base.rev) || 1,
      savedAt: base.savedAt || nowIso(),
      savedBy: base.savedBy || "Navigateur",
      recipes,
      chapters: asArray(base.chapters),
      pantry: asArray(base.pantry),
      shopping: asArray(base.shopping),
      mealPlan: asArray(base.mealPlan),
      cookSessions: asArray(base.cookSessions),
      settings: {
        name: "Mateo",
        defaultServings: 4,
        pcloudFolder: DEFAULT_FOLDER,
        pcloudClientId: "",
        ...(base.settings || {}),
      },
    };
  }

  /* ------------------------- Persistance locale --------------------------- */
  function saveLocal(doc = state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  }
  function readLocal() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeDoc(JSON.parse(raw)) : null;
  }

  async function fetchSeed() {
    const res = await fetch(`${SEED_FILE}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Impossible de charger ${SEED_FILE}`);
    return normalizeDoc(await res.json());
  }

  function commitChange(message) {
    state.rev = (Number(state.rev) || 0) + 1;
    state.savedAt = nowIso();
    state.savedBy = deviceName();
    saveLocal();
    schedulePush();
    render();
    if (message) toast(message);
  }

  /* --------------------------------- Undo --------------------------------- */
  function snapshot() {
    return JSON.stringify(state);
  }
  function setUndo(label, beforeSnapshot) {
    clearTimeout(undoTimer);
    undoEntry = {
      label,
      restore: () => {
        state = normalizeDoc(JSON.parse(beforeSnapshot));
        commitChange("Action annulée");
      },
    };
    showToastWithAction(label, "Annuler", () => {
      const e = undoEntry;
      undoEntry = null;
      if (e) e.restore();
    });
    undoTimer = setTimeout(() => { undoEntry = null; }, 6500);
  }

  /* -------------------------------- Toasts -------------------------------- */
  function toast(message) {
    clearTimeout(toastTimer);
    toastEl.innerHTML = `<span>${escapeHtml(message)}</span>`;
    toastEl.classList.add("show");
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }
  function showToastWithAction(message, actionLabel, onAction) {
    clearTimeout(toastTimer);
    toastEl.innerHTML = `<span>${escapeHtml(message)}</span><button type="button" class="toast-action">${escapeHtml(actionLabel)}</button>`;
    toastEl.classList.add("show");
    const btn = toastEl.querySelector(".toast-action");
    if (btn) btn.addEventListener("click", () => { toastEl.classList.remove("show"); onAction(); });
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 6500);
  }

  /* ------------------------------ Thème clair/sombre ---------------------- */
  function currentTheme() {
    return localStorage.getItem(THEME_KEY) || "auto";
  }
  function applyTheme(theme) {
    const t = theme || currentTheme();
    const resolved = t === "auto"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : t;
    document.documentElement.dataset.theme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolved === "dark" ? "#15110c" : "#fffaf0");
  }
  function toggleTheme() {
    const order = ["auto", "light", "dark"];
    const next = order[(order.indexOf(currentTheme()) + 1) % order.length];
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    render();
    toast(next === "auto" ? "Thème : automatique" : next === "dark" ? "Thème : sombre" : "Thème : clair");
  }

  /* ====================================================================== *
   * SYNCHRO pCLOUD (OAuth, lecture + écriture, PC & mobile)
   * ====================================================================== */
  function clientId() {
    return (state?.settings?.pcloudClientId || "").trim() || PCLOUD_CLIENT_ID;
  }
  function pcloudFolder() {
    return (state?.settings?.pcloudFolder || DEFAULT_FOLDER).replace(/\/+$/, "") || "/";
  }
  function redirectUri() {
    return location.origin + location.pathname;
  }
  function hostFromLocation(locationid) {
    return Number(locationid) === 2 ? "eapi.pcloud.com" : "api.pcloud.com";
  }

  function loadAuth() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return;
      const a = JSON.parse(raw);
      if (a && a.token) {
        pcloud.token = a.token;
        pcloud.host = a.host || "api.pcloud.com";
        pcloud.email = a.email || null;
        pcloud.userid = a.userid || null;
        pcloud.connected = true;
      }
    } catch (_) {}
  }
  function storeAuth() {
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      token: pcloud.token, host: pcloud.host, email: pcloud.email, userid: pcloud.userid,
    }));
  }
  function clearAuth() {
    localStorage.removeItem(AUTH_KEY);
    pcloud.token = null; pcloud.host = null; pcloud.email = null; pcloud.userid = null;
    pcloud.connected = false;
    lastRemoteHash = null;
  }

  function connectPcloud() {
    const id = clientId();
    if (!id || id === "PCLOUD_CLIENT_ID_A_REMPLACER") {
      toast("Renseigne d’abord le Client ID pCloud (Synchro › Réglages).");
      location.hash = "#/sync";
      return;
    }
    const url = `https://my.pcloud.com/oauth2/authorize?client_id=${encodeURIComponent(id)}`
      + `&response_type=token&redirect_uri=${encodeURIComponent(redirectUri())}`;
    location.href = url;
  }

  // Récupère le token renvoyé par pCloud après login (fragment ou query string).
  function captureOAuthCallback() {
    const hash = location.hash || "";
    const search = location.search || "";
    let params = null;
    if (hash.includes("access_token=")) params = new URLSearchParams(hash.replace(/^#/, ""));
    else if (search.includes("access_token=")) params = new URLSearchParams(search.replace(/^\?/, ""));
    if (!params) return false;
    const token = params.get("access_token");
    if (!token) return false;
    pcloud.token = token;
    pcloud.host = hostFromLocation(params.get("locationid"));
    pcloud.userid = params.get("userid") || null;
    pcloud.connected = true;
    storeAuth();
    history.replaceState(null, "", redirectUri() + "#/sync");
    return true;
  }

  async function pcApi(method, params = {}, init) {
    const usp = new URLSearchParams({ access_token: pcloud.token, ...params });
    const res = await fetch(`https://${pcloud.host}/${method}?${usp.toString()}`, {
      cache: "no-store",
      ...(init || {}),
    });
    const data = await res.json();
    if (data.result !== 0) {
      // result codes utiles : 2009 = fichier introuvable, 2005 = dossier introuvable
      const err = new Error(data.error || `pCloud erreur ${data.result}`);
      err.code = data.result;
      throw err;
    }
    return data;
  }

  async function fetchUserEmail() {
    try {
      const info = await pcApi("userinfo");
      pcloud.email = info.email || null;
      storeAuth();
    } catch (_) {}
  }

  async function ensureFolder() {
    await pcApi("createfolderifnotexists", { path: pcloudFolder() });
  }

  async function statRemote() {
    try {
      const data = await pcApi("stat", { path: `${pcloudFolder()}/${DATA_FILE}` });
      return data.metadata || null;
    } catch (e) {
      if (e.code === 2009 || e.code === 2005) return null; // pas encore de fichier
      throw e;
    }
  }

  async function readRemote() {
    const link = await pcApi("getfilelink", { path: `${pcloudFolder()}/${DATA_FILE}`, forcedownload: 0, skipfilename: 1 });
    const host = (link.hosts && link.hosts[0]) || pcloud.host;
    const res = await fetch(`https://${host}${link.path}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Lecture du fichier pCloud impossible");
    return normalizeDoc(await res.json());
  }

  async function writeRemote() {
    if (!pcloud.connected || writing) return;
    writing = true;
    try {
      await ensureFolder();
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const form = new FormData();
      form.append("file", blob, DATA_FILE);
      const data = await pcApi("uploadfile", {
        path: pcloudFolder(), filename: DATA_FILE, nopartial: 1,
      }, { method: "POST", body: form });
      const meta = data.metadata && data.metadata[0];
      if (meta) lastRemoteHash = meta.hash;
    } finally {
      writing = false;
    }
  }

  function schedulePush() {
    if (!pcloud.connected) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      writeRemote()
        .then(() => updateSyncBadge())
        .catch((e) => { console.error(e); toast("Synchro pCloud impossible"); });
    }, PUSH_DEBOUNCE_MS);
  }

  async function pullRemote(force) {
    if (!pcloud.connected) return;
    const meta = await statRemote();
    if (!meta) {
      if (force) { await writeRemote(); toast("Fichier créé dans pCloud"); }
      return;
    }
    if (!force && meta.hash === lastRemoteHash) return; // rien de neuf
    const remote = await readRemote();
    lastRemoteHash = meta.hash;
    const remoteRev = Number(remote.rev) || 0;
    const localRev = Number(state.rev) || 0;
    if (force || remoteRev > localRev) {
      state = remote;
      saveLocal();
      render();
      if (force) toast("Données chargées depuis pCloud");
      else toast(`Mise à jour reçue (${escapeHtml(remote.savedBy || "famille")})`);
    } else if (remoteRev < localRev) {
      await writeRemote(); // on est en avance, on pousse
    }
  }

  async function syncInitial() {
    if (!pcloud.connected) return;
    if (!pcloud.email) fetchUserEmail();
    try {
      const meta = await statRemote();
      if (!meta) {
        await writeRemote(); // première fois : on dépose nos données
        toast("pCloud connecté · fichier initialisé");
      } else {
        const remote = await readRemote();
        lastRemoteHash = meta.hash;
        if ((Number(remote.rev) || 0) >= (Number(state.rev) || 0)) {
          state = remote; saveLocal();
        } else {
          await writeRemote();
        }
        toast(`pCloud connecté${pcloud.email ? " · " + pcloud.email : ""}`);
      }
      render();
    } catch (e) {
      console.error(e);
      toast("pCloud : connexion établie mais lecture impossible");
    }
  }

  function startPoll() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (pcloud.connected && !writing && document.visibilityState === "visible") {
        pullRemote(false).catch((e) => console.warn("poll", e));
      }
    }, POLL_MS);
  }

  function updateSyncBadge() {
    const dot = document.querySelector(".status-dot");
    if (dot) dot.classList.toggle("connected", pcloud.connected);
  }

  async function disconnectPcloud() {
    clearAuth();
    render();
    toast("pCloud déconnecté (les données restent sur cet appareil)");
  }

  /* --------------------------- Images via pCloud -------------------------- */
  async function uploadImageToPcloud(file, recipeId) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const filename = `${recipeId || uid("img")}_${Date.now().toString(36)}.${ext}`;
    const folder = `${pcloudFolder()}/${IMAGES_SUBDIR}`;
    await pcApi("createfolderifnotexists", { path: folder });
    const form = new FormData();
    form.append("file", file, filename);
    await pcApi("uploadfile", { path: folder, filename }, { method: "POST", body: form });
    return `pcloud:${IMAGES_SUBDIR}/${filename}`;
  }

  async function resolveImage(ref) {
    if (!ref) return null;
    if (!ref.startsWith("pcloud:")) return ref; // URL normale ou dataURL
    if (imageLinkCache.has(ref)) return imageLinkCache.get(ref);
    if (!pcloud.connected) return null;
    const rel = ref.slice("pcloud:".length);
    try {
      const link = await pcApi("getfilelink", { path: `${pcloudFolder()}/${rel}`, forcedownload: 0, skipfilename: 1 });
      const host = (link.hosts && link.hosts[0]) || pcloud.host;
      const url = `https://${host}${link.path}`;
      imageLinkCache.set(ref, url);
      return url;
    } catch (_) {
      return null;
    }
  }

  async function hydrateImages() {
    const nodes = appEl.querySelectorAll("[data-img]");
    for (const node of nodes) {
      const ref = node.getAttribute("data-img");
      const url = await resolveImage(ref);
      if (url) {
        node.style.backgroundImage = `url("${url}")`;
        node.classList.add("has-image");
      }
    }
  }

  // Réduit une image en miniature dataURL (repli sans pCloud).
  function fileToThumbnail(file, maxSize = 700, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => { img.src = reader.result; };
      reader.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ====================================================================== *
   * SÉLECTEURS / LOGIQUE MÉTIER
   * ====================================================================== */
  function recipeById(id) {
    return state.recipes.find((r) => r.id === id);
  }
  function recipeIsToComplete(recipe) {
    const tags = asArray(recipe.tags).map((t) => String(t).toLowerCase());
    const hasPlaceholder = asArray(recipe.steps).some((s) =>
      String(s.text || "").toLowerCase().includes("compléter les ingrédients"));
    return asArray(recipe.ingredients).length === 0 || tags.includes("à compléter") || hasPlaceholder;
  }
  function completionStats() {
    const total = state.recipes.length;
    const toComplete = state.recipes.filter(recipeIsToComplete).length;
    return { total, complete: total - toComplete, toComplete, pantry: state.pantry.length };
  }
  function getChapters() {
    const fromRecipes = state.recipes.flatMap((r) => asArray(r.chapters));
    const titles = [...state.chapters.map((c) => c.title), ...fromRecipes].filter(Boolean).map(String);
    return [...new Set(titles)].sort((a, b) => a.localeCompare(b, "fr"));
  }
  function chapterColor(recipe) {
    const title = asArray(recipe.chapters)[0];
    const chapter = state.chapters.find((c) => c.title === title);
    return chapter?.color || "#c98a5b";
  }
  function getFilteredRecipes() {
    const search = ui.search.trim().toLowerCase();
    return [...state.recipes]
      .filter((r) => {
        if (ui.chapter !== "all" && !asArray(r.chapters).includes(ui.chapter)) return false;
        if (ui.status === "to_complete" && !recipeIsToComplete(r)) return false;
        if (ui.status === "complete" && recipeIsToComplete(r)) return false;
        if (!search) return true;
        const hay = [r.title, r.description, r.personalNotes,
          asArray(r.tags).join(" "), asArray(r.chapters).join(" "),
          asArray(r.ingredients).map(ingredientText).join(" ")].join(" ").toLowerCase();
        return hay.includes(search);
      })
      .sort((a, b) => a.title.localeCompare(b.title, "fr"));
  }

  /* -------------------------- Ajustement portions ------------------------- */
  // Unités de poids/volume : on garde des décimales. Le reste (œufs, bananes,
  // sachets, tranches…) se compte en entiers.
  const MEASURE_UNITS = new Set([
    "g", "kg", "mg", "ml", "cl", "dl", "l",
    "cc", "càc", "c.à.c", "cs", "càs", "c.à.s",
    "cuillère", "cuillères", "cuillerée", "cuillerées",
  ]);
  function roundScaled(value, unit) {
    const u = String(unit || "").toLowerCase().replace(/[.,;:]+$/, "");
    if (MEASURE_UNITS.has(u)) return value >= 10 ? Math.round(value) : Math.round(value * 2) / 2;
    return Math.max(1, Math.round(value)); // décompte d'unités entières
  }
  // Multiplie la première quantité trouvée dans un texte d'ingrédient.
  function scaleIngredientText(text, factor) {
    if (!factor || factor === 1) return text;
    const re = /(\d+(?:[.,]\d+)?)(\s*\/\s*\d+)?/;
    return String(text).replace(re, (match, num, frac, offset, str) => {
      let value;
      if (frac) {
        const [a, b] = match.split("/").map((x) => Number(x.replace(",", ".").trim()));
        value = b ? a / b : Number(num.replace(",", "."));
      } else {
        value = Number(num.replace(",", "."));
      }
      if (!Number.isFinite(value)) return match;
      const nextWord = str.slice(offset + match.length).trim().split(/\s+/)[0] || "";
      return formatQuantity(roundScaled(value * factor, nextWord));
    });
  }
  function scaledIngredientDisplay(item, factor) {
    if (item.quantity != null && item.quantity !== "") {
      const q = formatQuantity(roundScaled(Number(item.quantity) * factor, item.unit));
      const note = item.note || item.notes;
      const main = [q, item.unit, item.name].filter(Boolean).join(" ");
      return note ? `${main} · ${note}` : main;
    }
    return scaleIngredientText(ingredientText(item), factor);
  }

  /* ----------------------- Liste de courses (fusion) ---------------------- */
  function normalizeName(name) {
    return String(name || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function mergedShopping() {
    const groups = new Map();
    for (const item of state.shopping) {
      const key = `${normalizeName(item.name)}|${(item.unit || "").toLowerCase()}`;
      if (!groups.has(key)) {
        groups.set(key, { ...item, ids: [item.id], quantity: Number(item.quantity) || null, checked: item.checked, sources: new Set() });
      } else {
        const g = groups.get(key);
        g.ids.push(item.id);
        if (Number(item.quantity)) g.quantity = (g.quantity || 0) + Number(item.quantity);
        g.checked = g.checked && item.checked;
      }
      if (item.recipeTitle) groups.get(key).sources.add(item.recipeTitle);
    }
    const byAisle = new Map();
    for (const g of groups.values()) {
      const aisle = aisleFor(g.name);
      if (!byAisle.has(aisle)) byAisle.set(aisle, []);
      byAisle.get(aisle).push(g);
    }
    return AISLE_ORDER
      .filter((a) => byAisle.has(a))
      .map((a) => ({ aisle: a, items: byAisle.get(a).sort((x, y) => String(x.name).localeCompare(String(y.name), "fr")) }));
  }

  /* ------------------- Recommandations à partir du placard ---------------- */
  function pantryRecommendations() {
    if (!state.pantry.length) return [];
    const have = new Set(state.pantry.map((p) => normalizeName(p.name)).filter(Boolean));
    const scored = state.recipes
      .filter((r) => asArray(r.ingredients).length > 0)
      .map((r) => {
        const names = r.ingredients.map((i) => normalizeName(i.name || i.text));
        const matched = names.filter((n) => n && [...have].some((h) => n.includes(h) || h.includes(n)));
        const missing = r.ingredients.filter((i) => {
          const n = normalizeName(i.name || i.text);
          return n && ![...have].some((h) => n.includes(h) || h.includes(n));
        });
        return { recipe: r, coverage: names.length ? matched.length / names.length : 0, matched: matched.length, missing };
      })
      .filter((x) => x.matched > 0)
      .sort((a, b) => b.coverage - a.coverage || a.missing.length - b.missing.length)
      .slice(0, 6);
    return scored;
  }

  /* ====================================================================== *
   * ROUTAGE + RENDU
   * ====================================================================== */
  function routeParts() {
    return location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  }

  function render() {
    if (!state) return;
    const [view, id, subview] = routeParts();
    const active = view || "home";

    if (view === "cook" && id) {
      appEl.innerHTML = renderCookMode(recipeById(id));
      hydrateImages();
      return;
    }

    let content = "";
    if (!view) content = renderHome();
    else if (view === "recipes") content = renderRecipes();
    else if (view === "recipe" && id && subview === "edit") content = renderRecipeForm(recipeById(id));
    else if (view === "recipe" && id) content = renderRecipeDetail(recipeById(id));
    else if (view === "new") content = renderRecipeForm(null);
    else if (view === "pantry") content = renderPantry();
    else if (view === "shopping") content = renderShopping();
    else if (view === "plan") content = renderPlan();
    else if (view === "sync") content = renderSync();
    else content = renderNotFound();

    appEl.innerHTML = renderShell(content, active);
    hydrateImages();
  }

  const NAV = [
    ["home", "#/", "Accueil", "home"],
    ["recipes", "#/recipes", "Recettes", "book"],
    ["pantry", "#/pantry", "Placard", "basket"],
    ["shopping", "#/shopping", "Courses", "cart"],
    ["plan", "#/plan", "Planning", "calendar"],
    ["sync", "#/sync", "Synchro", "cloud"],
  ];

  function themeIcon() {
    const t = currentTheme();
    return t === "dark" ? "moon" : t === "light" ? "sun" : "sparkles";
  }

  function renderShell(content, active) {
    const status = pcloud.connected ? "pCloud connecté" : "Sur cet appareil";
    return `
      <div class="app-shell">
        <header class="topbar">
          <div class="topbar-inner">
            <a class="brand" href="#/" aria-label="Carnet repas">
              <span class="brand-mark">${icon("flame")}</span>
              <span class="brand-text">
                <h1>Carnet repas</h1>
                <p><span class="status-dot ${pcloud.connected ? "connected" : ""}"></span> ${escapeHtml(status)}</p>
              </span>
            </a>
            <nav class="nav" aria-label="Navigation">
              ${NAV.map(([key, href, label, ic]) =>
                `<a class="${active === key ? "active" : ""}" href="${href}">${icon(ic)}<span>${label}</span></a>`).join("")}
            </nav>
            <button class="icon-btn theme-toggle" type="button" data-action="toggle-theme" title="Changer le thème" aria-label="Changer le thème">${icon(themeIcon())}</button>
          </div>
        </header>
        <main class="page">${content}</main>
        <nav class="bottom-nav" aria-label="Navigation mobile">
          ${NAV.map(([key, href, label, ic]) =>
            `<a class="${active === key ? "active" : ""}" href="${href}">${icon(ic)}<span>${label}</span></a>`).join("")}
        </nav>
      </div>
    `;
  }

  /* -------------------------------- Accueil ------------------------------- */
  function renderHome() {
    const stats = completionStats();
    const priority = state.recipes
      .filter((r) => asArray(r.tags).map((t) => t.toLowerCase()).includes("à prioriser")).slice(0, 6);
    const recent = [...state.recipes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 6);
    const showcase = priority.length ? priority : recent;
    const toComplete = state.recipes.filter(recipeIsToComplete).slice(0, 6);
    const lastExport = localStorage.getItem(LAST_EXPORT_KEY);
    const exportDays = relativeDays(lastExport);

    const backupBanner = (!pcloud.connected)
      ? `<div class="banner warn">
           <div>${icon("cloud")}<strong>Synchro pCloud désactivée.</strong> Tes recettes ne sont que sur cet appareil. Connecte pCloud pour la famille.</div>
           <a class="button small" href="#/sync">Configurer</a>
         </div>`
      : (exportDays != null && exportDays >= BACKUP_REMINDER_DAYS
        ? `<div class="banner">
             <div>${icon("download")}<strong>Dernière sauvegarde manuelle il y a ${exportDays} jours.</strong> Un export JSON de temps en temps = filet de sécurité.</div>
             <button class="button small secondary" type="button" data-action="export-json">Exporter</button>
           </div>` : "");

    return `
      ${backupBanner}
      <section class="hero">
        <div class="hero-main">
          <p class="hero-kicker">Carnet de famille</p>
          <h2>${stats.total} idées de repas, prêtes à cuisiner.</h2>
          <p class="hero-sub">${stats.toComplete} recettes attendent encore leurs ingrédients et étapes.</p>
          <div class="hero-actions">
            <a class="button" href="#/recipes">${icon("book")} Parcourir</a>
            <a class="button secondary on-dark" href="#/new">${icon("plus")} Nouvelle recette</a>
          </div>
        </div>
        <aside class="sync-strip">
          <div class="sync-state"><span class="status-dot ${pcloud.connected ? "connected" : ""}"></span>
            <strong>${pcloud.connected ? "Synchro pCloud active" : "Mode local"}</strong></div>
          <p class="muted">Dernière modif : ${escapeHtml(formatDate(state.savedAt))}</p>
          <p class="muted small">par ${escapeHtml(state.savedBy || "—")}</p>
          <a class="button secondary" href="#/sync">${icon("cloud")} Ouvrir la synchro</a>
        </aside>
      </section>

      <section class="stats-grid" aria-label="Statistiques">
        ${renderStat("Recettes", stats.total, "book")}
        ${renderStat("Complétées", stats.complete, "check")}
        ${renderStat("À compléter", stats.toComplete, "edit")}
        ${renderStat("Placard", stats.pantry, "basket")}
      </section>

      <section class="content-grid">
        <div>
          <div class="section-head">
            <div><h2>${priority.length ? "À prioriser" : "Récemment modifiées"}</h2>
              <p>${priority.length ? "Recettes marquées prioritaires." : "Tes dernières recettes."}</p></div>
            <a class="button secondary small" href="#/recipes">Voir tout</a>
          </div>
          <div class="recipe-grid">
            ${showcase.length ? showcase.map(renderRecipeCard).join("") : `<p class="empty">Aucune recette.</p>`}
          </div>
        </div>
        <aside class="panel">
          <div class="section-head"><div><h2>À compléter</h2><p>${stats.toComplete} restantes</p></div></div>
          <ul class="compact-list">
            ${toComplete.length ? toComplete.map((r) =>
              `<li><a class="button secondary" href="#/recipe/${escapeHtml(r.id)}/edit">
                 <span>${escapeHtml(r.title)}</span><span>${icon("edit")}</span></a></li>`).join("")
              : `<li class="empty">Tout est complété. 🎉</li>`}
          </ul>
        </aside>
      </section>
    `;
  }
  function renderStat(label, value, ic) {
    return `<div class="stat"><span class="stat-ic">${icon(ic)}</span><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  /* ------------------------------- Recettes ------------------------------- */
  function renderRecipes() {
    const chapters = getChapters();
    const recipes = getFilteredRecipes();
    return `
      <div class="page-head">
        <div><h2>Recettes</h2><p>${recipes.length} résultat${recipes.length > 1 ? "s" : ""}</p></div>
        <a class="button" href="#/new">${icon("plus")} Nouvelle recette</a>
      </div>
      <div class="toolbar">
        <div class="search-field">${icon("search")}<input id="recipe-search" type="search" placeholder="Rechercher une recette, un ingrédient…" value="${escapeHtml(ui.search)}" /></div>
        <select id="chapter-filter" aria-label="Chapitre">
          <option value="all">Tous les chapitres</option>
          ${chapters.map((c) => `<option value="${escapeHtml(c)}" ${ui.chapter === c ? "selected" : ""}>${escapeHtml(c)}</option>`).join("")}
        </select>
        <select id="status-filter" aria-label="Statut">
          <option value="all" ${ui.status === "all" ? "selected" : ""}>Tous les statuts</option>
          <option value="to_complete" ${ui.status === "to_complete" ? "selected" : ""}>À compléter</option>
          <option value="complete" ${ui.status === "complete" ? "selected" : ""}>Complétées</option>
        </select>
        <button class="secondary" data-action="reset-filters" type="button">Réinitialiser</button>
      </div>
      <div class="recipe-grid">
        ${recipes.length ? recipes.map(renderRecipeCard).join("") : `<p class="empty">Aucune recette ne correspond aux filtres.</p>`}
      </div>
    `;
  }

  function renderRecipeCard(recipe) {
    const toComplete = recipeIsToComplete(recipe);
    const tags = asArray(recipe.tags).filter((t) => t.toLowerCase() !== "à compléter").slice(0, 3);
    const chapters = asArray(recipe.chapters).slice(0, 2);
    const img = recipe.imageUrl;
    return `
      <a class="recipe-card ${img ? "with-image" : ""}" style="--card-accent:${escapeHtml(chapterColor(recipe))}" href="#/recipe/${escapeHtml(recipe.id)}">
        <div class="recipe-card-media" ${img ? `data-img="${escapeHtml(img)}"` : ""}>
          ${img ? "" : `<span class="media-placeholder">${icon("image")}</span>`}
          <div class="badges on-media">
            ${toComplete ? `<span class="badge warn">À compléter</span>` : `<span class="badge ok">Complétée</span>`}
          </div>
        </div>
        <div class="recipe-card-body">
          <div class="badges">${chapters.map((c) => `<span class="badge blue">${escapeHtml(c)}</span>`).join("")}</div>
          <h3>${escapeHtml(recipe.title)}</h3>
          <p>${escapeHtml(recipe.description || "Sans description.")}</p>
          <div class="meta-row">
            <span>${icon("timer")} ${escapeHtml(formatTime(recipe.totalTimeMinutes))}</span>
            <span>${escapeHtml(recipe.servings)} portions</span>
            ${recipe.averageRating ? `<span>${icon("star")} ${escapeHtml(formatQuantity(recipe.averageRating))}</span>` : ""}
          </div>
          ${tags.length ? `<div class="badges">${tags.map((t) => `<span class="badge">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
        </div>
      </a>
    `;
  }

  function renderRecipeDetail(recipe) {
    if (!recipe) return renderNotFound();
    const baseServings = Number(recipe.servings) || 1;
    const target = Number(recipe._targetServings) || baseServings;
    const factor = target / baseServings;
    const ingredients = asArray(recipe.ingredients);
    const steps = asArray(recipe.steps).filter((s) => s.text && s.text !== PLACEHOLDER_STEP);
    const canShop = ingredients.length > 0;
    const cookedDays = relativeDays(recipe.lastCookedAt);

    return `
      <div class="detail-top">
        <a class="button ghost" href="#/recipes">${icon("back")} Retour</a>
        <div class="form-actions inline">
          <a class="button secondary" href="#/recipe/${escapeHtml(recipe.id)}/edit">${icon("edit")} Modifier</a>
          <button data-action="duplicate-recipe" data-id="${escapeHtml(recipe.id)}" class="secondary" type="button">${icon("copy")} Dupliquer</button>
          <button data-action="print-recipe" data-id="${escapeHtml(recipe.id)}" class="secondary" type="button">${icon("printer")} Imprimer</button>
          <button data-action="add-recipe-shopping" data-id="${escapeHtml(recipe.id)}" ${canShop ? "" : "disabled"} type="button">${icon("cart")} Courses</button>
        </div>
      </div>

      <div class="recipe-hero ${recipe.imageUrl ? "" : "no-image"}" ${recipe.imageUrl ? `data-img="${escapeHtml(recipe.imageUrl)}"` : ""}>
        <div class="recipe-hero-overlay">
          <div class="badges">
            ${recipeIsToComplete(recipe) ? `<span class="badge warn">À compléter</span>` : `<span class="badge ok">Complétée</span>`}
            ${asArray(recipe.chapters).map((c) => `<span class="badge blue">${escapeHtml(c)}</span>`).join("")}
          </div>
          <h2 class="detail-title">${escapeHtml(recipe.title)}</h2>
          <div class="meta-row light">
            <span>${icon("timer")} ${escapeHtml(formatTime(recipe.totalTimeMinutes))}</span>
            <span>Prépa ${escapeHtml(formatTime(recipe.prepTimeMinutes))}</span>
            <span>Cuisson ${escapeHtml(formatTime(recipe.cookTimeMinutes))}</span>
            ${recipe.averageRating ? `<span>${icon("star")} ${escapeHtml(formatQuantity(recipe.averageRating))}/5</span>` : ""}
          </div>
        </div>
      </div>

      <section class="detail-layout">
        <div>
          <div class="panel">
            <p>${escapeHtml(recipe.description || "Sans description.")}</p>
            ${recipe.personalNotes ? `<p class="muted note">${icon("sparkles")} ${escapeHtml(recipe.personalNotes)}</p>` : ""}
            ${cookedDays != null ? `<p class="muted small">Cuisiné pour la dernière fois il y a ${cookedDays} j · ${recipe.cookCount || 0} fois</p>` : ""}
          </div>

          <div class="section-head" style="margin-top:20px">
            <h2>Préparation</h2>
            ${steps.length ? `<a class="button small" href="#/cook/${escapeHtml(recipe.id)}">${icon("flame")} Mode cuisson</a>` : ""}
          </div>
          ${steps.length
            ? `<ol class="list step-list">${steps.map((s) => `<li><span>${escapeHtml(s.text)}</span></li>`).join("")}</ol>`
            : `<p class="empty">Étapes à renseigner.</p>`}

          <div class="section-head" style="margin-top:20px"><h2>Tu l’as cuisinée ?</h2></div>
          <div class="panel cooked-panel">
            <p class="muted">Note cette recette pour l’améliorer la prochaine fois.</p>
            <div class="rating-row" data-recipe="${escapeHtml(recipe.id)}">
              ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star-btn" data-action="rate-recipe" data-id="${escapeHtml(recipe.id)}" data-rating="${n}" aria-label="${n} étoiles">${icon("star")}</button>`).join("")}
            </div>
          </div>
        </div>

        <aside>
          <div class="panel sticky">
            <div class="section-head"><h2>Ingrédients</h2></div>
            <div class="serving-control">
              <span>Portions</span>
              <div class="stepper">
                <button type="button" class="icon-btn" data-action="serving-dec" data-id="${escapeHtml(recipe.id)}" aria-label="Moins">−</button>
                <strong>${escapeHtml(target)}</strong>
                <button type="button" class="icon-btn" data-action="serving-inc" data-id="${escapeHtml(recipe.id)}" aria-label="Plus">+</button>
              </div>
              ${factor !== 1 ? `<span class="badge small">×${escapeHtml(formatQuantity(factor))}</span>` : ""}
            </div>
            ${ingredients.length
              ? `<ul class="list ingredient-list">${ingredients.map((i) => `<li>${escapeHtml(scaledIngredientDisplay(i, factor))}</li>`).join("")}</ul>`
              : `<p class="empty">Ingrédients à renseigner.</p>`}
          </div>
          ${asArray(recipe.tags).filter((t) => t.toLowerCase() !== "à compléter").length
            ? `<div class="panel" style="margin-top:16px"><div class="section-head"><h2>Tags</h2></div>
               <div class="badges">${asArray(recipe.tags).filter((t) => t.toLowerCase() !== "à compléter").map((t) => `<span class="badge">${escapeHtml(t)}</span>`).join("")}</div></div>` : ""}
        </aside>
      </section>
    `;
  }

  function renderRecipeForm(recipe) {
    const isNew = !recipe;
    const draft = recipe || {
      id: "", title: "", description: "", servings: state.settings.defaultServings || 4,
      prepTimeMinutes: 0, cookTimeMinutes: 0, totalTimeMinutes: 0,
      difficulty: "easy", costLevel: "medium", season: "all_year",
      personalNotes: "", imageUrl: null, ingredients: [], steps: [], tags: [], chapters: [],
    };
    return `
      <div class="page-head">
        <div>
          <a class="button ghost" href="${isNew ? "#/recipes" : `#/recipe/${escapeHtml(draft.id)}`}">${icon("back")} Retour</a>
          <h2>${isNew ? "Nouvelle recette" : `Modifier ${escapeHtml(draft.title)}`}</h2>
        </div>
      </div>

      <form id="recipe-form" class="panel" data-id="${escapeHtml(draft.id)}">
        <div class="image-field">
          <div class="image-preview ${draft.imageUrl ? "" : "no-image"}" ${draft.imageUrl ? `data-img="${escapeHtml(draft.imageUrl)}"` : ""} id="image-preview">
            ${draft.imageUrl ? "" : `<span>${icon("image")} Aucune photo</span>`}
          </div>
          <div class="image-controls">
            <label class="button secondary" for="image-file">${icon("upload")} Téléverser une photo</label>
            <input class="sr-only" id="image-file" type="file" accept="image/*" />
            <label class="wide">URL de la photo
              <input name="imageUrl" id="image-url" value="${escapeHtml(draft.imageUrl || "")}" placeholder="https://… ou laisse vide" />
            </label>
            ${draft.imageUrl ? `<button class="ghost small" type="button" data-action="clear-image">Retirer la photo</button>` : ""}
          </div>
        </div>

        <div class="form-grid">
          <label class="wide">Titre<input name="title" required value="${escapeHtml(draft.title)}" /></label>
          <label class="wide">Description<textarea name="description">${escapeHtml(draft.description)}</textarea></label>
          <label>Portions<input name="servings" type="number" min="1" value="${escapeHtml(draft.servings)}" /></label>
          <label>Préparation (min)<input name="prepTimeMinutes" type="number" min="0" value="${escapeHtml(draft.prepTimeMinutes)}" /></label>
          <label>Cuisson (min)<input name="cookTimeMinutes" type="number" min="0" value="${escapeHtml(draft.cookTimeMinutes)}" /></label>
          <label>Total (min)<input name="totalTimeMinutes" type="number" min="0" value="${escapeHtml(draft.totalTimeMinutes)}" /></label>
          <label>Difficulté<select name="difficulty">
            ${option("easy", "Facile", draft.difficulty)}${option("medium", "Moyen", draft.difficulty)}${option("hard", "Technique", draft.difficulty)}
          </select></label>
          <label>Coût<select name="costLevel">
            ${option("low", "Économique", draft.costLevel)}${option("medium", "Moyen", draft.costLevel)}${option("high", "Élevé", draft.costLevel)}
          </select></label>
          <label class="wide">Chapitres<input name="chapters" value="${escapeHtml(asArray(draft.chapters).join(", "))}" placeholder="Entrées, Plats…" /></label>
          <label class="wide">Tags<input name="tags" value="${escapeHtml(asArray(draft.tags).filter((t) => t.toLowerCase() !== "à compléter").join(", "))}" placeholder="rapide, végétarien…" /></label>
          <label class="wide">Ingrédients <span class="hint">(un par ligne, ex. « 200 g de farine »)</span>
            <textarea name="ingredients" spellcheck="true" rows="6">${escapeHtml(formatIngredientsText(draft.ingredients))}</textarea></label>
          <label class="wide">Étapes <span class="hint">(une par ligne)</span>
            <textarea name="steps" spellcheck="true" rows="6">${escapeHtml(formatStepsText(draft.steps))}</textarea></label>
          <label class="wide">Notes personnelles<textarea name="personalNotes" spellcheck="true">${escapeHtml(draft.personalNotes)}</textarea></label>
        </div>
        <div class="form-actions">
          ${isNew ? "" : `<button class="danger" type="button" data-action="delete-recipe" data-id="${escapeHtml(draft.id)}">${icon("trash")} Supprimer</button>`}
          <button class="secondary" type="button" data-action="auto-total">Calculer le total</button>
          <button type="submit">${icon("check")} Enregistrer</button>
        </div>
      </form>
    `;
  }
  function option(value, label, selected) {
    return `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }

  /* -------------------------------- Placard ------------------------------- */
  function renderPantry() {
    const items = [...state.pantry].sort((a, b) => String(a.name).localeCompare(String(b.name), "fr"));
    const recos = pantryRecommendations();
    return `
      <div class="page-head"><div><h2>Placard & frigo</h2><p>${items.length} ingrédient${items.length > 1 ? "s" : ""}</p></div></div>

      ${recos.length ? `
      <section class="panel reco-panel">
        <div class="section-head"><div><h2>${icon("sparkles")} Que cuisiner ?</h2><p>D’après ce que tu as dans le placard.</p></div></div>
        <div class="reco-grid">
          ${recos.map((x) => `
            <a class="reco-card" href="#/recipe/${escapeHtml(x.recipe.id)}">
              <div class="reco-bar"><span style="width:${Math.round(x.coverage * 100)}%"></span></div>
              <strong>${escapeHtml(x.recipe.title)}</strong>
              <span class="muted small">${Math.round(x.coverage * 100)}% des ingrédients · ${x.missing.length} manquant${x.missing.length > 1 ? "s" : ""}</span>
            </a>`).join("")}
        </div>
      </section>` : ""}

      <section class="content-grid">
        <div>
          <ul class="list">
            ${items.length ? items.map((item) => `
              <li class="line-item shopping-row">
                <span class="aisle-chip">${escapeHtml(aisleFor(item.name))}</span>
                <span><strong>${escapeHtml(item.name)}</strong>
                  <span class="muted">${escapeHtml([formatQuantity(item.quantity), item.unit, item.location].filter(Boolean).join(" · "))}</span></span>
                <button class="ghost icon-btn" data-action="delete-pantry" data-id="${escapeHtml(item.id)}" type="button" aria-label="Retirer">${icon("trash")}</button>
              </li>`).join("") : `<li class="empty">Placard vide.</li>`}
          </ul>
        </div>
        <aside class="panel">
          <div class="section-head"><h2>Ajouter</h2></div>
          <form id="pantry-form" class="form-grid">
            <label class="wide">Nom<input name="name" required /></label>
            <label>Quantité<input name="quantity" type="number" min="0" step="0.1" /></label>
            <label>Unité<input name="unit" /></label>
            <label class="wide">Emplacement<input name="location" placeholder="frigo, placard…" /></label>
            <div class="form-actions wide"><button type="submit">${icon("plus")} Ajouter</button></div>
          </form>
        </aside>
      </section>
    `;
  }

  /* -------------------------------- Courses ------------------------------- */
  function renderShopping() {
    const recipes = state.recipes.filter((r) => asArray(r.ingredients).length > 0);
    const groups = mergedShopping();
    const total = state.shopping.length;
    const hasChecked = state.shopping.some((i) => i.checked);
    return `
      <div class="page-head">
        <div><h2>Liste de courses</h2><p>${total} article${total > 1 ? "s" : ""} · regroupés par rayon</p></div>
        <button class="secondary" data-action="clear-checked" type="button" ${hasChecked ? "" : "disabled"}>${icon("check")} Retirer cochés</button>
      </div>

      <section class="content-grid">
        <div>
          ${groups.length ? groups.map((g) => `
            <div class="aisle-group">
              <h3 class="aisle-head">${escapeHtml(g.aisle)} <span>${g.items.length}</span></h3>
              <ul class="list">
                ${g.items.map((item) => `
                  <li class="line-item shopping-row ${item.checked ? "done" : ""}">
                    <input data-action="toggle-shopping" data-ids="${escapeHtml(item.ids.join(","))}" type="checkbox" ${item.checked ? "checked" : ""} aria-label="Cocher" />
                    <span class="shopping-name"><strong>${escapeHtml(item.name)}</strong>
                      <span class="muted">${escapeHtml([formatQuantity(item.quantity), item.unit, [...item.sources].slice(0, 2).join(", ")].filter(Boolean).join(" · "))}</span></span>
                    <button class="ghost icon-btn" data-action="delete-shopping" data-ids="${escapeHtml(item.ids.join(","))}" type="button" aria-label="Retirer">${icon("trash")}</button>
                  </li>`).join("")}
              </ul>
            </div>`).join("") : `<p class="empty">Liste vide. Ajoute des recettes ou un article rapide.</p>`}
        </div>
        <aside>
          <div class="panel">
            <div class="section-head"><h2>Depuis les recettes</h2></div>
            <form id="shopping-recipes-form">
              <div class="check-grid">
                ${recipes.length ? recipes.map((r) => `
                  <label class="check-pill"><input type="checkbox" name="recipeIds" value="${escapeHtml(r.id)}" /><span>${escapeHtml(r.title)}</span></label>`).join("")
                  : `<p class="empty">Aucune recette avec ingrédients.</p>`}
              </div>
              <div class="form-actions"><button type="submit" ${recipes.length ? "" : "disabled"}>${icon("plus")} Ajouter aux courses</button></div>
            </form>
          </div>
          <div class="panel" style="margin-top:16px">
            <div class="section-head"><h2>Depuis le planning</h2></div>
            <p class="muted small">Ajoute tous les repas planifiés de la semaine affichée.</p>
            <div class="form-actions"><button class="secondary" type="button" data-action="plan-to-shopping">${icon("calendar")} Ajouter la semaine</button></div>
          </div>
          <div class="panel" style="margin-top:16px">
            <div class="section-head"><h2>Ajout rapide</h2></div>
            <form id="shopping-form" class="form-grid">
              <label class="wide">Nom<input name="name" required /></label>
              <label>Quantité<input name="quantity" type="number" min="0" step="0.1" /></label>
              <label>Unité<input name="unit" /></label>
              <div class="form-actions wide"><button type="submit">${icon("plus")} Ajouter</button></div>
            </form>
          </div>
        </aside>
      </section>
    `;
  }

  /* -------------------------------- Planning ------------------------------ */
  function localIso(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  function weekStart(offset) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = (d.getDay() + 6) % 7; // lundi = 0
    d.setDate(d.getDate() - day + offset * 7);
    return d;
  }
  function renderPlan() {
    const recipes = [...state.recipes].sort((a, b) => a.title.localeCompare(b.title, "fr"));
    const start = weekStart(ui.planWeek);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
    const end = days[6];
    const label = ui.planWeek === 0 ? "Cette semaine" : ui.planWeek === 1 ? "Semaine prochaine" :
      `${formatShortDate(start)} → ${formatShortDate(end)}`;
    return `
      <div class="page-head">
        <div><h2>Planning</h2><p>${escapeHtml(label)}</p></div>
        <div class="week-nav">
          <button class="icon-btn" type="button" data-action="week-prev" aria-label="Semaine précédente">${icon("left")}</button>
          <button class="secondary small" type="button" data-action="week-today">Aujourd’hui</button>
          <button class="icon-btn" type="button" data-action="week-next" aria-label="Semaine suivante">${icon("right")}</button>
        </div>
      </div>
      <div class="plan-grid">${days.map((d) => renderDay(d, recipes)).join("")}</div>
    `;
  }
  function renderDay(date, recipes) {
    const iso = localIso(date);
    const isToday = iso === localIso(new Date());
    return `
      <article class="day-card ${isToday ? "today" : ""}">
        <h3>${escapeHtml(formatShortDate(date))}${isToday ? ` <span class="badge small ok">aujourd’hui</span>` : ""}</h3>
        ${renderPlanSelect(iso, "lunch", "Déjeuner", recipes)}
        ${renderPlanSelect(iso, "dinner", "Dîner", recipes)}
      </article>`;
  }
  function renderPlanSelect(date, meal, label, recipes) {
    const entry = state.mealPlan.find((i) => i.date === date && i.meal === meal);
    return `
      <label>${label}
        <select data-action="set-plan" data-date="${escapeHtml(date)}" data-meal="${escapeHtml(meal)}">
          <option value="">Libre</option>
          ${recipes.map((r) => `<option value="${escapeHtml(r.id)}" ${entry?.recipeId === r.id ? "selected" : ""}>${escapeHtml(r.title)}</option>`).join("")}
        </select>
      </label>`;
  }

  /* --------------------------------- Synchro ------------------------------ */
  function renderSync() {
    const id = clientId();
    const idReady = id && id !== "PCLOUD_CLIENT_ID_A_REMPLACER";
    const lastExport = localStorage.getItem(LAST_EXPORT_KEY);
    return `
      <div class="page-head"><div><h2>Synchro & données</h2>
        <p>Révision ${escapeHtml(state.rev)} · ${escapeHtml(formatDate(state.savedAt))}</p></div></div>

      <section class="settings-grid">
        <div class="panel pcloud-panel">
          <div class="section-head"><div><h2>${icon("cloud")} pCloud</h2>
            <p>${pcloud.connected ? "Connecté — édition partagée PC & mobile." : "Synchro familiale, lecture + écriture partout."}</p></div></div>
          <div class="pcloud-state ${pcloud.connected ? "on" : "off"}">
            <span class="status-dot ${pcloud.connected ? "connected" : ""}"></span>
            <div><strong>${pcloud.connected ? "Connecté" : "Non connecté"}</strong>
              ${pcloud.connected ? `<span class="muted small">${escapeHtml(pcloud.email || "compte pCloud")} · dossier ${escapeHtml(pcloudFolder())}</span>` : `<span class="muted small">Tes données ne sont que sur cet appareil.</span>`}</div>
          </div>
          <div class="form-actions" style="justify-content:flex-start">
            ${pcloud.connected
              ? `<button class="secondary" type="button" data-action="pull-pcloud">${icon("download")} Charger</button>
                 <button class="secondary" type="button" data-action="push-pcloud">${icon("upload")} Enregistrer</button>
                 <button class="ghost" type="button" data-action="disconnect-pcloud">Déconnecter</button>`
              : `<button type="button" data-action="connect-pcloud" ${idReady ? "" : "disabled"}>${icon("link")} Connecter pCloud</button>`}
          </div>
          ${idReady ? "" : `<p class="banner warn inline">${icon("settings")} Renseigne d’abord le Client ID pCloud ci-dessous, puis reviens connecter.</p>`}
        </div>

        <div class="panel">
          <div class="section-head"><h2>État</h2></div>
          <dl class="kv">
            <div><dt>Mode</dt><dd>${pcloud.connected ? "pCloud" : "Local"}</dd></div>
            <div><dt>Appareil</dt><dd>${escapeHtml(deviceName())}</dd></div>
            <div><dt>Recettes</dt><dd>${state.recipes.length}</dd></div>
            <div><dt>Courses</dt><dd>${state.shopping.length}</dd></div>
            <div><dt>Planning</dt><dd>${state.mealPlan.length}</dd></div>
          </dl>
        </div>

        <div class="panel">
          <div class="section-head"><div><h2>${icon("download")} Sauvegarde manuelle</h2><p>Filet de sécurité (recommandé de temps en temps).</p></div></div>
          <p class="muted small">Dernier export : ${escapeHtml(formatDate(lastExport))}</p>
          <div class="form-actions" style="justify-content:flex-start">
            <button class="secondary" type="button" data-action="export-json">${icon("download")} Exporter le JSON</button>
            <label class="button secondary" for="import-json">${icon("upload")} Importer</label>
            <input class="sr-only" id="import-json" type="file" accept="application/json,.json" />
          </div>
        </div>

        <div class="panel">
          <div class="section-head"><h2>${icon("settings")} Réglages</h2></div>
          <form id="settings-form" class="form-grid">
            <label class="wide">Nom de cet appareil
              <input name="deviceName" value="${escapeHtml(deviceName())}" placeholder="Téléphone de Mateo" /></label>
            <label class="wide">Client ID pCloud
              <input name="pcloudClientId" value="${escapeHtml(state.settings.pcloudClientId || "")}" placeholder="${escapeHtml(PCLOUD_CLIENT_ID)}" /></label>
            <label class="wide">Dossier pCloud partagé
              <input name="pcloudFolder" value="${escapeHtml(state.settings.pcloudFolder || DEFAULT_FOLDER)}" placeholder="/Carnet repas" /></label>
            <div class="form-actions wide"><button type="submit">${icon("check")} Enregistrer les réglages</button></div>
          </form>
          <p class="muted small">Besoin d’aide pour le Client ID ? Voir <strong>PCLOUD-SETUP.md</strong> dans le dépôt.</p>
        </div>
      </section>
    `;
  }

  function renderNotFound() {
    return `<div class="panel"><h2>Page introuvable</h2><p class="muted">La vue demandée n’existe pas.</p><a class="button" href="#/">Accueil</a></div>`;
  }

  /* ------------------------------ Mode cuisson ---------------------------- */
  function renderCookMode(recipe) {
    if (!recipe) return renderNotFound();
    const steps = asArray(recipe.steps).filter((s) => s.text && s.text !== PLACEHOLDER_STEP);
    if (!cook || cook.recipeId !== recipe.id) cook = { recipeId: recipe.id, index: 0, timer: null, remaining: 0 };
    const index = Math.min(cook.index, Math.max(0, steps.length - 1));
    const step = steps[index];
    const ingredients = asArray(recipe.ingredients);
    return `
      <div class="cook-screen">
        <header class="cook-bar">
          <a class="button ghost" href="#/recipe/${escapeHtml(recipe.id)}">${icon("x")} Quitter</a>
          <strong>${escapeHtml(recipe.title)}</strong>
          <span class="cook-progress">${steps.length ? index + 1 : 0}/${steps.length}</span>
        </header>
        <div class="cook-body">
          <div class="cook-step">
            <span class="cook-step-num">${steps.length ? index + 1 : "—"}</span>
            <p>${step ? escapeHtml(step.text) : "Aucune étape renseignée."}</p>
            <div class="cook-timer" id="cook-timer">${cook.remaining > 0 ? formatTimer(cook.remaining) : ""}</div>
            <div class="cook-timer-actions">
              ${[5, 10, 15].map((m) => `<button class="secondary small" type="button" data-action="cook-timer" data-min="${m}">${m} min</button>`).join("")}
              ${cook.remaining > 0 ? `<button class="ghost small" type="button" data-action="cook-timer-stop">Arrêter</button>` : ""}
            </div>
          </div>
          <aside class="cook-ingredients">
            <h3>Ingrédients</h3>
            <ul class="list">${ingredients.map((i) => `<li>${escapeHtml(ingredientText(i))}</li>`).join("") || `<li class="empty">—</li>`}</ul>
          </aside>
        </div>
        <footer class="cook-nav">
          <button class="secondary" type="button" data-action="cook-prev" ${index <= 0 ? "disabled" : ""}>${icon("left")} Précédent</button>
          ${index >= steps.length - 1
            ? `<button type="button" data-action="cook-finish" data-id="${escapeHtml(recipe.id)}">${icon("check")} Terminé</button>`
            : `<button type="button" data-action="cook-next">Suivant ${icon("right")}</button>`}
        </footer>
      </div>
    `;
  }
  function formatTimer(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  /* ====================================================================== *
   * TEXTE INGRÉDIENTS / ÉTAPES (édition)
   * ====================================================================== */
  function formatIngredientsText(items) {
    return asArray(items).map((i) => {
      if (i.text) return i.text;
      const main = [formatQuantity(i.quantity), i.unit, i.name].filter(Boolean).join(" ");
      const note = i.note || i.notes;
      return note ? `${main} | ${note}` : main;
    }).join("\n");
  }
  function parseIngredientsText(value) {
    return String(value || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line, index) => {
      const [main, note] = line.split("|").map((p) => p.trim());
      const parts = main.split(/\s+/).filter(Boolean);
      let quantity = null, unit = "", name = main;
      const first = parts[0] ? Number(parts[0].replace(",", ".")) : NaN;
      if (Number.isFinite(first)) {
        quantity = first;
        if (parts[1] && KNOWN_UNITS.has(parts[1].toLowerCase())) { unit = parts[1]; name = parts.slice(2).join(" "); }
        else { name = parts.slice(1).join(" "); }
      }
      return { id: uid("ing"), sortOrder: index, text: main, name: name || main, quantity, unit, note: note || null };
    });
  }
  function formatStepsText(steps) {
    return asArray(steps).filter((s) => s.text && s.text !== PLACEHOLDER_STEP).map((s) => s.text).join("\n");
  }
  function parseStepsText(value) {
    return String(value || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      .map((text, index) => ({ id: uid("step"), sortOrder: index, text, timerMinutes: null }));
  }
  function splitList(value) {
    return String(value || "").split(",").map((x) => x.trim()).filter(Boolean);
  }

  /* ====================================================================== *
   * ACTIONS / MUTATIONS
   * ====================================================================== */
  function handleRecipeSubmit(form) {
    const data = new FormData(form);
    const id = form.dataset.id;
    const existing = id ? recipeById(id) : null;
    const ingredients = parseIngredientsText(data.get("ingredients"));
    let steps = parseStepsText(data.get("steps"));
    let tags = splitList(data.get("tags"));
    const chapters = splitList(data.get("chapters"));

    if (!steps.length) steps = [{ id: uid("step"), sortOrder: 0, text: PLACEHOLDER_STEP, timerMinutes: null }];
    const isComplete = ingredients.length > 0 && steps.some((s) => s.text !== PLACEHOLDER_STEP);
    tags = tags.filter((t) => t.toLowerCase() !== "à compléter");
    if (!isComplete) tags.push("à compléter");
    tags = [...new Set(tags)];

    const prep = Number(data.get("prepTimeMinutes")) || 0;
    const cook2 = Number(data.get("cookTimeMinutes")) || 0;
    const total = Number(data.get("totalTimeMinutes")) || prep + cook2;
    const title = String(data.get("title") || "").trim() || "Recette sans titre";
    const imageUrl = String(data.get("imageUrl") || "").trim() || existing?.imageUrl || null;

    const recipe = {
      ...(existing || {}),
      id: existing?.id || uid("recipe"),
      title, slug: existing?.slug || slugify(title),
      description: String(data.get("description") || "").trim(),
      servings: Number(data.get("servings")) || 4,
      prepTimeMinutes: prep, cookTimeMinutes: cook2, totalTimeMinutes: total,
      difficulty: String(data.get("difficulty") || "easy"),
      costLevel: String(data.get("costLevel") || "medium"),
      season: existing?.season || "all_year",
      sourceType: existing?.sourceType || "personal",
      sourceName: existing?.sourceName || null, sourceUrl: existing?.sourceUrl || null,
      imageUrl,
      personalNotes: String(data.get("personalNotes") || "").trim(),
      createdAt: existing?.createdAt || Date.now(), updatedAt: Date.now(),
      lastCookedAt: existing?.lastCookedAt || null,
      averageRating: existing?.averageRating ?? null, cookCount: existing?.cookCount || 0,
      ingredients, steps, tags, chapters,
    };
    if (existing) state.recipes = state.recipes.map((r) => (r.id === recipe.id ? recipe : r));
    else state.recipes.push(recipe);
    ensureChapters(chapters);
    commitChange("Recette enregistrée");
    location.hash = `#/recipe/${recipe.id}`;
  }

  function ensureChapters(chapters) {
    const palette = ["#c98a5b", "#1a6a5b", "#b8744f", "#7c6cae", "#d4a04a", "#5a8a7a"];
    const known = new Set(state.chapters.map((c) => c.title));
    chapters.forEach((title) => {
      if (!known.has(title)) {
        state.chapters.push({ id: uid("chapter"), title, description: "", coverImageUrl: null,
          color: palette[state.chapters.length % palette.length], sortOrder: state.chapters.length });
      }
    });
  }

  function addRecipeToShopping(recipeId) {
    const recipe = recipeById(recipeId);
    if (!recipe || !asArray(recipe.ingredients).length) { toast("Aucun ingrédient à ajouter"); return; }
    recipe.ingredients.forEach((ing) => {
      state.shopping.push({ id: uid("shop"), name: ing.name || ing.text, quantity: ing.quantity ?? null,
        unit: ing.unit || "", checked: false, recipeId: recipe.id, recipeTitle: recipe.title });
    });
  }

  function duplicateRecipe(recipeId) {
    const recipe = recipeById(recipeId);
    if (!recipe) return;
    const copy = { ...recipe, id: uid("recipe"), title: `${recipe.title} (copie)`,
      slug: slugify(`${recipe.title} copie`), createdAt: Date.now(), updatedAt: Date.now(),
      ingredients: asArray(recipe.ingredients).map((i, idx) => ({ ...i, id: uid("ing"), sortOrder: idx })),
      steps: asArray(recipe.steps).map((s, idx) => ({ ...s, id: uid("step"), sortOrder: idx })) };
    state.recipes.push(copy);
    commitChange("Recette dupliquée");
    location.hash = `#/recipe/${copy.id}/edit`;
  }

  function rateRecipe(recipeId, rating) {
    const recipe = recipeById(recipeId);
    if (!recipe) return;
    state.cookSessions.push({ id: uid("cook"), recipeId, rating, date: nowIso() });
    const sessions = state.cookSessions.filter((s) => s.recipeId === recipeId && s.rating);
    recipe.averageRating = Math.round((sessions.reduce((a, s) => a + s.rating, 0) / sessions.length) * 10) / 10;
    recipe.lastCookedAt = nowIso();
    recipe.cookCount = (recipe.cookCount || 0) + 1;
    recipe.updatedAt = Date.now();
    commitChange(`Noté ${rating}/5 · merci !`);
  }

  function addShoppingItem(form) {
    const data = new FormData(form);
    state.shopping.push({ id: uid("shop"), name: String(data.get("name") || "").trim(),
      quantity: Number(data.get("quantity")) || null, unit: String(data.get("unit") || "").trim(),
      checked: false, recipeId: null, recipeTitle: "" });
    form.reset();
    commitChange("Article ajouté");
  }
  function addPantryItem(form) {
    const data = new FormData(form);
    state.pantry.push({ id: uid("pantry"), name: String(data.get("name") || "").trim(),
      quantity: Number(data.get("quantity")) || null, unit: String(data.get("unit") || "").trim(),
      location: String(data.get("location") || "").trim(), expirationDate: null });
    form.reset();
    commitChange("Ingrédient ajouté");
  }
  function setPlan(select) {
    const { date, meal } = select.dataset;
    const recipeId = select.value;
    state.mealPlan = state.mealPlan.filter((i) => !(i.date === date && i.meal === meal));
    if (recipeId) state.mealPlan.push({ id: uid("plan"), date, meal, recipeId });
    commitChange("Planning mis à jour");
  }
  function planWeekToShopping() {
    const start = weekStart(ui.planWeek);
    const isos = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return localIso(d); });
    const entries = state.mealPlan.filter((e) => isos.includes(e.date) && e.recipeId);
    if (!entries.length) { toast("Aucun repas planifié cette semaine"); return; }
    entries.forEach((e) => addRecipeToShopping(e.recipeId));
    commitChange(`${entries.length} repas ajoutés aux courses`);
  }

  function autoTotal() {
    const form = document.getElementById("recipe-form");
    if (!form) return;
    form.elements.totalTimeMinutes.value = (Number(form.elements.prepTimeMinutes.value) || 0) + (Number(form.elements.cookTimeMinutes.value) || 0);
  }

  /* ----------------------- Import / export JSON --------------------------- */
  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = DATA_FILE; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    localStorage.setItem(LAST_EXPORT_KEY, nowIso());
    toast("JSON exporté");
  }
  async function importJson(file) {
    if (!file) return;
    const incoming = normalizeDoc(JSON.parse(await file.text()));
    const ok = confirm(`Ce fichier contient ${incoming.recipes.length} recette(s).\nIl va REMPLACER tes ${state.recipes.length} recettes actuelles sur cet appareil${pcloud.connected ? " et dans pCloud" : ""}.\n\nContinuer ?`);
    if (!ok) return;
    state = incoming;
    state.savedAt = nowIso(); state.savedBy = "Import JSON";
    saveLocal(); schedulePush(); render();
    toast("JSON importé");
  }

  function saveSettings(form) {
    const data = new FormData(form);
    setDeviceName(data.get("deviceName"));
    state.settings.pcloudClientId = String(data.get("pcloudClientId") || "").trim();
    state.settings.pcloudFolder = String(data.get("pcloudFolder") || DEFAULT_FOLDER).trim() || DEFAULT_FOLDER;
    commitChange("Réglages enregistrés");
  }

  /* ----------------------------- Mode cuisson ----------------------------- */
  function cookStartTimer(minutes) {
    cookStopTimer();
    cook.remaining = minutes * 60;
    updateCookTimer();
    cook.timer = setInterval(() => {
      cook.remaining -= 1;
      if (cook.remaining <= 0) {
        cookStopTimer();
        toast("⏰ Minuteur terminé !");
        try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (_) {}
      }
      updateCookTimer();
    }, 1000);
  }
  function cookStopTimer() {
    if (cook && cook.timer) { clearInterval(cook.timer); cook.timer = null; }
    if (cook) cook.remaining = 0;
    updateCookTimer();
  }
  function updateCookTimer() {
    const el = document.getElementById("cook-timer");
    if (el) el.textContent = cook && cook.remaining > 0 ? formatTimer(cook.remaining) : "";
  }

  /* ====================================================================== *
   * ÉVÉNEMENTS
   * ====================================================================== */
  appEl.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    try {
      switch (action) {
        case "toggle-theme": toggleTheme(); break;
        case "reset-filters": ui.search = ""; ui.chapter = "all"; ui.status = "all"; render(); break;
        case "auto-total": autoTotal(); break;
        case "add-recipe-shopping": addRecipeToShopping(id); commitChange("Ingrédients ajoutés aux courses"); break;
        case "duplicate-recipe": duplicateRecipe(id); break;
        case "print-recipe": window.print(); break;
        case "rate-recipe": rateRecipe(id, Number(target.dataset.rating)); break;
        case "clear-image": {
          const url = document.getElementById("image-url"); if (url) url.value = "";
          const prev = document.getElementById("image-preview");
          if (prev) { prev.removeAttribute("data-img"); prev.classList.add("no-image"); prev.style.backgroundImage = ""; prev.innerHTML = `<span>${icon("image")} Aucune photo</span>`; }
          break;
        }
        case "serving-inc": case "serving-dec": {
          const r = recipeById(id);
          if (r) { const base = Number(r.servings) || 1; const cur = Number(r._targetServings) || base;
            r._targetServings = Math.max(1, cur + (action === "serving-inc" ? 1 : -1)); render(); }
          break;
        }
        case "delete-recipe": {
          const before = snapshot();
          state.recipes = state.recipes.filter((r) => r.id !== id);
          commitChange("Recette supprimée");
          location.hash = "#/recipes";
          setUndo("Recette supprimée", before);
          break;
        }
        case "delete-pantry": {
          const before = snapshot();
          state.pantry = state.pantry.filter((i) => i.id !== id);
          commitChange("Ingrédient retiré"); setUndo("Ingrédient retiré", before); break;
        }
        case "delete-shopping": {
          const ids = (target.dataset.ids || "").split(",");
          state.shopping = state.shopping.filter((i) => !ids.includes(i.id));
          commitChange("Article retiré"); break;
        }
        case "clear-checked": state.shopping = state.shopping.filter((i) => !i.checked); commitChange("Articles cochés retirés"); break;
        case "plan-to-shopping": planWeekToShopping(); break;
        case "week-prev": ui.planWeek -= 1; render(); break;
        case "week-next": ui.planWeek += 1; render(); break;
        case "week-today": ui.planWeek = 0; render(); break;
        case "export-json": exportJson(); break;
        case "connect-pcloud": connectPcloud(); break;
        case "disconnect-pcloud": await disconnectPcloud(); break;
        case "pull-pcloud": await pullRemote(true); break;
        case "push-pcloud": await writeRemote(); toast("Enregistré dans pCloud"); break;
        case "cook-prev": if (cook) { cookStopTimer(); cook.index = Math.max(0, cook.index - 1); render(); } break;
        case "cook-next": if (cook) { cookStopTimer(); cook.index += 1; render(); } break;
        case "cook-timer": cookStartTimer(Number(target.dataset.min)); render(); break;
        case "cook-timer-stop": cookStopTimer(); render(); break;
        case "cook-finish": cookStopTimer(); location.hash = `#/recipe/${id}`; toast("Bon appétit ! 🍽️ Pense à noter la recette."); break;
      }
    } catch (e) {
      console.error(e);
      toast(e.message || "Action impossible");
    }
  });

  appEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    if (form.id === "recipe-form") handleRecipeSubmit(form);
    else if (form.id === "pantry-form") addPantryItem(form);
    else if (form.id === "shopping-form") addShoppingItem(form);
    else if (form.id === "settings-form") saveSettings(form);
    else if (form.id === "shopping-recipes-form") {
      const selected = new FormData(form).getAll("recipeIds");
      if (!selected.length) return;
      selected.forEach(addRecipeToShopping);
      commitChange(`${selected.length} recette(s) ajoutée(s) aux courses`);
    }
  });

  appEl.addEventListener("input", (event) => {
    if (event.target.id === "recipe-search") { ui.search = event.target.value; debounceSearch(); }
  });
  let searchTimer = null;
  function debounceSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const grid = appEl.querySelector(".recipe-grid");
      const recipes = getFilteredRecipes();
      if (grid) { grid.innerHTML = recipes.length ? recipes.map(renderRecipeCard).join("") : `<p class="empty">Aucune recette ne correspond.</p>`; hydrateImages(); }
      const count = appEl.querySelector(".page-head p");
      if (count) count.textContent = `${recipes.length} résultat${recipes.length > 1 ? "s" : ""}`;
    }, 160);
  }

  appEl.addEventListener("change", async (event) => {
    const target = event.target;
    try {
      if (target.id === "chapter-filter") { ui.chapter = target.value; render(); }
      else if (target.id === "status-filter") { ui.status = target.value; render(); }
      else if (target.dataset.action === "toggle-shopping") {
        const ids = (target.dataset.ids || "").split(",");
        state.shopping.forEach((i) => { if (ids.includes(i.id)) i.checked = target.checked; });
        commitChange("Courses mises à jour");
      }
      else if (target.dataset.action === "set-plan") setPlan(target);
      else if (target.id === "import-json") await importJson(target.files?.[0]);
      else if (target.id === "image-file") await handleImageFile(target.files?.[0]);
    } catch (e) { console.error(e); toast(e.message || "Action impossible"); }
  });

  async function handleImageFile(file) {
    if (!file) return;
    const prev = document.getElementById("image-preview");
    const urlInput = document.getElementById("image-url");
    const form = document.getElementById("recipe-form");
    const recipeId = form?.dataset.id || uid("recipe");
    toast("Traitement de la photo…");
    let ref;
    if (pcloud.connected) {
      ref = await uploadImageToPcloud(file, recipeId);
    } else {
      ref = await fileToThumbnail(file);
      toast("Photo ajoutée (miniature). Connecte pCloud pour la pleine qualité.");
    }
    if (urlInput) urlInput.value = ref;
    if (prev) {
      prev.classList.remove("no-image");
      prev.innerHTML = "";
      const url = await resolveImage(ref);
      if (url) { prev.style.backgroundImage = `url("${url}")`; prev.classList.add("has-image"); }
    }
  }

  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (currentTheme() === "auto") applyTheme(); });

  /* -------------------------------- Init ---------------------------------- */
  async function init() {
    applyTheme();
    try {
      const calledBack = captureOAuthCallback();
      loadAuth();

      const local = readLocal();
      if (local) state = local;
      else state = await fetchSeed();
      saveLocal();

      render();

      if (pcloud.connected) {
        if (calledBack) await syncInitial();
        else await pullRemote(false).catch((e) => console.warn("pull init", e));
        startPoll();
      }
    } catch (error) {
      console.error(error);
      appEl.innerHTML = `<div class="app-shell"><div class="panel"><h1>Carnet repas</h1>
        <p class="muted">${escapeHtml(error.message || "Chargement impossible.")}</p></div></div>`;
    }
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  init();
})();
