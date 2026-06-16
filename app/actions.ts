"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseNumber, parseOptionalNumber } from "@/lib/utils";
import {
  createChapter,
  deleteChapter,
  addRecipeToChapter,
  removeRecipeFromChapter,
  updateChapter
} from "@/services/chapterService";
import {
  addMealPlanEntry,
  deleteMealPlanEntry,
  generateShoppingListFromCurrentMealPlan
} from "@/services/mealPlanService";
import {
  createPantryItem,
  deletePantryItem,
  updatePantryItem
} from "@/services/pantryService";
import {
  createCookingSession,
  createRecipe,
  updateRecipe
} from "@/services/recipeService";
import {
  addManualShoppingItem,
  deleteShoppingItem,
  generateShoppingListFromRecipes,
  toggleShoppingItem
} from "@/services/shoppingService";
import { getDemoUser } from "@/services/userService";
import type { InstructionStepInput, RecipeIngredientInput } from "@/types/recipe";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseJsonField<T>(formData: FormData, key: string, fallback: T): T {
  const value = getString(formData, key);

  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseDateInput(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createRecipeAction(formData: FormData) {
  const user = await getDemoUser();
  const ingredients = parseJsonField<RecipeIngredientInput[]>(
    formData,
    "ingredientsJson",
    []
  );
  const steps = parseJsonField<InstructionStepInput[]>(formData, "stepsJson", []);

  const recipe = await createRecipe({
    userId: user.id,
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    servings: parseNumber(formData.get("servings"), 4),
    prepTimeMinutes: parseNumber(formData.get("prepTimeMinutes"), 0),
    cookTimeMinutes: parseNumber(formData.get("cookTimeMinutes"), 0),
    difficulty: getString(formData, "difficulty") || "easy",
    costLevel: getString(formData, "costLevel") || "medium",
    season: getString(formData, "season") || "all_year",
    sourceType: getString(formData, "sourceType") || "personal",
    sourceName: getString(formData, "sourceName"),
    sourceUrl: getString(formData, "sourceUrl"),
    imageUrl: getString(formData, "imageUrl"),
    personalNotes: getString(formData, "personalNotes"),
    tagNames: getString(formData, "tags").split(","),
    ingredients,
    steps
  });

  revalidatePath("/");
  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipeAction(formData: FormData) {
  const user = await getDemoUser();
  const recipeId = getString(formData, "id");
  const ingredients = parseJsonField<RecipeIngredientInput[]>(
    formData,
    "ingredientsJson",
    []
  );
  const steps = parseJsonField<InstructionStepInput[]>(formData, "stepsJson", []);

  const recipe = await updateRecipe({
    id: recipeId,
    userId: user.id,
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    servings: parseNumber(formData.get("servings"), 4),
    prepTimeMinutes: parseNumber(formData.get("prepTimeMinutes"), 0),
    cookTimeMinutes: parseNumber(formData.get("cookTimeMinutes"), 0),
    difficulty: getString(formData, "difficulty") || "easy",
    costLevel: getString(formData, "costLevel") || "medium",
    season: getString(formData, "season") || "all_year",
    sourceType: getString(formData, "sourceType") || "personal",
    sourceName: getString(formData, "sourceName"),
    sourceUrl: getString(formData, "sourceUrl"),
    imageUrl: getString(formData, "imageUrl"),
    personalNotes: getString(formData, "personalNotes"),
    tagNames: getString(formData, "tags").split(","),
    ingredients,
    steps
  });

  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipe.id}`);
  redirect(`/recipes/${recipe.id}`);
}

export async function createChapterAction(formData: FormData) {
  const user = await getDemoUser();
  await createChapter({
    userId: user.id,
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    color: getString(formData, "color")
  });

  revalidatePath("/chapters");
}

export async function updateChapterAction(formData: FormData) {
  await updateChapter({
    id: getString(formData, "id"),
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    color: getString(formData, "color")
  });

  revalidatePath("/chapters");
}

export async function deleteChapterAction(formData: FormData) {
  await deleteChapter(getString(formData, "id"));
  revalidatePath("/chapters");
}

export async function addRecipeToChapterAction(formData: FormData) {
  await addRecipeToChapter(
    getString(formData, "chapterId"),
    getString(formData, "recipeId")
  );
  revalidatePath("/chapters");
}

export async function removeRecipeFromChapterAction(formData: FormData) {
  await removeRecipeFromChapter(
    getString(formData, "chapterId"),
    getString(formData, "recipeId")
  );
  revalidatePath("/chapters");
}

export async function createPantryItemAction(formData: FormData) {
  const user = await getDemoUser();
  await createPantryItem({
    userId: user.id,
    name: getString(formData, "name"),
    quantity: parseOptionalNumber(formData.get("quantity")),
    unit: getString(formData, "unit"),
    location: getString(formData, "location") || "pantry",
    expirationDate: parseDateInput(getString(formData, "expirationDate"))
  });

  revalidatePath("/");
  revalidatePath("/pantry");
}

export async function updatePantryItemAction(formData: FormData) {
  await updatePantryItem({
    id: getString(formData, "id"),
    quantity: parseOptionalNumber(formData.get("quantity")),
    unit: getString(formData, "unit"),
    location: getString(formData, "location") || "pantry",
    expirationDate: parseDateInput(getString(formData, "expirationDate"))
  });

  revalidatePath("/");
  revalidatePath("/pantry");
}

export async function deletePantryItemAction(formData: FormData) {
  await deletePantryItem(getString(formData, "id"));
  revalidatePath("/");
  revalidatePath("/pantry");
}

export async function addShoppingItemAction(formData: FormData) {
  const user = await getDemoUser();
  await addManualShoppingItem({
    userId: user.id,
    name: getString(formData, "name"),
    quantity: parseOptionalNumber(formData.get("quantity")),
    unit: getString(formData, "unit"),
    notes: getString(formData, "notes")
  });

  revalidatePath("/shopping");
}

export async function toggleShoppingItemAction(formData: FormData) {
  await toggleShoppingItem(getString(formData, "id"));
  revalidatePath("/shopping");
}

export async function deleteShoppingItemAction(formData: FormData) {
  await deleteShoppingItem(getString(formData, "id"));
  revalidatePath("/shopping");
}

export async function generateShoppingFromRecipesAction(formData: FormData) {
  const user = await getDemoUser();
  const recipeIds = formData.getAll("recipeId").filter((value): value is string => {
    return typeof value === "string";
  });

  await generateShoppingListFromRecipes(
    user.id,
    recipeIds.map((recipeId) => ({
      recipeId,
      servings: parseNumber(formData.get(`servings-${recipeId}`), 4)
    }))
  );

  revalidatePath("/shopping");
}

export async function addRecipeToShoppingListAction(
  recipeId: string,
  formData: FormData
) {
  const user = await getDemoUser();
  await generateShoppingListFromRecipes(user.id, [
    {
      recipeId,
      servings: parseNumber(formData.get("servings"), 4)
    }
  ]);

  revalidatePath("/shopping");
  revalidatePath(`/recipes/${recipeId}`);
  redirect("/shopping");
}

export async function addMealPlanEntryAction(formData: FormData) {
  const user = await getDemoUser();
  await addMealPlanEntry({
    userId: user.id,
    date: parseDateInput(getString(formData, "date")) ?? new Date(),
    mealType: getString(formData, "mealType") || "dinner",
    recipeId: getString(formData, "recipeId"),
    servings: parseNumber(formData.get("servings"), 4),
    notes: getString(formData, "notes")
  });

  revalidatePath("/meal-plan");
}

export async function deleteMealPlanEntryAction(formData: FormData) {
  await deleteMealPlanEntry(getString(formData, "id"));
  revalidatePath("/meal-plan");
}

export async function generateWeekShoppingListAction() {
  const user = await getDemoUser();
  await generateShoppingListFromCurrentMealPlan(user.id);
  revalidatePath("/shopping");
  revalidatePath("/meal-plan");
  redirect("/shopping");
}

export async function finishCookingSessionAction(
  recipeId: string,
  formData: FormData
) {
  const user = await getDemoUser();
  await createCookingSession({
    recipeId,
    userId: user.id,
    actualPrepTimeMinutes: parseOptionalNumber(formData.get("actualPrepTimeMinutes")),
    actualCookTimeMinutes: parseOptionalNumber(formData.get("actualCookTimeMinutes")),
    rating: parseOptionalNumber(formData.get("rating")),
    notes: getString(formData, "notes"),
    wouldCookAgain: formData.get("wouldCookAgain") === "on",
    servingsCooked: parseOptionalNumber(formData.get("servingsCooked"))
  });

  revalidatePath("/");
  revalidatePath(`/recipes/${recipeId}`);
  redirect(`/recipes/${recipeId}`);
}
