import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import type { RecipeRecommendation } from "@/types/recipe";

export function RecommendationCard({
  recommendation
}: {
  recommendation: RecipeRecommendation;
}) {
  const percent = Math.round(recommendation.compatibilityScore * 100);

  return (
    <Card>
      <CardBody className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-semibold">{recommendation.recipeTitle}</h2>
          <Badge tone={percent >= 70 ? "green" : percent >= 40 ? "gold" : "neutral"}>
            {percent}%
          </Badge>
        </div>
        <div className="grid gap-2 text-sm">
          <p className="font-medium">Disponibles</p>
          <div className="flex flex-wrap gap-1">
            {recommendation.matchedIngredients.length > 0 ? (
              recommendation.matchedIngredients.map((ingredient) => (
                <Badge key={ingredient} tone="green">
                  {ingredient}
                </Badge>
              ))
            ) : (
              <span className="text-body">Aucun ingrédient trouvé.</span>
            )}
          </div>
          <p className="font-medium">Manquants</p>
          <div className="flex flex-wrap gap-1">
            {recommendation.missingIngredients.slice(0, 5).map((ingredient) => (
              <Badge key={ingredient}>{ingredient}</Badge>
            ))}
          </div>
        </div>
        <Link
          href={`/recipes/${recommendation.recipeId}`}
          className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-hairline bg-canvas px-4 text-sm font-medium transition hover:bg-surface-card"
        >
          Voir la recette
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardBody>
    </Card>
  );
}
