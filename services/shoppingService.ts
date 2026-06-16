import { prisma } from "@/lib/db";
import { normalizeIngredientName } from "@/lib/ingredients";
import { scaleAndRoundQuantity } from "@/lib/scaling";
import { guessShoppingCategory } from "@/lib/shoppingCategories";

export type RecipeShoppingRequest = {
  recipeId: string;
  servings: number;
};

export async function getOrCreateActiveShoppingList(userId: string) {
  const existing = await prisma.shoppingList.findFirst({
    where: {
      userId,
      status: "active"
    },
    include: {
      items: {
        orderBy: [
          {
            category: "asc"
          },
          {
            name: "asc"
          }
        ]
      }
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.shoppingList.create({
    data: {
      userId,
      title: "Liste active",
      status: "active"
    },
    include: {
      items: true
    }
  });
}

export async function addManualShoppingItem(input: {
  userId: string;
  name: string;
  quantity?: number | null;
  unit?: string;
  notes?: string;
}) {
  const list = await getOrCreateActiveShoppingList(input.userId);

  return prisma.shoppingListItem.create({
    data: {
      shoppingListId: list.id,
      name: input.name.trim(),
      quantity: input.quantity ?? null,
      unit: input.unit?.trim() || null,
      notes: input.notes?.trim() || null,
      category: guessShoppingCategory(input.name)
    }
  });
}

export async function toggleShoppingItem(id: string) {
  const item = await prisma.shoppingListItem.findUnique({
    where: {
      id
    }
  });

  if (!item) {
    return null;
  }

  return prisma.shoppingListItem.update({
    where: {
      id
    },
    data: {
      checked: !item.checked
    }
  });
}

export async function deleteShoppingItem(id: string) {
  return prisma.shoppingListItem.delete({
    where: {
      id
    }
  });
}

export async function generateShoppingListFromRecipes(
  userId: string,
  requests: RecipeShoppingRequest[]
) {
  const list = await getOrCreateActiveShoppingList(userId);
  const normalizedRequests = requests.filter((request) => request.recipeId);
  const recipeIds = normalizedRequests.map((request) => request.recipeId);

  if (recipeIds.length === 0) {
    return list;
  }

  const recipes = await prisma.recipe.findMany({
    where: {
      id: {
        in: recipeIds
      },
      userId
    },
    include: {
      ingredients: true
    }
  });

  await prisma.shoppingListItem.deleteMany({
    where: {
      shoppingListId: list.id,
      sourceRecipeId: {
        in: recipeIds
      },
      checked: false
    }
  });

  const groups = new Map<
    string,
    {
      name: string;
      quantity: number | null;
      unit: string | null;
      category: string;
      sourceRecipeId: string;
    }
  >();

  for (const recipe of recipes) {
    const request = normalizedRequests.find((item) => item.recipeId === recipe.id);
    const targetServings = request?.servings || recipe.servings;

    for (const ingredient of recipe.ingredients) {
      const normalizedName = normalizeIngredientName(ingredient.name);
      const unit = ingredient.unit ?? null;
      const key = `${normalizedName}:${unit ?? ""}`;
      const scaledQuantity = scaleAndRoundQuantity(
        ingredient.quantity,
        recipe.servings,
        targetServings,
        unit
      );
      const existing = groups.get(key);

      if (existing) {
        existing.quantity =
          existing.quantity !== null && scaledQuantity !== null
            ? existing.quantity + scaledQuantity
            : null;
      } else {
        groups.set(key, {
          name: ingredient.name,
          quantity: scaledQuantity,
          unit,
          category: guessShoppingCategory(ingredient.name),
          sourceRecipeId: recipe.id
        });
      }
    }
  }

  for (const item of groups.values()) {
    await prisma.shoppingListItem.create({
      data: {
        shoppingListId: list.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        sourceRecipeId: item.sourceRecipeId
      }
    });
  }

  return getOrCreateActiveShoppingList(userId);
}
