export type Difficulty = "easy" | "medium" | "hard";
export type CostLevel = "low" | "medium" | "high";
export type Season = "spring" | "summer" | "autumn" | "winter" | "all_year";
export type SourceType = "personal" | "family" | "website" | "book" | "friend" | "imported";

export type RecipeIngredientInput = {
  name: string;
  quantity: number | null;
  unit?: string;
  notes?: string;
  optional?: boolean;
  groupName?: string;
};

export type InstructionStepInput = {
  text: string;
  timerMinutes?: number | null;
  temperature?: string;
  equipment?: string;
  tip?: string;
};

export type RecipeRecommendation = {
  recipeId: string;
  recipeTitle: string;
  compatibilityScore: number;
  matchedIngredients: string[];
  missingIngredients: string[];
};
