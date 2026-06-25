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

  /* ====================================================================== *
   * RÉFÉRENTIEL D'ALIMENTS (valeurs caloriques) — graine livrée avec l'app.
   * kcal100 = kcal pour 100 g. g = grammes par pièce/unité. cs/cc = grammes
   * par cuillère à soupe / à café. d = densité (g par ml) pour les liquides.
   * Valeurs indicatives (proches CIQUAL) pour une *estimation*.
   * ====================================================================== */
  function food(id, name, aisle, kcal100, opts) {
    const o = opts || {};
    return {
      id, name, aisle, kcal100,
      aliases: o.aliases || [],
      gPerPiece: o.g ?? null,
      gPerCs: o.cs ?? null,
      gPerCc: o.cc ?? null,
      density: o.d ?? null,
      builtin: true,
    };
  }
  const FOOD_SEED = [
    // — Épicerie sucrée / pâtisserie —
    food("fd_farine", "Farine", "Épicerie salée", 364, { aliases: ["farine de blé", "farine t45", "farine t55", "farine t65", "farine de ble"], cs: 9, cc: 3 }),
    food("fd_maizena", "Maïzena", "Épicerie salée", 350, { aliases: ["fécule", "fecule", "fécule de maïs", "amidon"], cs: 8, cc: 3 }),
    food("fd_sucre", "Sucre", "Épicerie sucrée", 400, { aliases: ["sucre en poudre", "sucre semoule", "sucre blanc"], cs: 12, cc: 4 }),
    food("fd_sucre_glace", "Sucre glace", "Épicerie sucrée", 398, { aliases: ["sucre glace"], cs: 8, cc: 3 }),
    food("fd_cassonade", "Cassonade", "Épicerie sucrée", 380, { aliases: ["sucre roux", "vergeoise"], cs: 12, cc: 4 }),
    food("fd_sucre_vanille", "Sucre vanillé", "Épicerie sucrée", 390, { aliases: ["sucre vanille"], g: 7 }),
    food("fd_levure_chim", "Levure chimique", "Épicerie sucrée", 70, { aliases: ["levure", "poudre à lever", "bicarbonate"], cc: 4, g: 11 }),
    food("fd_levure_boul", "Levure de boulanger", "Épicerie sucrée", 105, { aliases: ["levure fraîche", "levure sèche"], g: 7 }),
    food("fd_cacao", "Cacao en poudre", "Épicerie sucrée", 350, { aliases: ["cacao", "chocolat en poudre"], cs: 7, cc: 3 }),
    food("fd_choc_noir", "Chocolat noir", "Épicerie sucrée", 540, { aliases: ["chocolat", "chocolat pâtissier", "chocolat patissier"] }),
    food("fd_choc_lait", "Chocolat au lait", "Épicerie sucrée", 535, {}),
    food("fd_pepites", "Pépites de chocolat", "Épicerie sucrée", 500, { aliases: ["pepites de chocolat"] }),
    food("fd_miel", "Miel", "Épicerie sucrée", 304, { aliases: ["miel"], d: 1.4, cs: 21, cc: 7 }),
    food("fd_sirop_erable", "Sirop d'érable", "Épicerie sucrée", 260, { aliases: ["sirop d erable", "sirop d’érable"], d: 1.32 }),
    food("fd_confiture", "Confiture", "Épicerie sucrée", 270, { aliases: ["gelée", "marmelade"], cs: 20 }),
    food("fd_pate_tartiner", "Pâte à tartiner", "Épicerie sucrée", 540, { aliases: ["nutella"], cs: 20 }),
    food("fd_poudre_amande", "Poudre d'amandes", "Épicerie sucrée", 620, { aliases: ["poudre d amandes", "poudre d’amandes", "poudre d amande"] }),
    food("fd_amande", "Amandes", "Épicerie sucrée", 600, { aliases: ["amande"] }),
    food("fd_noisette", "Noisettes", "Épicerie sucrée", 630, { aliases: ["noisette"] }),
    food("fd_noix", "Noix", "Épicerie sucrée", 650, {}),
    food("fd_coco_rape", "Noix de coco râpée", "Épicerie sucrée", 660, { aliases: ["noix de coco", "coco râpée", "coco rapee"] }),
    food("fd_flocons_avoine", "Flocons d'avoine", "Épicerie sucrée", 370, { aliases: ["flocons d avoine", "avoine"] }),
    food("fd_biscuit", "Biscuits", "Épicerie sucrée", 470, { aliases: ["spéculoos", "speculoos", "petit-beurre", "sablé"] }),
    food("fd_vanille", "Extrait de vanille", "Épicerie sucrée", 12, { aliases: ["vanille", "arôme vanille"], cc: 4 }),
    // — Crèmerie & œufs —
    food("fd_lait", "Lait", "Crèmerie & œufs", 47, { aliases: ["lait entier", "lait demi-écrémé", "lait demi ecreme"], d: 1.03 }),
    food("fd_creme_epaisse", "Crème fraîche", "Crèmerie & œufs", 290, { aliases: ["crème", "creme fraiche", "crème épaisse", "creme epaisse"], cs: 15, d: 1 }),
    food("fd_creme_liquide", "Crème liquide", "Crèmerie & œufs", 200, { aliases: ["crème liquide", "creme liquide", "crème fleurette"], d: 1 }),
    food("fd_beurre", "Beurre", "Crèmerie & œufs", 750, { aliases: ["beurre doux", "beurre demi-sel"], cs: 14, cc: 5 }),
    food("fd_margarine", "Margarine", "Crèmerie & œufs", 720, {}),
    food("fd_yaourt", "Yaourt", "Crèmerie & œufs", 60, { aliases: ["yaourt nature", "yogourt"], g: 125 }),
    food("fd_fromage_blanc", "Fromage blanc", "Crèmerie & œufs", 75, { aliases: ["fromage blanc", "petit suisse"] }),
    food("fd_oeuf", "Œuf", "Crèmerie & œufs", 145, { aliases: ["oeuf", "œufs", "oeufs", "oeuf entier"], g: 50 }),
    food("fd_jaune", "Jaune d'œuf", "Crèmerie & œufs", 322, { aliases: ["jaune d oeuf", "jaune d’œuf", "jaunes d oeufs", "jaune"], g: 18 }),
    food("fd_blanc", "Blanc d'œuf", "Crèmerie & œufs", 52, { aliases: ["blanc d oeuf", "blanc d’œuf", "blancs d oeufs", "blancs en neige", "blanc"], g: 33 }),
    food("fd_parmesan", "Parmesan", "Crèmerie & œufs", 400, { aliases: ["parmesan râpé", "grana"], cs: 6 }),
    food("fd_gruyere", "Gruyère", "Crèmerie & œufs", 360, { aliases: ["emmental", "fromage râpé", "fromage rape", "gruyère râpé"], cs: 7 }),
    food("fd_comte", "Comté", "Crèmerie & œufs", 410, { aliases: ["comte"] }),
    food("fd_mozza", "Mozzarella", "Crèmerie & œufs", 280, { aliases: ["mozzarella"], g: 125 }),
    food("fd_ricotta", "Ricotta", "Crèmerie & œufs", 150, {}),
    food("fd_mascarpone", "Mascarpone", "Crèmerie & œufs", 355, {}),
    food("fd_feta", "Feta", "Crèmerie & œufs", 260, {}),
    food("fd_chevre", "Chèvre", "Crèmerie & œufs", 290, { aliases: ["fromage de chèvre", "buche de chevre"] }),
    // — Boucherie & poisson —
    food("fd_poulet", "Poulet", "Boucherie & poisson", 120, { aliases: ["blanc de poulet", "escalope de poulet", "filet de poulet", "cuisse de poulet"] }),
    food("fd_boeuf", "Bœuf", "Boucherie & poisson", 180, { aliases: ["boeuf", "steak", "bavette", "rumsteck"] }),
    food("fd_boeuf_hache", "Bœuf haché", "Boucherie & poisson", 220, { aliases: ["boeuf hache", "steak haché", "steak hache", "viande hachée", "viande hachee"] }),
    food("fd_porc", "Porc", "Boucherie & poisson", 240, { aliases: ["côte de porc", "filet mignon", "échine"] }),
    food("fd_veau", "Veau", "Boucherie & poisson", 170, {}),
    food("fd_agneau", "Agneau", "Boucherie & poisson", 230, { aliases: ["gigot", "côte d agneau"] }),
    food("fd_dinde", "Dinde", "Boucherie & poisson", 110, { aliases: ["escalope de dinde", "blanc de dinde"] }),
    food("fd_saucisse", "Saucisse", "Boucherie & poisson", 290, { aliases: ["chipolata", "merguez"], g: 70 }),
    food("fd_lardon", "Lardons", "Boucherie & poisson", 280, { aliases: ["lardon", "poitrine fumée"] }),
    food("fd_jambon", "Jambon", "Boucherie & poisson", 120, { aliases: ["jambon blanc", "tranche de jambon"], g: 40 }),
    food("fd_bacon", "Bacon", "Boucherie & poisson", 250, { g: 12 }),
    food("fd_chorizo", "Chorizo", "Boucherie & poisson", 450, {}),
    food("fd_saumon", "Saumon", "Boucherie & poisson", 200, { aliases: ["pavé de saumon", "filet de saumon", "saumon fumé"], g: 130 }),
    food("fd_thon", "Thon", "Boucherie & poisson", 130, { aliases: ["thon en boîte", "thon au naturel"] }),
    food("fd_cabillaud", "Cabillaud", "Boucherie & poisson", 80, { aliases: ["colin", "merlu", "lieu", "dos de cabillaud"] }),
    food("fd_crevette", "Crevettes", "Boucherie & poisson", 90, { aliases: ["crevette", "gambas"] }),
    food("fd_canard", "Magret de canard", "Boucherie & poisson", 330, { aliases: ["magret", "canard"] }),
    // — Fruits & légumes —
    food("fd_tomate", "Tomate", "Fruits & légumes", 18, { aliases: ["tomates"], g: 120 }),
    food("fd_oignon", "Oignon", "Fruits & légumes", 40, { aliases: ["oignons", "oignon rouge"], g: 110 }),
    food("fd_ail", "Ail", "Fruits & légumes", 140, { aliases: ["gousse d ail", "gousses d ail", "gousse d’ail"], g: 5 }),
    food("fd_echalote", "Échalote", "Fruits & légumes", 72, { aliases: ["echalote", "échalotes"], g: 30 }),
    food("fd_carotte", "Carotte", "Fruits & légumes", 35, { aliases: ["carottes"], g: 70 }),
    food("fd_pdt", "Pomme de terre", "Fruits & légumes", 80, { aliases: ["pommes de terre", "patate"], g: 150 }),
    food("fd_patate_douce", "Patate douce", "Fruits & légumes", 86, {}),
    food("fd_courgette", "Courgette", "Fruits & légumes", 17, { aliases: ["courgettes"], g: 200 }),
    food("fd_aubergine", "Aubergine", "Fruits & légumes", 25, { aliases: ["aubergines"], g: 250 }),
    food("fd_poivron", "Poivron", "Fruits & légumes", 25, { aliases: ["poivrons"], g: 150 }),
    food("fd_champignon", "Champignons", "Fruits & légumes", 22, { aliases: ["champignon", "champignon de paris"], g: 15 }),
    food("fd_brocoli", "Brocoli", "Fruits & légumes", 34, {}),
    food("fd_chou_fleur", "Chou-fleur", "Fruits & légumes", 25, { aliases: ["chou fleur"] }),
    food("fd_epinard", "Épinards", "Fruits & légumes", 23, { aliases: ["epinards", "épinard"] }),
    food("fd_salade", "Salade", "Fruits & légumes", 15, { aliases: ["laitue", "roquette", "mâche", "mache"] }),
    food("fd_concombre", "Concombre", "Fruits & légumes", 12, { g: 300 }),
    food("fd_haricot_vert", "Haricots verts", "Fruits & légumes", 31, { aliases: ["haricot vert"] }),
    food("fd_petit_pois", "Petits pois", "Fruits & légumes", 80, { aliases: ["petit pois", "petits pois surgelés"] }),
    food("fd_poireau", "Poireau", "Fruits & légumes", 30, { aliases: ["poireaux"], g: 150 }),
    food("fd_courge", "Courge", "Fruits & légumes", 26, { aliases: ["potiron", "potimarron", "butternut"] }),
    food("fd_gingembre", "Gingembre", "Fruits & légumes", 80, {}),
    food("fd_citron", "Citron", "Fruits & légumes", 30, { aliases: ["jus de citron"], g: 100 }),
    food("fd_citron_vert", "Citron vert", "Fruits & légumes", 30, { aliases: ["lime"], g: 70 }),
    food("fd_orange", "Orange", "Fruits & légumes", 47, { aliases: ["oranges", "jus d orange"], g: 150 }),
    food("fd_pomme", "Pomme", "Fruits & légumes", 52, { aliases: ["pommes"], g: 150 }),
    food("fd_banane", "Banane", "Fruits & légumes", 90, { aliases: ["bananes"], g: 120 }),
    food("fd_poire", "Poire", "Fruits & légumes", 57, { aliases: ["poires"], g: 160 }),
    food("fd_fraise", "Fraises", "Fruits & légumes", 33, { aliases: ["fraise"] }),
    food("fd_framboise", "Framboises", "Fruits & légumes", 50, { aliases: ["framboise"] }),
    food("fd_myrtille", "Myrtilles", "Fruits & légumes", 57, { aliases: ["myrtille"] }),
    food("fd_avocat", "Avocat", "Fruits & légumes", 160, { g: 170 }),
    food("fd_mangue", "Mangue", "Fruits & légumes", 60, { g: 200 }),
    food("fd_ananas", "Ananas", "Fruits & légumes", 50, {}),
    food("fd_persil", "Persil", "Fruits & légumes", 36, { aliases: ["basilic", "coriandre", "menthe", "ciboulette", "herbes"] }),
    // — Épicerie salée —
    food("fd_riz", "Riz", "Épicerie salée", 350, { aliases: ["riz basmati", "riz blanc", "riz complet"] }),
    food("fd_pates", "Pâtes", "Épicerie salée", 360, { aliases: ["pâte", "spaghetti", "penne", "tagliatelle", "macaroni", "coquillettes"] }),
    food("fd_semoule", "Semoule", "Épicerie salée", 360, { aliases: ["couscous"] }),
    food("fd_lentille", "Lentilles", "Épicerie salée", 335, { aliases: ["lentille"] }),
    food("fd_pois_chiche", "Pois chiches", "Épicerie salée", 140, { aliases: ["pois chiche"] }),
    food("fd_haricot_rouge", "Haricots rouges", "Épicerie salée", 120, { aliases: ["haricot rouge"] }),
    food("fd_quinoa", "Quinoa", "Épicerie salée", 360, {}),
    food("fd_boulgour", "Boulgour", "Épicerie salée", 350, { aliases: ["boulghour"] }),
    food("fd_huile_olive", "Huile d'olive", "Épicerie salée", 900, { aliases: ["huile d olive", "huile d’olive"], d: 0.91, cs: 13, cc: 5 }),
    food("fd_huile", "Huile", "Épicerie salée", 900, { aliases: ["huile de tournesol", "huile végétale", "huile vegetale"], d: 0.92, cs: 13, cc: 5 }),
    food("fd_vinaigre", "Vinaigre", "Épicerie salée", 20, { aliases: ["vinaigre de cidre", "vinaigre de vin"], d: 1.01, cs: 15 }),
    food("fd_balsamique", "Vinaigre balsamique", "Épicerie salée", 90, { aliases: ["balsamique"], d: 1.05, cs: 16 }),
    food("fd_soja", "Sauce soja", "Épicerie salée", 60, { aliases: ["sauce soja", "soja"], d: 1.1, cs: 16 }),
    food("fd_moutarde", "Moutarde", "Épicerie salée", 150, { cs: 16, cc: 5 }),
    food("fd_mayo", "Mayonnaise", "Épicerie salée", 700, { cs: 15 }),
    food("fd_ketchup", "Ketchup", "Épicerie salée", 110, { cs: 17 }),
    food("fd_concentre", "Concentré de tomate", "Épicerie salée", 80, { aliases: ["concentre de tomate"], cs: 16 }),
    food("fd_tomate_pelee", "Tomates pelées", "Épicerie salée", 30, { aliases: ["tomates pelees", "tomate concassée", "tomates concassées", "passata", "coulis de tomate"] }),
    food("fd_lait_coco", "Lait de coco", "Épicerie salée", 200, { aliases: ["lait de coco"], d: 0.98 }),
    food("fd_olive", "Olives", "Épicerie salée", 150, { aliases: ["olive"] }),
    food("fd_mais", "Maïs", "Épicerie salée", 90, { aliases: ["mais"] }),
    food("fd_chapelure", "Chapelure", "Épicerie salée", 380, { cs: 8 }),
    food("fd_polenta", "Polenta", "Épicerie salée", 360, { aliases: ["semoule de maïs"] }),
    food("fd_bouillon", "Bouillon", "Épicerie salée", 10, { aliases: ["bouillon cube", "cube de bouillon", "fond de veau"] }),
    food("fd_sel", "Sel", "Épicerie salée", 0, { aliases: ["fleur de sel", "gros sel"], cc: 6 }),
    food("fd_poivre", "Poivre", "Épicerie salée", 250, { cc: 3 }),
    // — Boulangerie —
    food("fd_pain", "Pain", "Boulangerie", 260, { aliases: ["baguette", "pain de mie"] }),
    food("fd_pate_feuille", "Pâte feuilletée", "Boulangerie", 380, { aliases: ["pate feuilletee"], g: 230 }),
    food("fd_pate_brisee", "Pâte brisée", "Boulangerie", 350, { aliases: ["pate brisee"], g: 230 }),
    food("fd_pate_sablee", "Pâte sablée", "Boulangerie", 440, { aliases: ["pate sablee"], g: 230 }),
    food("fd_pate_pizza", "Pâte à pizza", "Boulangerie", 270, { aliases: ["pate a pizza"], g: 260 }),
    food("fd_tortilla", "Tortilla", "Boulangerie", 300, { aliases: ["wrap", "galette de blé"], g: 50 }),
    food("fd_brioche", "Brioche", "Boulangerie", 330, {}),
    // — Boissons —
    food("fd_eau", "Eau", "Boissons", 0, { d: 1 }),
    food("fd_vin_blanc", "Vin blanc", "Boissons", 82, { aliases: ["vin"], d: 0.99 }),
    food("fd_vin_rouge", "Vin rouge", "Boissons", 85, { d: 0.99 }),
    food("fd_biere", "Bière", "Boissons", 45, { aliases: ["biere"], d: 1 }),
  ];

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
    apple: '<path d="M12 8c-1.6-2.2-4.2-2.6-5.8-1.1C4.4 8.6 5 13 7.6 16c1 1.2 2 2 4.4 2s3.4-.8 4.4-2c2.6-3 3.2-7.4 1.4-9.1-1.6-1.5-4.2-1.1-5.8 1.1z"/><path d="M12 8c0-2 .6-3.6 2.6-4.6"/>',
    plate: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/>',
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

  const ui = { search: "", chapter: "all", status: "all", planWeek: 0, foodSearch: "", editFood: null };

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

    // Référentiel d'aliments : on conserve les entrées existantes (y compris
    // les modifications de l'utilisateur) et on complète avec les aliments de
    // base manquants, sauf ceux que l'utilisateur a explicitement supprimés.
    const removedFoods = asArray(base.removedFoods);
    const existingFoods = asArray(base.foods);
    const haveFoodIds = new Set(existingFoods.map((f) => f.id));
    const seededFoods = FOOD_SEED
      .filter((f) => !haveFoodIds.has(f.id) && !removedFoods.includes(f.id))
      .map((f) => ({ ...f, aliases: [...f.aliases] }));
    const foods = [...existingFoods, ...seededFoods];

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
      foods,
      removedFoods,
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

  /* ====================================================================== *
   * NUTRITION — estimation des calories par plat
   * ====================================================================== */
  function allFoods() {
    return asArray(state.foods);
  }
  function foodById(id) {
    return allFoods().find((f) => f.id === id) || null;
  }
  const FOOD_ARTICLES = /^(de |d'|du |des |aux |au |a |la |le |les |l'|un |une |quelque[s]? |environ )/;
  // Nettoie un nom d'ingrédient pour la mise en correspondance avec le référentiel.
  function normFood(s) {
    let n = normalizeName(s).replace(/['’`]/g, "'");
    let prev;
    do { prev = n; n = n.replace(FOOD_ARTICLES, ""); } while (n !== prev);
    return n.trim();
  }
  // Trouve l'aliment du référentiel correspondant le mieux à un nom libre.
  function matchFood(name) {
    const n = normFood(name);
    if (!n || n.length < 2) return null;
    let best = null, bestScore = 0;
    for (const f of allFoods()) {
      const keys = [f.name, ...asArray(f.aliases)].map(normFood).filter(Boolean);
      for (const k of keys) {
        let score = 0;
        if (n === k) score = 1000 + k.length;
        else if (n.includes(k)) score = k.length;          // l'ingrédient contient le mot-clé
        else if (k.includes(n)) score = Math.max(1, n.length - 1);
        if (score > bestScore) { bestScore = score; best = f; }
      }
    }
    return bestScore >= 3 ? best : null; // évite les correspondances trop courtes/hasardeuses
  }

  function isUnitToken(tok) {
    return KNOWN_UNITS.has(String(tok || "").toLowerCase().replace(/[.,;:]+$/, ""));
  }
  // Décompose « 200 g de farine | tamisée » → { quantity, unit, name, note }.
  function parseIngredientLine(line) {
    const [mainRaw, note] = String(line || "").split("|").map((s) => s.trim());
    const main = mainRaw || "";
    const parts = main.split(/\s+/).filter(Boolean);
    let quantity = null, unit = "", name = main;
    const first = parts[0] || "";
    const numMatch = first.match(/^(\d+(?:[.,]\d+)?)(?:\/(\d+))?$/);
    if (numMatch) {
      quantity = numMatch[2]
        ? Number(numMatch[1].replace(",", ".")) / Number(numMatch[2])
        : Number(numMatch[1].replace(",", "."));
      let rest = parts.slice(1);
      if (rest[0] && isUnitToken(rest[0])) { unit = rest[0]; rest = rest.slice(1); }
      name = rest.join(" ");
    }
    return { quantity, unit, name: name || main, note: note || null };
  }

  const VOLUME_ML = { ml: 1, cl: 10, dl: 100, l: 1000, verre: 200, verres: 200 };
  const PIECE_UNITS = new Set([
    "", "pièce", "pièces", "piece", "pieces", "gousse", "gousses", "tranche", "tranches",
    "filet", "filets", "feuille", "feuilles", "branche", "branches", "sachet", "sachets",
    "boîte", "boîtes", "boite", "boites", "pot", "pots", "pincée", "pincées", "pincee",
  ]);
  // Convertit une quantité + unité en grammes pour un aliment donné (ou null).
  function toGrams(qty, unit, food) {
    if (!Number.isFinite(qty)) return null;
    const u = String(unit || "").toLowerCase().replace(/[.,;:]+$/, "");
    if (["g", "gr", "gramme", "grammes"].includes(u)) return qty;
    if (u === "kg") return qty * 1000;
    if (u === "mg") return qty / 1000;
    if (VOLUME_ML[u] != null) return qty * VOLUME_ML[u] * (food?.density ?? 1);
    const isSoup = ["cs", "càs", "c.à.s", "cuillère", "cuillères", "cuillerée", "cuillerées", "cuilleree", "cuillerees"].includes(u);
    const isTea = ["cc", "càc", "c.à.c"].includes(u);
    if (isSoup) return qty * (food?.gPerCs ?? 15 * (food?.density ?? 0.6));
    if (isTea) return qty * (food?.gPerCc ?? 5 * (food?.density ?? 0.6));
    if (PIECE_UNITS.has(u)) return food?.gPerPiece != null ? qty * food.gPerPiece : null;
    return null;
  }

  // kcal d'un ingrédient (objet recette), ou null si non estimable.
  function ingredientKcal(item) {
    let p;
    if (item.quantity != null && item.quantity !== "") {
      p = { quantity: Number(item.quantity), unit: item.unit || "", name: item.name || ingredientText(item) };
    } else {
      p = parseIngredientLine(ingredientText(item));
    }
    if (!Number.isFinite(p.quantity)) return null;
    const food = (item.foodId && foodById(item.foodId)) || matchFood(p.name);
    if (!food) return null;
    const grams = toGrams(p.quantity, p.unit, food);
    if (grams == null) return null;
    return { kcal: (grams * food.kcal100) / 100, food, grams };
  }

  // Estimation calorique d'une recette : total + par portion + couverture.
  function recipeCalories(recipe) {
    const items = asArray(recipe.ingredients);
    let total = 0, counted = 0;
    for (const it of items) {
      const r = ingredientKcal(it);
      if (r) { total += r.kcal; counted++; }
    }
    const servings = Number(recipe.servings) || 1;
    return {
      total, perPortion: total / servings, counted, tracked: items.length,
      complete: items.length > 0 && counted === items.length,
    };
  }
  function kcalBadge(recipe) {
    const est = recipeCalories(recipe);
    if (!est.counted) return "";
    return `<span>${icon("flame")} ≈ ${Math.round(est.perPortion)} kcal/portion${est.complete ? "" : " <span class=\"muted\">~</span>"}</span>`;
  }
  // Ligne d'estimation affichée sous le champ ingrédients du formulaire.
  function kcalLineHtml(ingredients, servings) {
    const est = recipeCalories({ ingredients, servings });
    if (!est.counted) {
      return `<span class="muted small">${icon("flame")} Indique des quantités (ex. « 200 g de farine ») pour estimer les calories.</span>`;
    }
    return `<span class="kcal-pill">${icon("flame")} ≈ ${Math.round(est.perPortion)} kcal/portion</span>
      <span class="muted small">${est.complete ? "tous les ingrédients reconnus" : `${est.counted}/${est.tracked} ingrédients reconnus`} · <a href="#/foods">gérer les aliments</a></span>`;
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
      renderCookTimers();
      if (cook && cook.timers.some((t) => !t.done && t.remaining > 0)) cookEnsureTicker();
      return;
    }
    // En quittant le mode cuisson, on arrête les minuteurs en cours.
    if (cook) { cookClearAll(); cook = null; }

    let content = "";
    if (!view) content = renderHome();
    else if (view === "recipes") content = renderRecipes();
    else if (view === "recipe" && id && subview === "edit") content = renderRecipeForm(recipeById(id));
    else if (view === "recipe" && id) content = renderRecipeDetail(recipeById(id));
    else if (view === "new") content = renderRecipeForm(null);
    else if (view === "pantry") content = renderPantry();
    else if (view === "shopping") content = renderShopping();
    else if (view === "plan") content = renderPlan();
    else if (view === "foods") content = renderFoods();
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
    ["foods", "#/foods", "Aliments", "apple"],
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
            ${kcalBadge(recipe)}
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
    const cal = recipeCalories(recipe);
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
            ${cal.counted ? `<span>${icon("flame")} ≈ ${Math.round(cal.perPortion)} kcal/portion</span>` : ""}
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
            ${cal.counted ? `
            <div class="kcal-summary">
              <div class="kcal-figure"><strong>${Math.round(cal.perPortion)}</strong><span>kcal / portion</span></div>
              <div class="kcal-figure"><strong>${Math.round(cal.perPortion * target)}</strong><span>kcal pour ${escapeHtml(target)} portion${target > 1 ? "s" : ""}</span></div>
              <p class="muted small kcal-note">${icon("flame")} Estimation ${cal.complete ? "" : `· ${cal.counted}/${cal.tracked} ingrédients reconnus`}</p>
            </div>` : ""}
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
          <div class="wide kcal-estimate" id="kcal-estimate">${kcalLineHtml(asArray(draft.ingredients), draft.servings)}</div>
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

  /* ------------------------- Aliments (référentiel) ----------------------- */
  function foodsListHtml() {
    const q = normalizeName(ui.foodSearch || "");
    const foods = allFoods().filter((f) => {
      if (!q) return true;
      return normalizeName([f.name, ...asArray(f.aliases)].join(" ")).includes(q);
    });
    if (!foods.length) return `<p class="empty">Aucun aliment ne correspond.</p>`;
    const byAisle = new Map();
    for (const f of foods) {
      const a = f.aisle || "Autres";
      if (!byAisle.has(a)) byAisle.set(a, []);
      byAisle.get(a).push(f);
    }
    return [...AISLE_ORDER, ...[...byAisle.keys()].filter((a) => !AISLE_ORDER.includes(a))]
      .filter((a) => byAisle.has(a))
      .map((a) => {
        const items = byAisle.get(a).sort((x, y) => x.name.localeCompare(y.name, "fr"));
        return `
          <div class="aisle-group">
            <h3 class="aisle-head">${escapeHtml(a)} <span>${items.length}</span></h3>
            <ul class="list">
              ${items.map((f) => `
                <li class="line-item food-row">
                  <span class="food-main">
                    <strong>${escapeHtml(f.name)}</strong>
                    ${asArray(f.aliases).length ? `<span class="muted small">aussi : ${escapeHtml(asArray(f.aliases).slice(0, 4).join(", "))}</span>` : ""}
                  </span>
                  <span class="food-kcal">${escapeHtml(f.kcal100)} <span class="muted">kcal/100 g</span></span>
                  <span class="food-acts">
                    ${f.builtin ? `<span class="badge small" title="Aliment de base">base</span>` : ""}
                    <button class="ghost icon-btn" type="button" data-action="edit-food" data-id="${escapeHtml(f.id)}" aria-label="Modifier">${icon("edit")}</button>
                    <button class="ghost icon-btn" type="button" data-action="delete-food" data-id="${escapeHtml(f.id)}" aria-label="Supprimer">${icon("trash")}</button>
                  </span>
                </li>`).join("")}
            </ul>
          </div>`;
      }).join("");
  }

  function renderFoods() {
    const editing = ui.editFood ? foodById(ui.editFood) : null;
    const d = editing || { name: "", aliases: [], aisle: "Autres", kcal100: "", gPerPiece: null, gPerCc: null, gPerCs: null, density: null };
    const aisleOpts = AISLE_ORDER.map((a) => `<option value="${escapeHtml(a)}" ${d.aisle === a ? "selected" : ""}>${escapeHtml(a)}</option>`).join("");
    const num = (v) => (v == null || v === "" ? "" : String(v));
    return `
      <div class="page-head">
        <div><h2>Aliments & calories</h2><p>${allFoods().length} aliments · base de calories partagée</p></div>
      </div>
      <p class="muted" style="margin:-6px 0 18px">Ces valeurs (kcal pour 100 g) servent à estimer les calories de chaque recette. Ajoute tes ingrédients perso ou ajuste les valeurs existantes.</p>

      <section class="content-grid foods-grid">
        <div>
          <div class="toolbar">
            <div class="search-field">${icon("search")}<input id="food-search" type="search" placeholder="Rechercher un aliment…" value="${escapeHtml(ui.foodSearch)}" /></div>
          </div>
          <div id="foods-list">${foodsListHtml()}</div>
        </div>

        <aside class="panel sticky">
          <div class="section-head"><h2>${editing ? "Modifier l’aliment" : "Nouvel aliment"}</h2></div>
          <form id="food-form" class="form-grid" data-id="${escapeHtml(editing ? editing.id : "")}">
            <label class="wide">Nom<input name="name" required value="${escapeHtml(d.name)}" placeholder="Ex. Crème de soja" /></label>
            <label class="wide">Autres noms <span class="hint">(séparés par des virgules)</span>
              <input name="aliases" value="${escapeHtml(asArray(d.aliases).join(", "))}" placeholder="creme soja, soja cuisine" /></label>
            <label>Calories<input name="kcal100" type="number" min="0" step="1" required value="${escapeHtml(num(d.kcal100))}" /><span class="hint">kcal / 100 g</span></label>
            <label>Rayon<select name="aisle">${aisleOpts}</select></label>
            <label>Grammes/pièce<input name="gPerPiece" type="number" min="0" step="0.1" value="${escapeHtml(num(d.gPerPiece))}" /><span class="hint">ex. 1 œuf = 50</span></label>
            <label>Densité<input name="density" type="number" min="0" step="0.01" value="${escapeHtml(num(d.density))}" /><span class="hint">g/ml (liquides)</span></label>
            <label>g / c. à soupe<input name="gPerCs" type="number" min="0" step="0.1" value="${escapeHtml(num(d.gPerCs))}" /></label>
            <label>g / c. à café<input name="gPerCc" type="number" min="0" step="0.1" value="${escapeHtml(num(d.gPerCc))}" /></label>
            <div class="form-actions wide">
              ${editing ? `<button class="ghost" type="button" data-action="cancel-edit-food">Annuler</button>` : ""}
              <button type="submit">${icon("check")} ${editing ? "Enregistrer" : "Ajouter"}</button>
            </div>
          </form>
        </aside>
      </section>
    `;
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
    if (!cook || cook.recipeId !== recipe.id) { cookClearAll(); cook = { recipeId: recipe.id, index: 0, timers: [], ticker: null, seq: 0 }; }
    const index = Math.min(cook.index, Math.max(0, steps.length - 1));
    const step = steps[index];
    const ingredients = asArray(recipe.ingredients);
    // Durée de l'étape : valeur enregistrée, sinon détectée à la volée dans le
    // texte (pour profiter aussi des recettes non ré-enregistrées).
    const stepTimer = step ? (Number(step.timerMinutes) || detectTimerMinutes(step.text)) : null;
    const defMin = stepTimer || 5;
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

            <div class="cook-timers" id="cook-timers"></div>

            <div class="cook-timer-controls">
              ${stepTimer ? `<button class="cook-timer-go" type="button" data-action="cook-timer-add" data-min="${stepTimer}">${icon("timer")} Lancer ${escapeHtml(formatTime(stepTimer))}</button>` : ""}
              <div class="cook-set">
                <div class="stepper cook-stepper">
                  <button class="icon-btn" type="button" data-action="cook-min-dec" aria-label="Moins">−</button>
                  <input id="cook-min" type="number" min="1" max="600" value="${defMin}" inputmode="numeric" aria-label="Minutes" />
                  <span class="muted">min</span>
                  <button class="icon-btn" type="button" data-action="cook-min-inc" aria-label="Plus">+</button>
                </div>
                <button class="secondary small" type="button" data-action="cook-timer-custom">${icon("timer")} Lancer</button>
              </div>
              <div class="cook-presets">
                ${[1, 3, 5, 10].map((m) => `<button class="ghost small" type="button" data-action="cook-timer-add" data-min="${m}">${m} min</button>`).join("")}
              </div>
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
      const main = line.split("|")[0].trim();
      const p = parseIngredientLine(line);
      const food = matchFood(p.name);
      return {
        id: uid("ing"), sortOrder: index, text: main, name: p.name || main,
        quantity: p.quantity, unit: p.unit, note: p.note, foodId: food ? food.id : null,
      };
    });
  }
  function formatStepsText(steps) {
    return asArray(steps).filter((s) => s.text && s.text !== PLACEHOLDER_STEP).map((s) => s.text).join("\n");
  }
  // Repère une durée dans un texte d'étape : « 25 min », « 1 h 30 », « 1h », « 2 heures ».
  function detectTimerMinutes(text) {
    const t = String(text || "").toLowerCase();
    let total = 0, found = false;
    const hm = t.match(/(\d+)\s*(?:h|heure[s]?)\s*(\d{1,2})/);
    if (hm) {
      total = Number(hm[1]) * 60 + Number(hm[2]); found = true;
    } else {
      const h = t.match(/(\d+(?:[.,]\d+)?)\s*(?:h\b|heure[s]?)/);
      if (h) { total += Math.round(Number(h[1].replace(",", ".")) * 60); found = true; }
      const m = t.match(/(\d+)\s*(?:min\b|minute[s]?|mn\b)/);
      if (m) { total += Number(m[1]); found = true; }
    }
    if (!found || total <= 0 || total > 24 * 60) return null;
    return total;
  }
  function parseStepsText(value) {
    return String(value || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      .map((text, index) => ({ id: uid("step"), sortOrder: index, text, timerMinutes: detectTimerMinutes(text) }));
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

  /* ------------------------- Aliments : mutations ------------------------- */
  function saveFood(form) {
    const d = new FormData(form);
    const name = String(d.get("name") || "").trim();
    if (!name) { toast("Le nom est requis"); return; }
    const numOrNull = (key) => { const v = String(d.get(key) || "").trim(); return v === "" ? null : Number(v); };
    const id = form.dataset.id || uid("food");
    const existing = foodById(id);
    const food = {
      id, name,
      aliases: splitList(d.get("aliases")),
      aisle: String(d.get("aisle") || "Autres"),
      kcal100: Number(d.get("kcal100")) || 0,
      gPerPiece: numOrNull("gPerPiece"),
      gPerCs: numOrNull("gPerCs"),
      gPerCc: numOrNull("gPerCc"),
      density: numOrNull("density"),
      builtin: existing ? existing.builtin : false,
    };
    if (existing) state.foods = state.foods.map((f) => (f.id === id ? food : f));
    else state.foods.push(food);
    ui.editFood = null;
    commitChange(existing ? "Aliment mis à jour" : "Aliment ajouté");
  }
  function deleteFood(id) {
    const food = foodById(id);
    if (!food) return;
    state.foods = state.foods.filter((f) => f.id !== id);
    // Un aliment de base supprimé est mémorisé pour ne pas réapparaître.
    if (food.builtin && !asArray(state.removedFoods).includes(id)) state.removedFoods.push(id);
    if (ui.editFood === id) ui.editFood = null;
    commitChange("Aliment supprimé");
  }

  /* ----------------------------- Mode cuisson ----------------------------- */
  // Minuteurs multiples : un seul « tic » d'horloge décrémente tous les
  // minuteurs en cours. Ils survivent au changement d'étape (four + casserole).
  function cookEnsureTicker() {
    if (!cook || cook.ticker) return;
    cook.ticker = setInterval(() => {
      for (const t of cook.timers) {
        if (!t.done && t.remaining > 0) {
          t.remaining -= 1;
          if (t.remaining <= 0) { t.remaining = 0; t.done = true; onCookTimerDone(t); }
        }
      }
      renderCookTimers();
      if (!cook.timers.some((t) => !t.done && t.remaining > 0)) { clearInterval(cook.ticker); cook.ticker = null; }
    }, 1000);
  }
  function cookAddTimer(minutes, label) {
    if (!cook) return;
    const sec = Math.round(Number(minutes) * 60);
    if (!Number.isFinite(sec) || sec <= 0) { toast("Durée invalide"); return; }
    cook.timers.push({ id: "t" + (++cook.seq), label: label || formatTime(Math.round(Number(minutes))), total: sec, remaining: sec, done: false });
    cookEnsureTicker();
    renderCookTimers();
    toast(`Minuteur lancé : ${formatTime(Math.round(Number(minutes)))}`);
  }
  function cookRemoveTimer(tid) {
    if (!cook) return;
    cook.timers = cook.timers.filter((t) => t.id !== tid);
    renderCookTimers();
  }
  function cookClearAll() {
    if (cook && cook.ticker) { clearInterval(cook.ticker); cook.ticker = null; }
    if (cook) cook.timers = [];
  }
  function renderCookTimers() {
    const el = document.getElementById("cook-timers");
    if (!el || !cook) return;
    el.innerHTML = cook.timers.map((t) => `
      <div class="cook-timer-chip ${t.done ? "done" : ""}">
        <span class="cook-timer-time">${t.done ? "⏰ 0:00" : formatTimer(t.remaining)}</span>
        <span class="cook-timer-label">${escapeHtml(t.label)}</span>
        <button class="ghost icon-btn" type="button" data-action="cook-timer-remove" data-tid="${t.id}" aria-label="Retirer le minuteur">${icon("x")}</button>
      </div>`).join("");
  }
  function onCookTimerDone(t) {
    toast(`⏰ ${t.label} — minuteur terminé !`);
    try { navigator.vibrate && navigator.vibrate([300, 150, 300, 150, 300]); } catch (_) {}
    cookBeep();
  }
  function cookBeep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      o.start();
      let n = 0;
      const iv = setInterval(() => {
        o.frequency.value = o.frequency.value === 880 ? 620 : 880;
        if (++n >= 6) {
          clearInterval(iv);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
          o.stop(ctx.currentTime + 0.15);
          setTimeout(() => { try { ctx.close(); } catch (_) {} }, 400);
        }
      }, 180);
    } catch (_) {}
  }
  function cookAdjustMin(delta) {
    const el = document.getElementById("cook-min");
    if (!el) return;
    el.value = Math.max(1, Math.min(600, (Number(el.value) || 0) + delta));
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
        case "cook-prev": if (cook) { cook.index = Math.max(0, cook.index - 1); render(); } break;
        case "cook-next": if (cook) { cook.index += 1; render(); } break;
        case "cook-timer-add": cookAddTimer(Number(target.dataset.min)); break;
        case "cook-timer-custom": { const el = document.getElementById("cook-min"); cookAddTimer(Number(el && el.value)); break; }
        case "cook-min-inc": cookAdjustMin(1); break;
        case "cook-min-dec": cookAdjustMin(-1); break;
        case "cook-timer-remove": cookRemoveTimer(target.dataset.tid); break;
        case "cook-finish": cookClearAll(); location.hash = `#/recipe/${id}`; toast("Bon appétit ! 🍽️ Pense à noter la recette."); break;
        case "edit-food": ui.editFood = id; render(); window.scrollTo({ top: 0, behavior: "smooth" }); break;
        case "cancel-edit-food": ui.editFood = null; render(); break;
        case "delete-food": deleteFood(id); break;
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
    else if (form.id === "food-form") saveFood(form);
    else if (form.id === "shopping-recipes-form") {
      const selected = new FormData(form).getAll("recipeIds");
      if (!selected.length) return;
      selected.forEach(addRecipeToShopping);
      commitChange(`${selected.length} recette(s) ajoutée(s) aux courses`);
    }
  });

  let kcalTimer = null;
  appEl.addEventListener("input", (event) => {
    const t = event.target;
    if (t.id === "recipe-search") { ui.search = t.value; debounceSearch(); return; }
    if (t.id === "food-search") {
      ui.foodSearch = t.value;
      const box = document.getElementById("foods-list");
      if (box) box.innerHTML = foodsListHtml();
      return;
    }
    if (t.form && t.form.id === "recipe-form" && (t.name === "ingredients" || t.name === "servings")) {
      clearTimeout(kcalTimer);
      kcalTimer = setTimeout(() => {
        const form = document.getElementById("recipe-form");
        const box = document.getElementById("kcal-estimate");
        if (!form || !box) return;
        const ings = parseIngredientsText(form.elements.ingredients.value);
        const sv = Number(form.elements.servings.value) || 1;
        box.innerHTML = kcalLineHtml(ings, sv);
      }, 250);
    }
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
