import { Plus, Wand2 } from "lucide-react";
import { addShoppingItemAction, generateShoppingFromRecipesAction } from "@/app/actions";
import { ShoppingListItemRow } from "@/components/shopping/ShoppingListItemRow";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { labelFromValue } from "@/lib/format";
import { getRecipesWithIngredientsForSelect } from "@/services/recipeService";
import { getOrCreateActiveShoppingList } from "@/services/shoppingService";
import { getDemoUser } from "@/services/userService";

export default async function ShoppingPage() {
  const user = await getDemoUser();
  const [shoppingList, recipes] = await Promise.all([
    getOrCreateActiveShoppingList(user.id),
    getRecipesWithIngredientsForSelect(user.id)
  ]);
  const groupedItems = shoppingList.items.reduce<Record<string, typeof shoppingList.items>>(
    (groups, item) => {
      groups[item.category] = groups[item.category] ?? [];
      groups[item.category].push(item);
      return groups;
    },
    {}
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Liste de courses"
        description="Ajoute des items à la main ou génère une liste depuis une ou plusieurs recettes."
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Ajouter un item</h2>
          </CardHeader>
          <CardBody>
            <form action={addShoppingItemAction} className="grid gap-3 md:grid-cols-4">
              <Input name="name" required placeholder="Nom" className="md:col-span-2" />
              <Input name="quantity" type="number" step="0.1" placeholder="Qté" />
              <Input name="unit" placeholder="Unité" />
              <Input name="notes" placeholder="Notes" className="md:col-span-3" />
              <Button type="submit">
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Générer depuis des recettes</h2>
          </CardHeader>
          <CardBody>
            <form action={generateShoppingFromRecipesAction} className="grid gap-3">
              <div className="grid max-h-60 gap-2 overflow-auto pr-1">
                {recipes.length > 0 ? (
                  recipes.map((recipe) => (
                    <label
                      key={recipe.id}
                      className="grid gap-2 rounded-md bg-cream p-2 text-sm md:grid-cols-[auto_1fr_90px]"
                    >
                      <input name="recipeId" type="checkbox" value={recipe.id} className="mt-2 h-4 w-4" />
                      <span className="font-medium">{recipe.title}</span>
                      <Input
                        name={`servings-${recipe.id}`}
                        type="number"
                        min={1}
                        defaultValue={recipe.servings}
                        aria-label={`Portions ${recipe.title}`}
                      />
                    </label>
                  ))
                ) : (
                  <p className="rounded-md bg-cream px-3 py-2 text-sm text-[#6d6257]">
                    Complète au moins une recette avec des ingrédients pour générer une
                    liste automatiquement.
                  </p>
                )}
              </div>
              <Button type="submit" disabled={recipes.length === 0}>
                <Wand2 className="h-4 w-4" />
                Générer
              </Button>
            </form>
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">{shoppingList.title}</h2>
        {shoppingList.items.length > 0 ? (
          <div className="grid gap-5">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="grid gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-normal text-[#6d6257]">
                  {labelFromValue(category)}
                </h3>
                {items.map((item) => (
                  <ShoppingListItemRow key={item.id} item={item} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Aucune course">
            Ajoute un item ou génère une liste depuis tes recettes.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
