import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { textMatchesQuery } from "@/lib/search";
import type { InstructionStepInput, RecipeIngredientInput } from "@/types/recipe";

export const recipeInclude = Prisma.validator<Prisma.RecipeInclude>()({
  ingredients: {
    orderBy: {
      sortOrder: "asc"
    }
  },
  steps: {
    orderBy: {
      sortOrder: "asc"
    }
  },
  tags: {
    include: {
      tag: true
    }
  },
  chapters: {
    include: {
      chapter: true
    }
  },
  cookingSessions: {
    orderBy: {
      cookedAt: "desc"
    }
  }
});

export type RecipeWithDetails = Prisma.RecipeGetPayload<{
  include: typeof recipeInclude;
}>;

type RecipeCompletionShape = {
  sourceType: string;
  ingredients: Array<unknown>;
  steps: Array<{ text: string }>;
  tags: Array<{ tag: { name: string } }>;
};

export type RecipeFilters = {
  query?: string;
  tag?: string;
  difficulty?: string;
  maxTime?: number | null;
  costLevel?: string;
  status?: string;
  sort?: string;
};

export type CreateRecipeInput = {
  userId: string;
  title: string;
  description: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: string;
  costLevel: string;
  season: string;
  sourceType: string;
  sourceName?: string;
  sourceUrl?: string;
  imageUrl?: string;
  personalNotes?: string;
  tagNames: string[];
  ingredients: RecipeIngredientInput[];
  steps: InstructionStepInput[];
};

