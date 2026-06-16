import { RecipeForm } from "@/components/recipes/RecipeForm";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewRecipePage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Nouvelle recette"
        description="Ajoute les ingrédients, les étapes, les notes et la source de ta recette."
      />
      <RecipeForm />
    </div>
  );
}
