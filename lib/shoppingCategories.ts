import type { ShoppingCategory } from "@/types/shopping";
import { normalizeIngredientName } from "@/lib/ingredients";

const CATEGORY_MAP: Record<ShoppingCategory, string[]> = {
  fruits_vegetables: [
    "tomate",
    "carotte",
    "oignon",
    "courgette",
    "pomme",
    "citron",
    "concombre",
    "epinard",
    "ail"
  ],
  fresh: ["lait", "creme", "fromage", "feta", "parmesan", "yaourt", "beurre", "oeuf"],
  meat_fish: ["poulet", "boeuf", "saumon", "thon", "jambon"],
  dry_goods: ["riz", "pate", "lentille", "pois chiche", "farine", "sucre"],
  spices: ["sel", "poivre", "curry", "paprika", "cumin", "cannelle"],
  bakery: ["pain", "baguette", "brioche"],
  frozen: ["surgelé", "surgele"],
  drinks: ["eau", "jus", "vin"],
  household: ["papier", "lessive"],
  other: []
};

export function guessShoppingCategory(ingredientName: string): ShoppingCategory {
  const normalized = normalizeIngredientName(ingredientName);

  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category as ShoppingCategory;
    }
  }

  return "other";
}
