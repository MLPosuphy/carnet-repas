import { Plus } from "lucide-react";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { RecipeFilterBar } from "@/components/recipes/RecipeFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAllTags, getRecipes } from "@/services/recipeService";
import { getDemoUser } from "@/services/userService";

export default async function RecipesPage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await getDemoUser();
  const value = (key: string) => {
    const raw = searchParams[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const [recipes, tags] = await Promise.all([
    getRecipes(user.id, {
      query: value("q"),
      tag: value("tag"),
      difficulty: value("difficulty"),
      costLevel: value("cost"),
      maxTime: value("maxTime") ? Number(value("maxTime")) : null,
      status: value("status"),
      sort: value("sort")
    }),
    getAllTags()
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Bibliothèque de recettes"
        description="Recherche, filtre et retrouve les recettes de ton carnet."
        actions={
          <LinkButton href="/recipes/new">
            <Plus className="h-4 w-4" />
            Ajouter
          </LinkButton>
        }
      />
      <RecipeFilterBar tags={tags} searchParams={searchParams} />
      {recipes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <EmptyState title="Aucune recette trouvée">
          Essaie de retirer un filtre ou crée une nouvelle recette.
        </EmptyState>
      )}
    </div>
  );
}
