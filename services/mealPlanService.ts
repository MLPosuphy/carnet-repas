import { prisma } from "@/lib/db";
import { getWeekRange } from "@/lib/dates";
import { generateShoppingListFromRecipes } from "@/services/shoppingService";

export async function getOrCreateCurrentMealPlan(userId: string) {
  const { start, end } = getWeekRange();
  const existing = await prisma.mealPlan.findFirst({
    where: {
      userId,
      startDate: start
    },
    include: {
      entries: {
        include: {
          recipe: true
        },
        orderBy: [
          {
            date: "asc"
          },
          {
            mealType: "asc"
          }
        ]
      }
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.mealPlan.create({
    data: {
      userId,
      startDate: start,
      endDate: end
    },
    include: {
      entries: {
        include: {
          recipe: true
        }
      }
    }
  });
}

export async function addMealPlanEntry(input: {
  userId: string;
  date: Date;
  mealType: string;
  recipeId: string;
  servings: number;
  notes?: string;
}) {
  const mealPlan = await getOrCreateCurrentMealPlan(input.userId);

  return prisma.mealPlanEntry.create({
    data: {
      mealPlanId: mealPlan.id,
      date: input.date,
      mealType: input.mealType,
      recipeId: input.recipeId,
      servings: input.servings,
      notes: input.notes?.trim() || null
    }
  });
}

export async function deleteMealPlanEntry(id: string) {
  return prisma.mealPlanEntry.delete({
    where: {
      id
    }
  });
}

export async function generateShoppingListFromCurrentMealPlan(userId: string) {
  const mealPlan = await getOrCreateCurrentMealPlan(userId);

  return generateShoppingListFromRecipes(
    userId,
    mealPlan.entries.map((entry) => ({
      recipeId: entry.recipeId,
      servings: entry.servings
    }))
  );
}
