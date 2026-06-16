import { notFound } from "next/navigation";
import { CookModeStep } from "@/components/recipes/CookModeStep";
import { PageHeader } from "@/components/ui/PageHeader";
import { getRecipeById } from "@/services/recipeService";

export default async function CookRecipePage({
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
        title="Mode cuisson"
        description="Avance étape par étape et enregistre ton retour à la fin."
      />
      <CookModeStep
        recipeId={recipe.id}
        title={recipe.title}
        defaultServings={recipe.servings}
        steps={recipe.steps}
      />
    </div>
  );
}
