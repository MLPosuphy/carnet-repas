import { AlertCircle, CalendarDays, ChefHat, Pencil, ShoppingBasket } from "lucide-react";
import { notFound } from "next/navigation";
import { addRecipeToShoppingListAction } from "@/app/actions";
import { RecipeIngredients } from "@/components/recipes/RecipeIngredients";
import { RecipeScalingControl } from "@/components/recipes/RecipeScalingControl";
import { RecipeSteps } from "@/components/recipes/RecipeSteps";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { QuantityInput } from "@/components/ui/QuantityInput";
import { formatDuration, labelFromValue } from "@/lib/format";
import { getRecipeById, isRecipeToComplete } from "@/services/recipeService";

export default async function RecipeDetailPage({
  params
}: {
  params: { id: string };
}) {
  const recipe = await getRecipeById(params.id);

  if (!recipe) {
    notFound();
  }

  const toComplete = isRecipeToComplete(recipe);
  const hasIngredients = recipe.ingredients.length > 0;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={recipe.title}
        description={recipe.description}
        actions={
          <>
            <LinkButton href={`/recipes/${recipe.id}/edit`} variant="secondary">
              <Pencil className="h-4 w-4" />
              Modifier
            </LinkButton>
            <LinkButton href={`/recipes/${recipe.id}/cook`}>
              <ChefHat className="h-4 w-4" />
              Cuisiner
            </LinkButton>
            {hasIngredients ? (
              <form action={addRecipeToShoppingListAction.bind(null, recipe.id)}>
                <input type="hidden" name="servings" value={recipe.servings} />
                <Button type="submit" variant="secondary">
                  <ShoppingBasket className="h-4 w-4" />
                  Ajouter aux courses
                </Button>
              </form>
            ) : null}
          </>
        }
      />

      {toComplete ? (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-brass" aria-hidden="true" />
              <div>
                <h2 className="font-semibold">Recette à compléter</h2>
                <p className="text-sm leading-6 text-[#6d6257]">
                  Cette fiche vient de l'import Excel. Ajoute ses ingrédients et ses
                  étapes pour activer les courses et les recommandations.
                </p>
              </div>
            </div>
            <LinkButton href={`/recipes/${recipe.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Compléter
            </LinkButton>
          </CardBody>
        </Card>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt=""
              className="h-72 w-full object-cover"
              loading="lazy"
            />
          ) : null}
          <CardBody className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{formatDuration(recipe.totalTimeMinutes)}</Badge>
              {toComplete ? <Badge tone="gold">À compléter</Badge> : null}
              <Badge tone="green">{labelFromValue(recipe.difficulty)}</Badge>
              <Badge tone="gold">{labelFromValue(recipe.costLevel)}</Badge>
              <Badge>{recipe.servings} portion(s)</Badge>
              {recipe.tags.map(({ tag }) => (
                <Badge key={tag.id} tone="green">
                  {tag.name}
                </Badge>
              ))}
            </div>
            {recipe.personalNotes ? (
              <p className="rounded-md bg-cream px-3 py-2 text-sm leading-6 text-[#5f554c]">
                {recipe.personalNotes}
              </p>
            ) : null}
            <div className="grid gap-2 text-sm text-[#6d6257] sm:grid-cols-2">
              <p>Préparation : {formatDuration(recipe.prepTimeMinutes)}</p>
              <p>Cuisson : {formatDuration(recipe.cookTimeMinutes)}</p>
              <p>Source : {labelFromValue(recipe.sourceType)}</p>
              {recipe.sourceName ? <p>Nom : {recipe.sourceName}</p> : null}
              {recipe.sourceUrl ? (
                <a href={recipe.sourceUrl} className="font-medium text-blueberry hover:underline">
                  Source en ligne
                </a>
              ) : null}
            </div>
          </CardBody>
        </Card>

        {hasIngredients ? (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Liste de courses rapide</h2>
            </CardHeader>
            <CardBody>
              <form
                action={addRecipeToShoppingListAction.bind(null, recipe.id)}
                className="grid gap-3"
              >
                <QuantityInput defaultValue={recipe.servings} />
                <Button type="submit">
                  <ShoppingBasket className="h-4 w-4" />
                  Générer pour cette recette
                </Button>
              </form>
            </CardBody>
          </Card>
        ) : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Ingrédients</h2>
          </CardHeader>
          <CardBody>
            <RecipeIngredients ingredients={recipe.ingredients} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Portions ajustées</h2>
          </CardHeader>
          <CardBody>
            <RecipeScalingControl
              originalServings={recipe.servings}
              ingredients={recipe.ingredients}
            />
          </CardBody>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Étapes</h2>
        </CardHeader>
        <CardBody>
          <RecipeSteps steps={recipe.steps} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Sessions de cuisson</h2>
        </CardHeader>
        <CardBody className="grid gap-3">
          {recipe.cookingSessions.length > 0 ? (
            recipe.cookingSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-md border border-[#eee6da] bg-paper p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#6d6257]" aria-hidden="true" />
                  <span className="font-medium">
                    {session.cookedAt.toLocaleDateString("fr-FR")}
                  </span>
                  {session.rating ? <Badge tone="gold">{session.rating}/5</Badge> : null}
                  {session.wouldCookAgain ? <Badge tone="green">à refaire</Badge> : null}
                </div>
                {session.notes ? (
                  <p className="mt-2 text-sm leading-6 text-[#6d6257]">{session.notes}</p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-[#6d6257]">
              Aucune session enregistrée pour cette recette.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
