(() => {
  "use strict";

  const STORAGE_KEY = "carnetRepas.static.v1";
  const DB_NAME = "carnetRepasFS";
  const DB_STORE = "handles";
  const HANDLE_KEY = "directory";
  const SHARED_FILE = "carnet-recettes.json";
  const PLACEHOLDER_STEP = "Compléter les ingrédients et les étapes de préparation.";
  const KNOWN_UNITS = new Set([
    "g",
    "kg",
    "ml",
    "cl",
    "l",
    "cc",
    "c.à.c",
    "càs",
    "c.à.s",
    "pièce",
    "pièces",
    "tranche",
    "tranches",
    "boîte",
    "boîtes",
    "sachet",
    "sachets",
  ]);

  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");

  let state = null;
  let dirHandle = null;
  let connectedToDirectory = false;
  let saveTimer = null;
  let pollTimer = null;
  let writingSharedFile = false;
  let toastTimer = null;

  const ui = {
    search: "",
    chapter: "all",
    status: "all",
  };

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function slugify(value) {
    const slug = String(value || "recette")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "recette";
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeDoc(doc) {
    const base = doc && typeof doc === "object" ? doc : {};
    const recipes = asArray(base.recipes).map((recipe) => ({
      ...recipe,
      id: recipe.id || uid("recipe"),
      title: recipe.title || "Recette sans titre",
      slug: recipe.slug || slugify(recipe.title),
      description: recipe.description || "",
      servings: Number(recipe.servings) || 4,
      prepTimeMinutes: Number(recipe.prepTimeMinutes) || 0,
      cookTimeMinutes: Number(recipe.cookTimeMinutes) || 0,
      totalTimeMinutes: Number(recipe.totalTimeMinutes) || 0,
      difficulty: recipe.difficulty || "easy",
      costLevel: recipe.costLevel || "medium",
      season: recipe.season || "all_year",
      sourceType: recipe.sourceType || "personal",
      sourceName: recipe.sourceName || null,
      sourceUrl: recipe.sourceUrl || null,
      imageUrl: recipe.imageUrl || null,
      personalNotes: recipe.personalNotes || "",
      createdAt: recipe.createdAt || Date.now(),
      updatedAt: recipe.updatedAt || Date.now(),
      ingredients: asArray(recipe.ingredients),
      steps: asArray(recipe.steps),
      tags: asArray(recipe.tags),
      chapters: asArray(recipe.chapters),
    }));

    return {
      schemaVersion: 1,
      rev: Number(base.rev) || 1,
      savedAt: base.savedAt || nowIso(),
      savedBy: base.savedBy || "Navigateur",
      recipes,
      chapters: asArray(base.chapters),
      pantry: asArray(base.pantry),
      shopping: asArray(base.shopping),
      mealPlan: asArray(base.mealPlan),
      settings: {
        name: "Mateo",
        defaultServings: 4,
        remoteUrl: "",
        ...(base.settings || {}),
      },
    };
  }

  async function loadState() {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      return normalizeDoc(JSON.parse(local));
    }

    const response = await fetch(SHARED_FILE, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Impossible de charger ${SHARED_FILE}`);
    }

    const doc = normalizeDoc(await response.json());
    saveLocal(doc);
    return doc;
  }

  function saveLocal(doc = state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  }

  function commitChange(message) {
    state.rev = (Number(state.rev) || 0) + 1;
    state.savedAt = nowIso();
    state.savedBy = "Navigateur";
    saveLocal();
    scheduleSharedWrite();
    render();
    if (message) toast(message);
  }

  function toast(message) {
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add("show");
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  function formatDate(value) {
    if (!value) return "Jamais";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function formatShortDate(date) {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    }).format(date);
  }

  function formatTime(minutes) {
    const value = Number(minutes) || 0;
    if (value <= 0) return "À renseigner";
    if (value < 60) return `${value} min`;
    const hours = Math.floor(value / 60);
    const rest = value % 60;
    return rest ? `${hours} h ${rest}` : `${hours} h`;
  }

  function formatQuantity(value) {
    if (value === null || value === undefined || value === "") return "";
    const number = Number(value);
    if (Number.isFinite(number)) {
      return Number.isInteger(number) ? String(number) : String(number).replace(".", ",");
    }
    return String(value);
  }

  function recipeIsToComplete(recipe) {
    const tags = asArray(recipe.tags).map((tag) => String(tag).toLowerCase());
    const hasPlaceholderStep = asArray(recipe.steps).some((step) =>
      String(step.text || "").toLowerCase().includes("compléter les ingrédients"),
    );
    return asArray(recipe.ingredients).length === 0 || tags.includes("à compléter") || hasPlaceholderStep;
  }

  function completionStats() {
    const total = state.recipes.length;
    const toComplete = state.recipes.filter(recipeIsToComplete).length;
    return {
      total,
      complete: total - toComplete,
      toComplete,
      pantry: state.pantry.length,
    };
  }

  function getChapters() {
    const fromRecipes = state.recipes.flatMap((recipe) => asArray(recipe.chapters));
    const titles = [...state.chapters.map((chapter) => chapter.title), ...fromRecipes]
      .filter(Boolean)
      .map(String);
    return [...new Set(titles)].sort((a, b) => a.localeCompare(b, "fr"));
  }

  function chapterColor(recipe) {
    const title = asArray(recipe.chapters)[0];
    const chapter = state.chapters.find((item) => item.title === title);
    return chapter?.color || "#4d7c72";
  }

  function getFilteredRecipes() {
    const search = ui.search.trim().toLowerCase();
    return [...state.recipes]
      .filter((recipe) => {
        if (ui.chapter !== "all" && !asArray(recipe.chapters).includes(ui.chapter)) return false;
        if (ui.status === "to_complete" && !recipeIsToComplete(recipe)) return false;
        if (ui.status === "complete" && recipeIsToComplete(recipe)) return false;
        if (!search) return true;
        const haystack = [
          recipe.title,
          recipe.description,
          recipe.personalNotes,
          asArray(recipe.tags).join(" "),
          asArray(recipe.chapters).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      })
      .sort((a, b) => a.title.localeCompare(b.title, "fr"));
  }

  function recipeById(id) {
    return state.recipes.find((recipe) => recipe.id === id);
  }

  function render() {
    if (!state) return;
    const [view, id, subview] = routeParts();
    const active = view || "home";
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

    app.innerHTML = renderShell(content, active);
  }

  function routeParts() {
    return location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  }

  function renderShell(content, active) {
    const status = connectedToDirectory ? "Dossier connecté" : "Sauvegarde locale";
    const dotClass = connectedToDirectory ? "connected" : "";
    const nav = [
      ["home", "#/", "Accueil"],
      ["recipes", "#/recipes", "Recettes"],
      ["pantry", "#/pantry", "Placard"],
      ["shopping", "#/shopping", "Courses"],
      ["plan", "#/plan", "Planning"],
      ["sync", "#/sync", "Synchro"],
    ];

    return `
      <div class="app-shell">
        <header class="topbar">
          <div class="topbar-inner">
            <a class="brand" href="#/" aria-label="Carnet repas">
              <span class="brand-mark">CR</span>
              <span>
                <h1>Carnet repas</h1>
                <p><span class="status-dot ${dotClass}"></span> ${escapeHtml(status)}</p>
              </span>
            </a>
            <nav class="nav" aria-label="Navigation">
              ${nav
                .map(([key, href, label]) => `<a class="${active === key ? "active" : ""}" href="${href}">${label}</a>`)
                .join("")}
            </nav>
          </div>
        </header>
        ${content}
      </div>
    `;
  }

  function renderHome() {
    const stats = completionStats();
    const priority = state.recipes
      .filter((recipe) => asArray(recipe.tags).map((tag) => tag.toLowerCase()).includes("à prioriser"))
      .slice(0, 6);
    const toComplete = state.recipes.filter(recipeIsToComplete).slice(0, 8);

    return `
      <section class="hero">
        <div class="hero-main">
          <h2>${stats.total} idées de repas prêtes à organiser.</h2>
          <p>${stats.toComplete} recettes attendent encore leurs ingrédients et leurs étapes.</p>
        </div>
        <aside class="sync-strip">
          <div class="sync-state">
            <span class="status-dot ${connectedToDirectory ? "connected" : ""}"></span>
            <strong>${connectedToDirectory ? "Synchro fichier active" : "Mode local"}</strong>
          </div>
          <p class="muted">Dernière sauvegarde : ${escapeHtml(formatDate(state.savedAt))}</p>
          <a class="button secondary" href="#/sync">Ouvrir la synchro</a>
        </aside>
      </section>

      <section class="stats-grid" aria-label="Statistiques">
        ${renderStat("Recettes", stats.total)}
        ${renderStat("Complétées", stats.complete)}
        ${renderStat("À compléter", stats.toComplete)}
        ${renderStat("Placard", stats.pantry)}
      </section>

      <section class="content-grid">
        <div>
          <div class="section-head">
            <div>
              <h2>À prioriser</h2>
              <p>Les idées marquées comme prioritaires dans le fichier Excel.</p>
            </div>
            <a class="button secondary" href="#/recipes">Voir tout</a>
          </div>
          <div class="recipe-grid">
            ${priority.length ? priority.map(renderRecipeCard).join("") : `<p class="empty">Aucune recette prioritaire.</p>`}
          </div>
        </div>
        <aside class="panel">
          <div class="section-head">
            <div>
              <h2>À compléter</h2>
              <p>${stats.toComplete} restantes</p>
            </div>
          </div>
          <ul class="compact-list">
            ${
              toComplete.length
                ? toComplete
                    .map(
                      (recipe) => `
                        <li>
                          <a class="button secondary" href="#/recipe/${escapeHtml(recipe.id)}/edit">
                            <span>${escapeHtml(recipe.title)}</span>
                            <span>Modifier</span>
                          </a>
                        </li>
                      `,
                    )
                    .join("")
                : `<li class="empty">Tout est complété.</li>`
            }
          </ul>
        </aside>
      </section>
    `;
  }

  function renderStat(label, value) {
    return `
      <div class="stat">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `;
  }

  function renderRecipes() {
    const chapters = getChapters();
    const recipes = getFilteredRecipes();

    return `
      <div class="page-head">
        <div>
          <h2>Recettes</h2>
          <p>${recipes.length} résultat${recipes.length > 1 ? "s" : ""}</p>
        </div>
        <a class="button" href="#/new">Nouvelle recette</a>
      </div>
      <div class="toolbar">
        <input id="recipe-search" type="search" placeholder="Rechercher" value="${escapeHtml(ui.search)}" />
        <select id="chapter-filter" aria-label="Chapitre">
          <option value="all">Tous les chapitres</option>
          ${chapters.map((chapter) => `<option value="${escapeHtml(chapter)}" ${ui.chapter === chapter ? "selected" : ""}>${escapeHtml(chapter)}</option>`).join("")}
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
    const tags = asArray(recipe.tags).slice(0, 3);
    const chapters = asArray(recipe.chapters).slice(0, 2);

    return `
      <a class="recipe-card" style="--card-accent:${escapeHtml(chapterColor(recipe))}" href="#/recipe/${escapeHtml(recipe.id)}">
        <div>
          <div class="badges">
            ${toComplete ? `<span class="badge warn">À compléter</span>` : `<span class="badge">Complétée</span>`}
            ${chapters.map((chapter) => `<span class="badge blue">${escapeHtml(chapter)}</span>`).join("")}
          </div>
          <h3>${escapeHtml(recipe.title)}</h3>
          <p>${escapeHtml(recipe.description || "Sans description.")}</p>
        </div>
        <div>
          <div class="meta-row">
            <span>${escapeHtml(formatTime(recipe.totalTimeMinutes))}</span>
            <span>${escapeHtml(recipe.servings)} portions</span>
          </div>
          <div class="badges" style="margin-top: 10px">
            ${tags.map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join("")}
          </div>
        </div>
      </a>
    `;
  }

  function renderRecipeDetail(recipe) {
    if (!recipe) return renderNotFound();
    const ingredients = asArray(recipe.ingredients);
    const steps = asArray(recipe.steps).filter((step) => step.text);
    const canShop = ingredients.length > 0;

    return `
      <div class="page-head">
        <div>
          <a class="button ghost" href="#/recipes">Retour</a>
          <h2 class="detail-title">${escapeHtml(recipe.title)}</h2>
          <div class="badges">
            ${recipeIsToComplete(recipe) ? `<span class="badge warn">À compléter</span>` : `<span class="badge">Complétée</span>`}
            ${asArray(recipe.chapters).map((chapter) => `<span class="badge blue">${escapeHtml(chapter)}</span>`).join("")}
          </div>
        </div>
        <div class="form-actions" style="margin-top: 0">
          <a class="button secondary" href="#/recipe/${escapeHtml(recipe.id)}/edit">Modifier</a>
          <button data-action="duplicate-recipe" data-id="${escapeHtml(recipe.id)}" class="secondary" type="button">Dupliquer</button>
          <button data-action="add-recipe-shopping" data-id="${escapeHtml(recipe.id)}" ${canShop ? "" : "disabled"} type="button">Courses</button>
        </div>
      </div>

      <section class="detail-layout">
        <div>
          <div class="panel">
            <p>${escapeHtml(recipe.description || "Sans description.")}</p>
            <div class="meta-row">
              <span>Préparation : ${escapeHtml(formatTime(recipe.prepTimeMinutes))}</span>
              <span>Cuisson : ${escapeHtml(formatTime(recipe.cookTimeMinutes))}</span>
              <span>Total : ${escapeHtml(formatTime(recipe.totalTimeMinutes))}</span>
              <span>${escapeHtml(recipe.servings)} portions</span>
            </div>
          </div>

          <div class="section-head" style="margin-top: 20px">
            <h2>Préparation</h2>
          </div>
          ${
            steps.length
              ? `<ol class="list step-list">${steps.map((step) => `<li><span>${escapeHtml(step.text)}</span></li>`).join("")}</ol>`
              : `<p class="empty">À renseigner.</p>`
          }
        </div>

        <aside>
          <div class="panel">
            <div class="section-head">
              <h2>Ingrédients</h2>
            </div>
            ${
              ingredients.length
                ? `<ul class="list">${ingredients.map((item) => `<li>${escapeHtml(formatIngredient(item))}</li>`).join("")}</ul>`
                : `<p class="empty">À renseigner.</p>`
            }
          </div>
          <div class="panel" style="margin-top: 16px">
            <div class="section-head">
              <h2>Notes</h2>
            </div>
            <p class="${recipe.personalNotes ? "" : "muted"}">${escapeHtml(recipe.personalNotes || "Aucune note.")}</p>
            <div class="badges">
              ${asArray(recipe.tags).map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join("")}
            </div>
          </div>
        </aside>
      </section>
    `;
  }

  function renderRecipeForm(recipe) {
    const isNew = !recipe;
    const draft = recipe || {
      id: "",
      title: "",
      description: "",
      servings: state.settings.defaultServings || 4,
      prepTimeMinutes: 0,
      cookTimeMinutes: 0,
      totalTimeMinutes: 0,
      difficulty: "easy",
      costLevel: "medium",
      season: "all_year",
      personalNotes: "",
      ingredients: [],
      steps: [],
      tags: [],
      chapters: [],
    };

    return `
      <div class="page-head">
        <div>
          <a class="button ghost" href="${isNew ? "#/recipes" : `#/recipe/${escapeHtml(draft.id)}`}">Retour</a>
          <h2>${isNew ? "Nouvelle recette" : `Modifier ${escapeHtml(draft.title)}`}</h2>
        </div>
      </div>

      <form id="recipe-form" class="panel" data-id="${escapeHtml(draft.id)}">
        <div class="form-grid">
          <label class="wide">
            Titre
            <input name="title" required value="${escapeHtml(draft.title)}" />
          </label>
          <label class="wide">
            Description
            <textarea name="description">${escapeHtml(draft.description)}</textarea>
          </label>
          <label>
            Portions
            <input name="servings" type="number" min="1" value="${escapeHtml(draft.servings)}" />
          </label>
          <label>
            Préparation (min)
            <input name="prepTimeMinutes" type="number" min="0" value="${escapeHtml(draft.prepTimeMinutes)}" />
          </label>
          <label>
            Cuisson (min)
            <input name="cookTimeMinutes" type="number" min="0" value="${escapeHtml(draft.cookTimeMinutes)}" />
          </label>
          <label>
            Total (min)
            <input name="totalTimeMinutes" type="number" min="0" value="${escapeHtml(draft.totalTimeMinutes)}" />
          </label>
          <label>
            Difficulté
            <select name="difficulty">
              ${option("easy", "Facile", draft.difficulty)}
              ${option("medium", "Moyen", draft.difficulty)}
              ${option("hard", "Technique", draft.difficulty)}
            </select>
          </label>
          <label>
            Coût
            <select name="costLevel">
              ${option("low", "Économique", draft.costLevel)}
              ${option("medium", "Moyen", draft.costLevel)}
              ${option("high", "Élevé", draft.costLevel)}
            </select>
          </label>
          <label class="wide">
            Chapitres
            <input name="chapters" value="${escapeHtml(asArray(draft.chapters).join(", "))}" />
          </label>
          <label class="wide">
            Tags
            <input name="tags" value="${escapeHtml(asArray(draft.tags).join(", "))}" />
          </label>
          <label class="wide">
            Ingrédients
            <textarea name="ingredients" spellcheck="true">${escapeHtml(formatIngredientsText(draft.ingredients))}</textarea>
          </label>
          <label class="wide">
            Étapes
            <textarea name="steps" spellcheck="true">${escapeHtml(formatStepsText(draft.steps))}</textarea>
          </label>
          <label class="wide">
            Notes
            <textarea name="personalNotes" spellcheck="true">${escapeHtml(draft.personalNotes)}</textarea>
          </label>
        </div>
        <div class="form-actions">
          ${isNew ? "" : `<button class="danger" type="button" data-action="delete-recipe" data-id="${escapeHtml(draft.id)}">Supprimer</button>`}
          <button class="secondary" type="button" data-action="auto-total">Calculer le total</button>
          <button type="submit">Enregistrer</button>
        </div>
      </form>
    `;
  }

  function option(value, label, selected) {
    return `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }

  function renderPantry() {
    const items = [...state.pantry].sort((a, b) => String(a.name).localeCompare(String(b.name), "fr"));
    return `
      <div class="page-head">
        <div>
          <h2>Placard</h2>
          <p>${items.length} ingrédient${items.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      <section class="content-grid">
        <div>
          <ul class="list">
            ${
              items.length
                ? items
                    .map(
                      (item) => `
                        <li class="line-item shopping-row">
                          <span></span>
                          <span>
                            <strong>${escapeHtml(item.name)}</strong>
                            <span class="muted">${escapeHtml([formatQuantity(item.quantity), item.unit, item.location].filter(Boolean).join(" · "))}</span>
                          </span>
                          <button class="secondary" data-action="delete-pantry" data-id="${escapeHtml(item.id)}" type="button">Retirer</button>
                        </li>
                      `,
                    )
                    .join("")
                : `<li class="empty">Placard vide.</li>`
            }
          </ul>
        </div>
        <aside class="panel">
          <div class="section-head">
            <h2>Ajouter</h2>
          </div>
          <form id="pantry-form" class="form-grid">
            <label class="wide">
              Nom
              <input name="name" required />
            </label>
            <label>
              Quantité
              <input name="quantity" type="number" min="0" step="0.1" />
            </label>
            <label>
              Unité
              <input name="unit" />
            </label>
            <label class="wide">
              Emplacement
              <input name="location" placeholder="frigo, placard..." />
            </label>
            <div class="form-actions wide">
              <button type="submit">Ajouter</button>
            </div>
          </form>
        </aside>
      </section>
    `;
  }

  function renderShopping() {
    const recipes = state.recipes.filter((recipe) => asArray(recipe.ingredients).length > 0);
    const shopping = state.shopping;
    return `
      <div class="page-head">
        <div>
          <h2>Courses</h2>
          <p>${shopping.length} ligne${shopping.length > 1 ? "s" : ""}</p>
        </div>
        <button class="secondary" data-action="clear-checked" type="button" ${shopping.some((item) => item.checked) ? "" : "disabled"}>Retirer cochés</button>
      </div>

      <section class="content-grid">
        <div>
          <ul class="list">
            ${
              shopping.length
                ? shopping
                    .map(
                      (item) => `
                        <li class="line-item shopping-row ${item.checked ? "done" : ""}">
                          <input data-action="toggle-shopping" data-id="${escapeHtml(item.id)}" type="checkbox" ${item.checked ? "checked" : ""} aria-label="Cocher" />
                          <span class="shopping-name">
                            <strong>${escapeHtml(item.name)}</strong>
                            <span class="muted">${escapeHtml([formatQuantity(item.quantity), item.unit, item.recipeTitle].filter(Boolean).join(" · "))}</span>
                          </span>
                          <button class="secondary" data-action="delete-shopping" data-id="${escapeHtml(item.id)}" type="button">Retirer</button>
                        </li>
                      `,
                    )
                    .join("")
                : `<li class="empty">Liste vide.</li>`
            }
          </ul>
        </div>
        <aside>
          <div class="panel">
            <div class="section-head">
              <h2>Depuis les recettes</h2>
            </div>
            <form id="shopping-recipes-form">
              <div class="check-grid">
                ${
                  recipes.length
                    ? recipes
                        .map(
                          (recipe) => `
                            <label class="check-pill">
                              <input type="checkbox" name="recipeIds" value="${escapeHtml(recipe.id)}" />
                              <span>${escapeHtml(recipe.title)}</span>
                            </label>
                          `,
                        )
                        .join("")
                    : `<p class="empty">Aucune recette avec ingrédients.</p>`
                }
              </div>
              <div class="form-actions">
                <button type="submit" ${recipes.length ? "" : "disabled"}>Ajouter aux courses</button>
              </div>
            </form>
          </div>
          <div class="panel" style="margin-top: 16px">
            <div class="section-head">
              <h2>Ajout rapide</h2>
            </div>
            <form id="shopping-form" class="form-grid">
              <label class="wide">
                Nom
                <input name="name" required />
              </label>
              <label>
                Quantité
                <input name="quantity" type="number" min="0" step="0.1" />
              </label>
              <label>
                Unité
                <input name="unit" />
              </label>
              <div class="form-actions wide">
                <button type="submit">Ajouter</button>
              </div>
            </form>
          </div>
        </aside>
      </section>
    `;
  }

  function renderPlan() {
    const recipes = [...state.recipes].sort((a, b) => a.title.localeCompare(b.title, "fr"));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return date;
    });

    return `
      <div class="page-head">
        <div>
          <h2>Planning</h2>
          <p>Les 7 prochains jours.</p>
        </div>
      </div>
      <div class="plan-grid">
        ${days.map((date) => renderDay(date, recipes)).join("")}
      </div>
    `;
  }

  function renderDay(date, recipes) {
    const iso = date.toISOString().slice(0, 10);
    return `
      <article class="day-card">
        <h3>${escapeHtml(formatShortDate(date))}</h3>
        ${renderPlanSelect(iso, "lunch", "Déjeuner", recipes)}
        ${renderPlanSelect(iso, "dinner", "Dîner", recipes)}
      </article>
    `;
  }

  function renderPlanSelect(date, meal, label, recipes) {
    const entry = state.mealPlan.find((item) => item.date === date && item.meal === meal);
    return `
      <label>
        ${label}
        <select data-action="set-plan" data-date="${escapeHtml(date)}" data-meal="${escapeHtml(meal)}">
          <option value="">Libre</option>
          ${recipes.map((recipe) => `<option value="${escapeHtml(recipe.id)}" ${entry?.recipeId === recipe.id ? "selected" : ""}>${escapeHtml(recipe.title)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function renderSync() {
    const supportsDirectory = "showDirectoryPicker" in window;
    return `
      <div class="page-head">
        <div>
          <h2>Synchro</h2>
          <p>Révision ${escapeHtml(state.rev)} · ${escapeHtml(formatDate(state.savedAt))}</p>
        </div>
      </div>

      <section class="settings-grid">
        <div class="panel">
          <div class="section-head">
            <h2>État</h2>
          </div>
          <dl class="kv">
            <div><dt>Mode</dt><dd>${connectedToDirectory ? "Dossier" : "Local"}</dd></div>
            <div><dt>Recettes</dt><dd>${state.recipes.length}</dd></div>
            <div><dt>Courses</dt><dd>${state.shopping.length}</dd></div>
            <div><dt>Planning</dt><dd>${state.mealPlan.length}</dd></div>
          </dl>
        </div>

        <div class="panel">
          <div class="section-head">
            <h2>Dossier</h2>
          </div>
          <p class="muted">${supportsDirectory ? "Disponible sur ce navigateur." : "Indisponible sur ce navigateur."}</p>
          <div class="form-actions">
            <button type="button" data-action="connect-directory" ${supportsDirectory ? "" : "disabled"}>${connectedToDirectory ? "Changer" : "Connecter"}</button>
            <button class="secondary" type="button" data-action="pull-directory" ${connectedToDirectory ? "" : "disabled"}>Charger</button>
            <button class="secondary" type="button" data-action="push-directory" ${connectedToDirectory ? "" : "disabled"}>Enregistrer</button>
            <button class="secondary" type="button" data-action="disconnect-directory" ${connectedToDirectory ? "" : "disabled"}>Déconnecter</button>
          </div>
        </div>

        <div class="panel">
          <div class="section-head">
            <h2>JSON</h2>
          </div>
          <div class="form-actions" style="justify-content: flex-start">
            <button class="secondary" type="button" data-action="export-json">Exporter</button>
            <label class="button secondary" for="import-json">Importer</label>
            <input class="sr-only" id="import-json" type="file" accept="application/json,.json" />
          </div>
          <label style="margin-top: 14px">
            URL publique
            <input id="remote-url" type="url" value="${escapeHtml(state.settings.remoteUrl || "")}" placeholder="https://..." />
          </label>
          <div class="form-actions">
            <button class="secondary" type="button" data-action="load-remote-url">Charger l’URL</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderNotFound() {
    return `
      <div class="panel">
        <h2>Page introuvable</h2>
        <p class="muted">La vue demandée n’existe pas.</p>
        <a class="button" href="#/">Accueil</a>
      </div>
    `;
  }

  function formatIngredient(item) {
    return [formatQuantity(item.quantity), item.unit, item.name].filter(Boolean).join(" ") + (item.notes ? ` · ${item.notes}` : "");
  }

  function formatIngredientsText(items) {
    return asArray(items).map(formatIngredientForEdit).join("\n");
  }

  function formatIngredientForEdit(item) {
    const main = [formatQuantity(item.quantity), item.unit, item.name].filter(Boolean).join(" ");
    return item.notes ? `${main} | ${item.notes}` : main;
  }

  function parseIngredientsText(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [main, notes] = line.split("|").map((part) => part.trim());
        const parts = main.split(/\s+/).filter(Boolean);
        let quantity = null;
        let unit = "";
        let name = main;

        const firstNumber = parts[0] ? Number(parts[0].replace(",", ".")) : NaN;
        if (Number.isFinite(firstNumber)) {
          quantity = firstNumber;
          if (parts[1] && KNOWN_UNITS.has(parts[1].toLowerCase())) {
            unit = parts[1];
            name = parts.slice(2).join(" ");
          } else {
            name = parts.slice(1).join(" ");
          }
        }

        return {
          id: uid("ingredient"),
          sortOrder: index,
          name: name || main,
          quantity,
          unit,
          notes: notes || null,
        };
      });
  }

  function formatStepsText(steps) {
    return asArray(steps)
      .filter((step) => step.text && step.text !== PLACEHOLDER_STEP)
      .map((step) => step.text)
      .join("\n");
  }

  function parseStepsText(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text, index) => ({
        id: uid("step"),
        sortOrder: index,
        text,
        timerMinutes: null,
        temperature: null,
        equipment: null,
        tip: null,
      }));
  }

  function splitList(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function handleRecipeSubmit(form) {
    const data = new FormData(form);
    const id = form.dataset.id;
    const existing = id ? recipeById(id) : null;
    const ingredients = parseIngredientsText(data.get("ingredients"));
    let steps = parseStepsText(data.get("steps"));
    let tags = splitList(data.get("tags"));
    const chapters = splitList(data.get("chapters"));

    if (!steps.length) {
      steps = [
        {
          id: uid("step"),
          sortOrder: 0,
          text: PLACEHOLDER_STEP,
          timerMinutes: null,
          temperature: null,
          equipment: null,
          tip: null,
        },
      ];
    }

    const isComplete = ingredients.length > 0 && steps.some((step) => step.text !== PLACEHOLDER_STEP);
    tags = tags.filter((tag) => tag.toLowerCase() !== "à compléter");
    if (!isComplete) tags.push("à compléter");
    tags = [...new Set(tags)];

    const prep = Number(data.get("prepTimeMinutes")) || 0;
    const cook = Number(data.get("cookTimeMinutes")) || 0;
    const total = Number(data.get("totalTimeMinutes")) || prep + cook;
    const title = String(data.get("title") || "").trim() || "Recette sans titre";

    const recipe = {
      ...(existing || {}),
      id: existing?.id || uid("recipe"),
      title,
      slug: existing?.slug || slugify(title),
      description: String(data.get("description") || "").trim(),
      servings: Number(data.get("servings")) || 4,
      prepTimeMinutes: prep,
      cookTimeMinutes: cook,
      totalTimeMinutes: total,
      difficulty: String(data.get("difficulty") || "easy"),
      costLevel: String(data.get("costLevel") || "medium"),
      season: existing?.season || "all_year",
      sourceType: existing?.sourceType || "personal",
      sourceName: existing?.sourceName || null,
      sourceUrl: existing?.sourceUrl || null,
      imageUrl: existing?.imageUrl || null,
      personalNotes: String(data.get("personalNotes") || "").trim(),
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      lastCookedAt: existing?.lastCookedAt || null,
      averageRating: existing?.averageRating || null,
      ingredients,
      steps,
      tags,
      chapters,
    };

    if (existing) {
      state.recipes = state.recipes.map((item) => (item.id === recipe.id ? recipe : item));
    } else {
      state.recipes.push(recipe);
    }

    ensureChapters(chapters);
    commitChange("Recette enregistrée");
    location.hash = `#/recipe/${recipe.id}`;
  }

  function ensureChapters(chapters) {
    const known = new Set(state.chapters.map((chapter) => chapter.title));
    chapters.forEach((title) => {
      if (!known.has(title)) {
        state.chapters.push({
          id: uid("chapter"),
          title,
          description: "",
          coverImageUrl: null,
          color: "#4d7c72",
          sortOrder: state.chapters.length,
        });
      }
    });
  }

  function addRecipeToShopping(recipeId) {
    const recipe = recipeById(recipeId);
    if (!recipe || !asArray(recipe.ingredients).length) {
      toast("Aucun ingrédient à ajouter");
      return;
    }
    recipe.ingredients.forEach((ingredient) => {
      state.shopping.push({
        id: uid("shop"),
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit || "",
        checked: false,
        recipeId: recipe.id,
        recipeTitle: recipe.title,
      });
    });
    commitChange("Ingrédients ajoutés aux courses");
  }

  function duplicateRecipe(recipeId) {
    const recipe = recipeById(recipeId);
    if (!recipe) return;
    const copy = {
      ...recipe,
      id: uid("recipe"),
      title: `${recipe.title} copie`,
      slug: slugify(`${recipe.title} copie`),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ingredients: asArray(recipe.ingredients).map((item, index) => ({ ...item, id: uid("ingredient"), sortOrder: index })),
      steps: asArray(recipe.steps).map((step, index) => ({ ...step, id: uid("step"), sortOrder: index })),
    };
    state.recipes.push(copy);
    commitChange("Recette dupliquée");
    location.hash = `#/recipe/${copy.id}/edit`;
  }

  function addShoppingItem(form) {
    const data = new FormData(form);
    state.shopping.push({
      id: uid("shop"),
      name: String(data.get("name") || "").trim(),
      quantity: Number(data.get("quantity")) || null,
      unit: String(data.get("unit") || "").trim(),
      checked: false,
      recipeId: null,
      recipeTitle: "",
    });
    form.reset();
    commitChange("Ligne ajoutée");
  }

  function addPantryItem(form) {
    const data = new FormData(form);
    state.pantry.push({
      id: uid("pantry"),
      name: String(data.get("name") || "").trim(),
      quantity: Number(data.get("quantity")) || null,
      unit: String(data.get("unit") || "").trim(),
      location: String(data.get("location") || "").trim(),
      expirationDate: null,
    });
    form.reset();
    commitChange("Ingrédient ajouté");
  }

  function setPlan(select) {
    const date = select.dataset.date;
    const meal = select.dataset.meal;
    const recipeId = select.value;
    state.mealPlan = state.mealPlan.filter((item) => !(item.date === date && item.meal === meal));
    if (recipeId) {
      state.mealPlan.push({
        id: uid("plan"),
        date,
        meal,
        recipeId,
      });
    }
    commitChange("Planning mis à jour");
  }

  function autoTotal() {
    const form = document.getElementById("recipe-form");
    if (!form) return;
    const prep = Number(form.elements.prepTimeMinutes.value) || 0;
    const cook = Number(form.elements.cookTimeMinutes.value) || 0;
    form.elements.totalTimeMinutes.value = prep + cook;
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = SHARED_FILE;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importJson(file) {
    if (!file) return;
    const text = await file.text();
    state = normalizeDoc(JSON.parse(text));
    state.savedAt = nowIso();
    state.savedBy = "Import JSON";
    saveLocal();
    scheduleSharedWrite();
    render();
    toast("JSON importé");
  }

  async function loadRemoteUrl() {
    const input = document.getElementById("remote-url");
    const url = input?.value.trim();
    if (!url) return;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("URL JSON inaccessible");
    state = normalizeDoc(await response.json());
    state.settings.remoteUrl = url;
    state.savedAt = nowIso();
    state.savedBy = "URL publique";
    saveLocal();
    scheduleSharedWrite();
    render();
    toast("URL chargée");
  }

  function openFsDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(DB_STORE);
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async function idbGet(key) {
    const db = await openFsDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const request = tx.objectStore(DB_STORE).get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      tx.oncomplete = () => db.close();
    });
  }

  async function idbSet(key, value) {
    const db = await openFsDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(value, key);
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    });
  }

  async function idbDelete(key) {
    const db = await openFsDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(key);
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    });
  }

  async function hasDirectoryPermission(handle, shouldRequest) {
    const options = { mode: "readwrite" };
    if ((await handle.queryPermission(options)) === "granted") return true;
    if (!shouldRequest) return false;
    return (await handle.requestPermission(options)) === "granted";
  }

  async function restoreDirectoryHandle() {
    if (!("showDirectoryPicker" in window)) return;
    try {
      const handle = await idbGet(HANDLE_KEY);
      if (!handle) return;
      if (await hasDirectoryPermission(handle, false)) {
        dirHandle = handle;
        connectedToDirectory = true;
        await pullFromDirectory(false);
      }
    } catch (error) {
      console.warn("Dossier non restauré", error);
    }
  }

  async function connectDirectory() {
    if (!("showDirectoryPicker" in window)) {
      toast("Dossier indisponible sur ce navigateur");
      return;
    }
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    if (!(await hasDirectoryPermission(handle, true))) {
      toast("Permission refusée");
      return;
    }
    dirHandle = handle;
    connectedToDirectory = true;
    await idbSet(HANDLE_KEY, handle);

    const shared = await readSharedFile();
    if (shared && Number(shared.rev) > Number(state.rev)) {
      state = normalizeDoc(shared);
      saveLocal();
      toast("Données chargées du dossier");
    } else {
      await writeSharedFile();
    }
    render();
  }

  async function readSharedFile() {
    if (!dirHandle) return null;
    try {
      const fileHandle = await dirHandle.getFileHandle(SHARED_FILE);
      const file = await fileHandle.getFile();
      return normalizeDoc(JSON.parse(await file.text()));
    } catch (error) {
      if (error.name === "NotFoundError") return null;
      throw error;
    }
  }

  async function writeSharedFile() {
    if (!dirHandle || !connectedToDirectory || writingSharedFile) return;
    writingSharedFile = true;
    try {
      if (!(await hasDirectoryPermission(dirHandle, true))) {
        connectedToDirectory = false;
        render();
        return;
      }
      const fileHandle = await dirHandle.getFileHandle(SHARED_FILE, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(state, null, 2));
      await writable.close();
    } finally {
      writingSharedFile = false;
    }
  }

  function scheduleSharedWrite() {
    if (!connectedToDirectory) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      writeSharedFile().catch((error) => {
        console.error(error);
        toast("Synchro fichier impossible");
      });
    }, 700);
  }

  async function pullFromDirectory(force) {
    if (!connectedToDirectory || !dirHandle) return;
    const shared = await readSharedFile();
    if (!shared) {
      if (force) {
        await writeSharedFile();
        toast("Fichier créé dans le dossier");
      }
      return;
    }
    if (force || Number(shared.rev) > Number(state.rev)) {
      state = normalizeDoc(shared);
      saveLocal();
      render();
      if (force) toast("Données chargées");
    }
  }

  async function pushToDirectory() {
    await writeSharedFile();
    toast("Données enregistrées");
    render();
  }

  async function disconnectDirectory() {
    dirHandle = null;
    connectedToDirectory = false;
    await idbDelete(HANDLE_KEY);
    render();
    toast("Dossier déconnecté");
  }

  function startSharedPoll() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (connectedToDirectory && !writingSharedFile) {
        pullFromDirectory(false).catch((error) => console.warn("Poll synchro", error));
      }
    }, 15000);
  }

  app.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    try {
      if (action === "reset-filters") {
        ui.search = "";
        ui.chapter = "all";
        ui.status = "all";
        render();
      }
      if (action === "auto-total") autoTotal();
      if (action === "add-recipe-shopping") addRecipeToShopping(target.dataset.id);
      if (action === "duplicate-recipe") duplicateRecipe(target.dataset.id);
      if (action === "delete-recipe") {
        state.recipes = state.recipes.filter((recipe) => recipe.id !== target.dataset.id);
        commitChange("Recette supprimée");
        location.hash = "#/recipes";
      }
      if (action === "delete-pantry") {
        state.pantry = state.pantry.filter((item) => item.id !== target.dataset.id);
        commitChange("Ingrédient retiré");
      }
      if (action === "delete-shopping") {
        state.shopping = state.shopping.filter((item) => item.id !== target.dataset.id);
        commitChange("Ligne retirée");
      }
      if (action === "clear-checked") {
        state.shopping = state.shopping.filter((item) => !item.checked);
        commitChange("Courses cochées retirées");
      }
      if (action === "export-json") exportJson();
      if (action === "connect-directory") await connectDirectory();
      if (action === "pull-directory") await pullFromDirectory(true);
      if (action === "push-directory") await pushToDirectory();
      if (action === "disconnect-directory") await disconnectDirectory();
      if (action === "load-remote-url") await loadRemoteUrl();
    } catch (error) {
      console.error(error);
      toast(error.message || "Action impossible");
    }
  });

  app.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    if (form.id === "recipe-form") handleRecipeSubmit(form);
    if (form.id === "pantry-form") addPantryItem(form);
    if (form.id === "shopping-form") addShoppingItem(form);
    if (form.id === "shopping-recipes-form") {
      const selected = new FormData(form).getAll("recipeIds");
      selected.forEach(addRecipeToShopping);
    }
  });

  app.addEventListener("input", (event) => {
    if (event.target.id === "recipe-search") {
      ui.search = event.target.value;
      render();
    }
  });

  app.addEventListener("change", async (event) => {
    const target = event.target;
    if (target.id === "chapter-filter") {
      ui.chapter = target.value;
      render();
    }
    if (target.id === "status-filter") {
      ui.status = target.value;
      render();
    }
    if (target.dataset.action === "toggle-shopping") {
      const item = state.shopping.find((entry) => entry.id === target.dataset.id);
      if (item) {
        item.checked = target.checked;
        commitChange("Courses mises à jour");
      }
    }
    if (target.dataset.action === "set-plan") {
      setPlan(target);
    }
    if (target.id === "import-json") {
      try {
        await importJson(target.files?.[0]);
      } catch (error) {
        console.error(error);
        toast("Import impossible");
      }
    }
  });

  window.addEventListener("hashchange", render);

  async function init() {
    try {
      state = await loadState();
      await restoreDirectoryHandle();
      render();
      startSharedPoll();
    } catch (error) {
      console.error(error);
      app.innerHTML = `
        <div class="app-shell">
          <div class="panel">
            <h1>Carnet repas</h1>
            <p class="muted">${escapeHtml(error.message || "Chargement impossible.")}</p>
          </div>
        </div>
      `;
    }

    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  init();
})();
