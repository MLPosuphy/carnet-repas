import { Clock, Eye, Star } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDuration, labelFromValue } from "@/lib/format";
import { isRecipeToComplete, type RecipeWithDetails } from "@/services/recipeService";

export function RecipeCard({ recipe }: { recipe: RecipeWithDetails }) {
  const toComplete = isRecipeToComplete(recipe);

  return (
    <Card className="overflow-hidden">
      {recipe.imageUrl ? (
        <img
          src={recipe.imageUrl}
          alt=""
          className="h-44 w-full object-cover"
          loading="lazy"
        />
      ) : null}
      <div className="grid gap-4 p-4">
        <div>
          <h2 className="line-clamp-2 text-lg font-semibold">{recipe.title}</h2>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-body">
            {recipe.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {formatDuration(recipe.totalTimeMinutes)}
          </span>
          {toComplete ? (
            <Badge tone="gold">À compléter</Badge>
          ) : (
            <>
              <Badge tone="blue">{labelFromValue(recipe.difficulty)}</Badge>
              <Badge tone="gold">{labelFromValue(recipe.costLevel)}</Badge>
            </>
          )}
          <span className="inline-flex items-center gap-1">
            <Star className="h-4 w-4 text-brand-ochre" aria-hidden="true" />
            {recipe.averageRating ? recipe.averageRating.toFixed(1) : "Nouveau"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {recipe.tags.slice(0, 4).map(({ tag }) => (
            <Badge key={tag.id} tone="green">
              {tag.name}
            </Badge>
          ))}
        </div>
        <Link
          href={`/recipes/${recipe.id}`}
          className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-hairline bg-canvas px-4 text-sm font-medium transition hover:bg-surface-card"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          Voir
        </Link>
      </div>
    </Card>
  );
}
