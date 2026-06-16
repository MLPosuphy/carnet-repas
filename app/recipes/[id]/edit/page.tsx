import { notFound } from "next/navigation";
import { RecipeForm } from "@/components/recipes/RecipeForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getRecipeById } from "@/services/recipeService";

export default async function EditRecipePage({
  params
}: {
  params: { id: string };
}) {
  const recipe = await getRecipeById(params.id);

  if (!recipe) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Modifier ${recipe.title}`}
        description="Complète ou corrige les ingrédients, les étapes, les temps et les notes de cette recette."
      />
      <RecipeForm recipe={recipe} />
    </div>
  );
}
