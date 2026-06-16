import { normalizeIngredientName } from "@/lib/ingredients";
import { getPantryItems } from "@/services/pantryService";
import { getRecipes, isRecipeToComplete } from "@/services/recipeService";
import type { RecipeRecommendation } from "@/types/recipe";

function ingredientMatches(required: string, available: string) {
  return required.includes(available) || available.includes(required);
}

export async function getRecipeRecommendations(
  userId: string
): Promise<RecipeRecommendation[]> {
  const [recipes, pantryItems] = await Promise.all([
    getRecipes(userId),
    getPantryItems(userId)
  ]);
  const availableIngredients = pantryItems
    .map((item) => normalizeIngredientName(item.name))
    .filter(Boolean);

  return recipes
    .filter((recipe) => recipe.ingredients.length > 0 && !isRecipeToComplete(recipe))
    .map((recipe) => {
      const requiredIngredients = recipe.ingredients
        .map((ingredient) => normalizeIngredientName(ingredient.name))
        .filter(Boolean);

      const matchedIngredients = requiredIngredients.filter((required) =>
        availableIngredients.some((available) =>
          ingredientMatches(required, available)
        )
      );
      const missingIngredients = requiredIngredients.filter(
        (required) => !matchedIngredients.includes(required)
      );

      return {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        compatibilityScore:
          requiredIngredients.length > 0
            ? matchedIngredients.length / requiredIngredients.length
            : 0,
        matchedIngredients,
        missingIngredients
      };
    })
    .sort((left, right) => right.compatibilityScore - left.compatibilityScore)
    .slice(0, 6);
}
