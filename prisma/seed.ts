import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type MealIdea = string | { title: string; priority?: boolean };

type MealSection = {
  chapter: string;
  description: string;
  color: string;
  groups: Array<{
    name?: string;
    tags: string[];
    ideas: MealIdea[];
  }>;
};

const tagColors = [
  "#6d8a6f",
  "#c9573f",
  "#b78943",
  "#4d638c",
  "#8c6f4d",
  "#8a6d7d",
  "#6b7280"
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function ideaTitle(idea: MealIdea) {
  return typeof idea === "string" ? idea : idea.title;
}

function isPriority(idea: MealIdea) {
  return typeof idea === "string" ? false : idea.priority === true;
}

const mealSections: MealSection[] = [
  {
    chapter: "Healthy",
    description: "Idées du fichier Excel orientées repas simples et plutôt équilibrés.",
    color: "#6d8a6f",
    groups: [
      {
        name: "Riz, pâtes, légumes et viandes",
        tags: ["healthy", "riz et pâtes"],
        ideas: [
          "Carottes à la Vichy",
          "Soupe maison",
          "Fondue de poireaux",
          "Quiche thon, tomates et moutarde",
          "Riz, viande hachée et légumes",
          "Melon au jambon cru",
          "Ratatouille"
        ]
      }
    ]
  },
  {
    chapter: "Salades",
    description: "Salades et assiettes fraîches importées depuis le tableur.",
    color: "#4d638c",
    groups: [
      {
        tags: ["salade", "healthy"],
        ideas: [
          { title: "Salade grecque", priority: true },
          "Salade chèvre chaud",
          { title: "Salade César", priority: true },
          { title: "Salade avocat, jambon cru et tomates", priority: true }
        ]
      }
    ]
  },
  {
    chapter: "Classiques",
    description: "Plats de tous les jours et classiques maison à compléter.",
    color: "#b78943",
    groups: [
      {
        tags: ["plat", "classique"],
        ideas: [
          { title: "Croques-monsieurs", priority: true },
          { title: "Pâtes chorizo poivron", priority: true },
          { title: "Tarte courgette saumon", priority: true },
          { title: "Cake salé feta et tomates séchées", priority: true },
          "Riz lardons chèvre",
          "Pâtes courgettes carbonara",
          "Nouilles coco curry",
          "Omelette pommes de terre lardons",
          "Riz cantonais",
          "Gratin de ravioles",
          "Aubergines bolognaise",
          "Lasagnes",
          "Gratin dauphinois",
          "Pâtes aux crevettes",
          "Risotto champignons jambon cru",
          "Purée de carottes et viande",
          "Gnocchis (chou-fleur, carottes, pommes de terre)",
          "Poulet curry riz",
          "Risotto poireaux poulet",
          "One pot tartare chorizo champignon",
          "Moussaka",
          "Pinsa",
          "Pâtes bolognaise",
          "Gratin de chou-fleur",
          "Dôme saumon avocat",
          "Maki maison",
          "Pâtes carbonara",
          "Pâtes fraîches maison",
          "Féculents et poisson",
          "Hachis Parmentier",
          "Poulet basquaise",
          "Tortilla espagnole",
          "Fajitas",
          "Burritos",
          "Brandade de morue parmentière",
          "Focaccia"
        ]
      }
    ]
  },
  {
    chapter: "Pas healthy",
    description: "Repas plaisir, fromage, fast-food maison et plats réconfortants.",
    color: "#c9573f",
    groups: [
      {
        tags: ["repas plaisir", "comfort food"],
        ideas: [
          "Pizza maison",
          "Hamburger maison",
          "Pâtes + cordons bleus/nuggets",
          "Tacos maison",
          "Tartiflette",
          "Raclette",
          "Fondue savoyarde",
          "Confit de canard, pommes sarladaises",
          "Moules marinières / moules-frites",
          "Enchiladas",
          "Crozets au reblochon"
        ]
      }
    ]
  },
  {
    chapter: "Gâteaux",
    description: "Desserts et pâtisseries listés dans le fichier Excel.",
    color: "#8a6d7d",
    groups: [
      {
        tags: ["dessert", "pâtisserie"],
        ideas: [
          "Tarte aux pommes",
          "Croquants aux amandes",
          "Chouchous",
          "Nougats",
          "Bugnes",
          "Crêpes",
          "Gâteau au yaourt",
          "Gaufres",
          "Brookies",
          "Cookies",
          "Gâteau Milka noix",
          "Muffins pralinoise noix",
          "Marbré",
          "Tiramisu",
          "Cheesecake",
          "Tarte au citron meringuée",
          "Tarte aux fraises / abricots / mirabelles",
          "Banana bread",
          "Madeleines",
          "Financiers (blancs d'oeufs)",
          "Pain perdu brioché",
          "Tarte Tatin",
          "Paris-Brest",
          "Mille-feuille",
          "Galette des rois",
          "Kouign-amann",
          "Île flottante",
          "Macarons"
        ]
      }
    ]
  }
];

async function resetDatabase() {
  await prisma.mealPlanEntry.deleteMany();
  await prisma.mealPlan.deleteMany();
  await prisma.shoppingListItem.deleteMany();
  await prisma.shoppingList.deleteMany();
  await prisma.pantryItem.deleteMany();
  await prisma.cookingSession.deleteMany();
  await prisma.recipeVersion.deleteMany();
  await prisma.chapterRecipe.deleteMany();
  await prisma.recipeTag.deleteMany();
  await prisma.instructionStep.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await resetDatabase();

  const user = await prisma.user.create({
    data: {
      name: "Mateo",
      email: "mateo@example.local",
      profile: {
        create: {
          householdSize: 2,
          defaultServings: 4,
          skillLevel: "intermediate",
          preferredCookingTime: 35,
          budgetLevel: "medium",
          dietLabels: JSON.stringify([]),
          allergies: JSON.stringify([]),
          dislikedIngredients: JSON.stringify([]),
          likedIngredients: JSON.stringify(["pâtes", "riz", "fromage", "tomates"]),
          availableEquipment: JSON.stringify(["four", "mixeur", "cocotte", "poêle"])
        }
      }
    }
  });

  const chapters = new Map<string, string>();
  for (const [index, section] of mealSections.entries()) {
    const chapter = await prisma.chapter.create({
      data: {
        userId: user.id,
        title: section.chapter,
        description: section.description,
        color: section.color,
        sortOrder: index
      }
    });
    chapters.set(section.chapter, chapter.id);
  }

  const tagNames = new Set<string>(["à compléter", "import excel", "à prioriser"]);
  for (const section of mealSections) {
    tagNames.add(section.chapter.toLowerCase());
    for (const group of section.groups) {
      group.tags.forEach((tag) => tagNames.add(tag));
      if (group.name) {
        tagNames.add(group.name.toLowerCase());
      }
    }
  }

  for (const [index, name] of Array.from(tagNames).entries()) {
    await prisma.tag.create({
      data: {
        name,
        color: tagColors[index % tagColors.length]
      }
    });
  }

  for (const section of mealSections) {
    const chapterId = chapters.get(section.chapter);

    for (const group of section.groups) {
      for (const idea of group.ideas) {
        const title = ideaTitle(idea);
        const priority = isPriority(idea);
        const recipeTagNames = [
          "à compléter",
          "import excel",
          section.chapter.toLowerCase(),
          ...group.tags,
          ...(group.name ? [group.name.toLowerCase()] : []),
          ...(priority ? ["à prioriser"] : [])
        ];

        await prisma.recipe.create({
          data: {
            userId: user.id,
            title,
            slug: slugify(title),
            description: `Idée importée depuis "Idée repas.xlsx"${
              group.name ? `, section ${group.name}` : ""
            }.`,
            servings: 4,
            prepTimeMinutes: 0,
            cookTimeMinutes: 0,
            totalTimeMinutes: 0,
            difficulty: "easy",
            costLevel: "medium",
            season: "all_year",
            sourceType: "imported",
            sourceName: "Idée repas.xlsx",
            personalNotes: priority
              ? "Marquée d'un X dans le fichier Excel. Ingrédients et étapes à compléter."
              : "Ingrédients et étapes à compléter.",
            steps: {
              create: [
                {
                  sortOrder: 0,
                  text: "Compléter les ingrédients et les étapes de préparation."
                }
              ]
            },
            tags: {
              create: Array.from(new Set(recipeTagNames)).map((tagName) => ({
                tag: {
                  connect: {
                    name: tagName
                  }
                }
              }))
            },
            chapters: chapterId
              ? {
                  create: [
                    {
                      chapter: {
                        connect: {
                          id: chapterId
                        }
                      }
                    }
                  ]
                }
              : undefined
          }
        });
      }
    }
  }

  await prisma.pantryItem.createMany({
    data: [
      { userId: user.id, name: "oeufs", quantity: 6, unit: "pièces", location: "fridge" },
      { userId: user.id, name: "tomates", quantity: 4, unit: "pièces", location: "fridge" },
      { userId: user.id, name: "courgettes", quantity: 2, unit: "pièces", location: "fridge" },
      { userId: user.id, name: "riz", quantity: 500, unit: "g", location: "pantry" },
      { userId: user.id, name: "pâtes", quantity: 500, unit: "g", location: "pantry" },
      { userId: user.id, name: "fromage râpé", quantity: 150, unit: "g", location: "fridge" }
    ]
  });

  await prisma.shoppingList.create({
    data: {
      userId: user.id,
      title: "Liste active",
      status: "active"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