export type UpdateRecipeInput = CreateRecipeInput & {
  id: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function makeUniqueSlug(title: string, ignoredRecipeId?: string) {
  const baseSlug = slugify(title) || "recette";
  let slug = baseSlug;
  let index = 2;

  while (true) {
    const existing = await prisma.recipe.findUnique({
      where: {
        slug
      },
      select: {
        id: true
      }
    });

    if (!existing || existing.id === ignoredRecipeId) {
      return slug;
    }

    slug = `${baseSlug}-${index}`;
    index += 1;
  }
}

function normalizeTags(tagNames: string[]) {
  return Array.from(
    new Set(tagNames.map((tag) => tag.trim().toLowerCase()).filter(Boolean))
  );
}

function cleanAndValidateRecipeInput(input: CreateRecipeInput) {
  const cleanIngredients = input.ingredients.filter((ingredient) =>
    ingredient.name.trim()
  );
  const cleanSteps = input.steps.filter((step) => step.text.trim());

  if (!input.title.trim()) {
    throw new Error("Le titre est obligatoire.");
  }

  if (input.servings <= 0) {
    throw new Error("Les portions doivent être supérieures à zéro.");
  }

  if (cleanIngredients.length === 0) {
    throw new Error("Ajoute au moins un ingrédient.");
  }

  if (cleanSteps.length === 0) {
    throw new Error("Ajoute au moins une étape.");
  }

  const hasPlaceholderStep = cleanSteps.some((step) =>
    step.text.toLowerCase().includes("compléter")
  );
  const tagNames = normalizeTags(input.tagNames).filter(
    (tagName) => tagName !== "à compléter" || hasPlaceholderStep
  );

  return {
    cleanIngredients,
    cleanSteps,
    tagNames
  };
}

export function isRecipeToComplete(recipe: RecipeCompletionShape) {
  const hasCompletionTag = recipe.tags.some(({ tag }) => tag.name === "à compléter");
  const hasMissingIngredients = recipe.ingredients.length === 0;
  const hasPlaceholderStep = recipe.steps.some((step) =>
    step.text.toLowerCase().includes("compléter")
  );

  return (
    hasCompletionTag ||
    (recipe.sourceType === "imported" && (hasMissingIngredients || hasPlaceholderStep))
  );
}

export async function getRecipeCount(userId: string) {
  return prisma.recipe.count({
    where: {
      userId
    }
  });
}

export async function getRecipeCompletionStats(userId: string) {
  const recipes = await prisma.recipe.findMany({
    where: {
      userId
    },
    select: {
      sourceType: true,
      ingredients: {
        select: {
          id: true
        }
      },
      steps: {
        select: {
          text: true
        }
      },
      tags: {
        include: {
          tag: true
        }
      }
    }
  });

  const toComplete = recipes.filter(isRecipeToComplete).length;

  return {
    total: recipes.length,
    toComplete,
    ready: recipes.length - toComplete
  };
}

export async function getRecentRecipes(userId: string, take = 4) {
  return prisma.recipe.findMany({
    where: {
      userId
    },
    include: recipeInclude,
    orderBy: {
      createdAt: "desc"
    },
    take
  });
}

export async function getRecipesToCookSoon(userId: string, take = 4) {
  const recipes = await prisma.recipe.findMany({
    where: {
      userId
    },
    include: recipeInclude,
    orderBy: [
      {
        lastCookedAt: "asc"
      },
      {
        averageRating: "desc"
      }
    ]
  });

  return recipes.filter((recipe) => !isRecipeToComplete(recipe)).slice(0, take);
}

export async function getAllTags() {
  return prisma.tag.findMany({
    orderBy: {
      name: "asc"
    }
  });
}

export async function getRecipesForSelect(userId: string) {
  return prisma.recipe.findMany({
    where: {
      userId
    },
    orderBy: {
      title: "asc"
    },
    select: {
      id: true,
      title: true,
      servings: true
    }
  });
}

export async function getRecipesWithIngredientsForSelect(userId: string) {
  return prisma.recipe.findMany({
    where: {
      userId,
      ingredients: {
        some: {}
      }
    },
    orderBy: {
      title: "asc"
    },
    select: {
      id: true,
      title: true,
      servings: true
    }
  });
}

export async function getRecipes(userId: string, filters: RecipeFilters = {}) {
  const recipes = await prisma.recipe.findMany({
    where: {
      userId
    },
    include: recipeInclude,
    orderBy: {
      createdAt: "desc"
    }
  });

  const filtered = recipes.filter((recipe) => {
    const matchesQuery =
      textMatchesQuery(recipe.title, filters.query ?? "") ||
      textMatchesQuery(recipe.description, filters.query ?? "");
    const matchesTag =
      !filters.tag || recipe.tags.some(({ tag }) => tag.name === filters.tag);
    const matchesDifficulty =
      !filters.difficulty || recipe.difficulty === filters.difficulty;
    const matchesCost = !filters.costLevel || recipe.costLevel === filters.costLevel;
    const matchesTime =
      !filters.maxTime || recipe.totalTimeMinutes <= Number(filters.maxTime);
    const toComplete = isRecipeToComplete(recipe);
    const matchesStatus =
      !filters.status ||
      (filters.status === "to_complete" && toComplete) ||
      (filters.status === "ready" && !toComplete);

    return (
      matchesQuery &&
      matchesTag &&
      matchesDifficulty &&
      matchesCost &&
      matchesTime &&
      matchesStatus
    );
  });

  return filtered.sort((left, right) => {
    switch (filters.sort) {
      case "rating":
        return (right.averageRating ?? 0) - (left.averageRating ?? 0);
      case "fastest":
        return left.totalTimeMinutes - right.totalTimeMinutes;
      case "alphabetical":
        return left.title.localeCompare(right.title, "fr");
      default:
        return right.createdAt.getTime() - left.createdAt.getTime();
    }
  });
}

export async function getRecipeById(id: string) {
  return prisma.recipe.findUnique({
    where: {
      id
    },
    include: recipeInclude
  });
}

export async function createRecipe(input: CreateRecipeInput) {
  const { cleanIngredients, cleanSteps, tagNames } = cleanAndValidateRecipeInput(input);
  const slug = await makeUniqueSlug(input.title);

  return prisma.recipe.create({
    data: {
      userId: input.userId,
      title: input.title.trim(),
      slug,
      description: input.description.trim(),
      servings: input.servings,
      prepTimeMinutes: input.prepTimeMinutes,
      cookTimeMinutes: input.cookTimeMinutes,
      totalTimeMinutes: input.prepTimeMinutes + input.cookTimeMinutes,
      difficulty: input.difficulty,
      costLevel: input.costLevel,
      season: input.season,
      sourceType: input.sourceType,
      sourceName: input.sourceName || null,
      sourceUrl: input.sourceUrl || null,
      imageUrl: input.imageUrl || null,
      personalNotes: input.personalNotes || null,
      ingredients: {
        create: cleanIngredients.map((ingredient, sortOrder) => ({
          name: ingredient.name.trim(),
          quantity: ingredient.quantity,
          unit: ingredient.unit?.trim() || null,
          notes: ingredient.notes?.trim() || null,
          optional: ingredient.optional ?? false,
          groupName: ingredient.groupName?.trim() || null,
          sortOrder
        }))
      },
      steps: {
        create: cleanSteps.map((step, sortOrder) => ({
          text: step.text.trim(),
          timerMinutes: step.timerMinutes ?? null,
          temperature: step.temperature?.trim() || null,
          equipment: step.equipment?.trim() || null,
          tip: step.tip?.trim() || null,
          sortOrder
        }))
      },
      tags: {
        create: tagNames.map((tagName, index) => ({
          tag: {
            connectOrCreate: {
              where: {
                name: tagName
              },
              create: {
                name: tagName,
                color: ["#6d8a6f", "#c9573f", "#b78943", "#4d638c"][index % 4]
              }
            }
          }
        }))
      }
    }
  });
}

export async function updateRecipe(input: UpdateRecipeInput) {
  const existing = await prisma.recipe.findUnique({
    where: {
      id: input.id
    },
    select: {
      userId: true
    }
  });

  if (!existing || existing.userId !== input.userId) {
    throw new Error("Recette introuvable.");
  }

  const { cleanIngredients, cleanSteps, tagNames } = cleanAndValidateRecipeInput(input);
  const slug = await makeUniqueSlug(input.title, input.id);

  return prisma.$transaction(async (tx) => {
    await tx.recipeIngredient.deleteMany({
      where: {
        recipeId: input.id
      }
    });
    await tx.instructionStep.deleteMany({
      where: {
        recipeId: input.id
      }
    });
    await tx.recipeTag.deleteMany({
      where: {
        recipeId: input.id
      }
    });

    return tx.recipe.update({
      where: {
        id: input.id
      },
      data: {
        title: input.title.trim(),
        slug,
        description: input.description.trim(),
        servings: input.servings,
        prepTimeMinutes: input.prepTimeMinutes,
        cookTimeMinutes: input.cookTimeMinutes,
        totalTimeMinutes: input.prepTimeMinutes + input.cookTimeMinutes,
        difficulty: input.difficulty,
        costLevel: input.costLevel,
        season: input.season,
        sourceType: input.sourceType,
        sourceName: input.sourceName || null,
        sourceUrl: input.sourceUrl || null,
        imageUrl: input.imageUrl || null,
        personalNotes: input.personalNotes || null,
        ingredients: {
          create: cleanIngredients.map((ingredient, sortOrder) => ({
            name: ingredient.name.trim(),
            quantity: ingredient.quantity,
            unit: ingredient.unit?.trim() || null,
            notes: ingredient.notes?.trim() || null,
            optional: ingredient.optional ?? false,
            groupName: ingredient.groupName?.trim() || null,
            sortOrder
          }))
        },
        steps: {
          create: cleanSteps.map((step, sortOrder) => ({
            text: step.text.trim(),
            timerMinutes: step.timerMinutes ?? null,
            temperature: step.temperature?.trim() || null,
            equipment: step.equipment?.trim() || null,
            tip: step.tip?.trim() || null,
            sortOrder
          }))
        },
        tags: {
          create: tagNames.map((tagName, index) => ({
            tag: {
              connectOrCreate: {
                where: {
                  name: tagName
                },
                create: {
                  name: tagName,
                  color: ["#6d8a6f", "#c9573f", "#b78943", "#4d638c"][index % 4]
                }
              }
            }
          }))
        }
      },
      include: recipeInclude
    });
  });
}

export async function createCookingSession(input: {
  recipeId: string;
  userId: string;
  actualPrepTimeMinutes?: number | null;
  actualCookTimeMinutes?: number | null;
  rating?: number | null;
  notes?: string;
  wouldCookAgain: boolean;
  servingsCooked?: number | null;
}) {
  const session = await prisma.cookingSession.create({
    data: {
      recipeId: input.recipeId,
      userId: input.userId,
      actualPrepTimeMinutes: input.actualPrepTimeMinutes ?? null,
      actualCookTimeMinutes: input.actualCookTimeMinutes ?? null,
      rating: input.rating ?? null,
      notes: input.notes?.trim() || null,
      wouldCookAgain: input.wouldCookAgain,
      servingsCooked: input.servingsCooked ?? null
    }
  });

  const ratings = await prisma.cookingSession.findMany({
    where: {
      recipeId: input.recipeId,
      rating: {
        not: null
      }
    },
    select: {
      rating: true
    }
  });

  const averageRating =
    ratings.length > 0
      ? ratings.reduce((total, item) => total + (item.rating ?? 0), 0) /
        ratings.length
      : null;

  await prisma.recipe.update({
    where: {
      id: input.recipeId
    },
    data: {
      lastCookedAt: session.cookedAt,
      averageRating
    }
  });

  return session;
}
