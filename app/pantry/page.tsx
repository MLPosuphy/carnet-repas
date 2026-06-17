import Link from "next/link";
import { Plus } from "lucide-react";
import { createPantryItemAction } from "@/app/actions";
import { PantryItemCard } from "@/components/pantry/PantryItemCard";
import { RecommendationCard } from "@/components/pantry/RecommendationCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { isExpiringSoon } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { getPantryItems } from "@/services/pantryService";
import { getRecipeRecommendations } from "@/services/recommendationService";
import { getDemoUser } from "@/services/userService";

const locations = [
  { value: "", label: "Tout" },
  { value: "fridge", label: "Frigo" },
  { value: "freezer", label: "Congélateur" },
  { value: "pantry", label: "Placard" },
  { value: "cellar", label: "Cave" },
  { value: "other", label: "Autre" }
];

export default async function PantryPage({
  searchParams
}: {
  searchParams: { location?: string };
}) {
  const user = await getDemoUser();
  const location = searchParams.location || "";
  const [items, recommendations] = await Promise.all([
    getPantryItems(user.id, location || undefined),
    getRecipeRecommendations(user.id)
  ]);
  const expiringCount = items.filter((item) => isExpiringSoon(item.expirationDate)).length;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Frigo et placard"
        description="Garde une vue simple sur les ingrédients disponibles et cuisine avec ce que tu as déjà."
      />

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Ajouter un ingrédient</h2>
          {expiringCount > 0 ? <Badge tone="red">{expiringCount} bientôt expiré(s)</Badge> : null}
        </CardHeader>
        <CardBody>
          <form action={createPantryItemAction} className="grid gap-3 md:grid-cols-6">
            <Input name="name" required placeholder="Ingrédient" className="md:col-span-2" />
            <Input name="quantity" type="number" step="0.1" placeholder="Quantité" />
            <Input name="unit" placeholder="Unité" />
            <Select name="location" defaultValue="pantry">
              <option value="fridge">Frigo</option>
              <option value="freezer">Congélateur</option>
              <option value="pantry">Placard</option>
              <option value="cellar">Cave</option>
              <option value="other">Autre</option>
            </Select>
            <Input name="expirationDate" type="date" />
            <Button type="submit" className="md:col-span-6">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </form>
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-2">
        {locations.map((item) => (
          <Link
            key={item.value || "all"}
            href={item.value ? `/pantry?location=${item.value}` : "/pantry"}
            className={cn(
              "focus-ring rounded-full px-4 py-2 text-sm font-medium transition",
              location === item.value
                ? "bg-ink text-on-primary"
                : "bg-surface-card text-muted hover:bg-surface-strong hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {items.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <PantryItemCard
              key={item.id}
              item={item}
              expiringSoon={isExpiringSoon(item.expirationDate)}
            />
          ))}
        </section>
      ) : (
        <EmptyState title="Aucun ingrédient">
          Ajoute ce que tu as sous la main pour obtenir des suggestions de recettes.
        </EmptyState>
      )}

      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">Suggestions depuis le frigo</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.recipeId}
              recommendation={recommendation}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
