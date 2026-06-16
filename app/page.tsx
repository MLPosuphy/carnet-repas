import {
  BookOpen,
  CalendarDays,
  ChefHat,
  Plus,
  Refrigerator,
  ShoppingBasket
} from "lucide-react";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatQuantity } from "@/lib/format";
import { getExpiringPantryItems } from "@/services/pantryService";
import {
  getRecentRecipes,
  getRecipeCompletionStats,
  getRecipesToCookSoon
} from "@/services/recipeService";
import { getDemoUser } from "@/services/userService";

const shortcuts = [
  { href: "/recipes/new", label: "Ajouter une recette", icon: Plus },
  { href: "/recipes", label: "Voir les recettes", icon: BookOpen },
  { href: "/chapters", label: "Chapitres", icon: ChefHat },
  { href: "/pantry", label: "Frigo", icon: Refrigerator },
  { href: "/shopping", label: "Liste de courses", icon: ShoppingBasket },
  { href: "/meal-plan", label: "Planning", icon: CalendarDays }
];

export default async function HomePage() {
  const user = await getDemoUser();
  const [recipeStats, recentRecipes, cookSoon, expiringItems] = await Promise.all([
    getRecipeCompletionStats(user.id),
    getRecentRecipes(user.id, 3),
    getRecipesToCookSoon(user.id, 3),
    getExpiringPantryItems(user.id)
  ]);

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Livre de cuisine personnalisé"
        description="Un carnet culinaire pour organiser tes recettes, tes essais, ton frigo, tes menus et tes courses."
        actions={
          <LinkButton href="/recipes/new">
            <Plus className="h-4 w-4" />
            Nouvelle recette
          </LinkButton>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardBody className="grid gap-3">
            <p className="text-sm font-medium text-[#6d6257]">Recettes dans le carnet</p>
            <p className="text-5xl font-semibold">{recipeStats.total}</p>
            <p className="text-sm leading-6 text-[#6d6257]">
              Ton livre local est prêt à grandir avec tes variantes, notes et repas
              favoris.
            </p>
            {recipeStats.toComplete > 0 ? (
              <LinkButton href="/recipes?status=to_complete" variant="secondary">
                {recipeStats.toComplete} à compléter
              </LinkButton>
            ) : (
              <Badge tone="green">Toutes les recettes sont prêtes</Badge>
            )}
          </CardBody>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <LinkButton
                key={shortcut.href}
                href={shortcut.href}
                variant="secondary"
                className="h-16 justify-start"
              >
                <Icon className="h-5 w-5" />
                {shortcut.label}
              </LinkButton>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Recettes récentes</h2>
          <LinkButton href="/recipes" variant="ghost">
            Tout voir
          </LinkButton>
        </div>
        {recentRecipes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recentRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <EmptyState title="Aucune recette pour le moment">
            Ajoute ta première recette pour commencer ton livre de cuisine personnalisé.
          </EmptyState>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody className="grid gap-4">
            <h2 className="text-xl font-semibold">À cuisiner bientôt</h2>
            {cookSoon.length > 0 ? (
              <div className="grid gap-2">
                {cookSoon.map((recipe) => (
                  <LinkButton
                    key={recipe.id}
                    href={`/recipes/${recipe.id}`}
                    variant="secondary"
                    className="h-auto justify-between py-3"
                  >
                    <span>{recipe.title}</span>
                    <Badge tone="gold">
                      {recipe.averageRating ? `${recipe.averageRating.toFixed(1)}/5` : "à tester"}
                    </Badge>
                  </LinkButton>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#6d6257]">Aucune suggestion pour le moment.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="grid gap-4">
            <h2 className="text-xl font-semibold">Ingrédients à utiliser rapidement</h2>
            {expiringItems.length > 0 ? (
              <div className="grid gap-2">
                {expiringItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md bg-cream px-3 py-2"
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-[#6d6257]">
                      {formatQuantity(item.quantity, item.unit)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#6d6257]">
                Rien ne semble expirer dans les trois prochains jours.
              </p>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
