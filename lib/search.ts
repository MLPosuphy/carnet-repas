import { normalizeIngredientName } from "@/lib/ingredients";

export function textMatchesQuery(text: string, query: string) {
  if (!query.trim()) {
    return true;
  }

  return normalizeIngredientName(text).includes(normalizeIngredientName(query));
}
