import { Trash2 } from "lucide-react";
import {
  addMealPlanEntryAction,
  deleteMealPlanEntryAction
} from "@/app/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { getWeekDays, toDateInputValue } from "@/lib/dates";

const mealLabels: Record<string, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Snack"
};

export function MealPlanWeekView({
  mealPlan,
  recipes
}: {
  mealPlan: {
    startDate: Date;
    entries: Array<{
      id: string;
      date: Date;
      mealType: string;
      servings: number;
      notes: string | null;
      recipe: {
        title: string;
      };
    }>;
  };
  recipes: Array<{ id: string; title: string; servings: number }>;
}) {
  const days = getWeekDays(mealPlan.startDate);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Ajouter un repas</h2>
        </CardHeader>
        <CardBody>
          <form action={addMealPlanEntryAction} className="grid gap-3 md:grid-cols-6">
            <Input name="date" type="date" defaultValue={toDateInputValue(days[0])} />
            <Select name="mealType" defaultValue="dinner">
              <option value="breakfast">Petit-déjeuner</option>
              <option value="lunch">Déjeuner</option>
              <option value="dinner">Dîner</option>
              <option value="snack">Snack</option>
            </Select>
            <Select name="recipeId" required className="md:col-span-2">
              <option value="">Recette</option>
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.title}
                </option>
              ))}
            </Select>
            <Input name="servings" type="number" min={1} defaultValue={4} />
            <Button type="submit">Ajouter</Button>
          </form>
        </CardBody>
      </Card>

      <div className="grid gap-3 lg:grid-cols-7">
        {days.map((day) => {
          const entries = mealPlan.entries.filter(
            (entry) => toDateInputValue(entry.date) === toDateInputValue(day)
          );

          return (
            <Card key={day.toISOString()} className="min-h-48">
              <CardHeader>
                <h2 className="text-sm font-semibold capitalize">
                  {day.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "short"
                  })}
                </h2>
              </CardHeader>
              <CardBody className="grid gap-2">
                {entries.length > 0 ? (
                  entries.map((entry) => (
                    <div key={entry.id} className="rounded-md bg-canvas p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge tone="blue">{mealLabels[entry.mealType]}</Badge>
                          <p className="mt-2 text-sm font-semibold">
                            {entry.recipe.title}
                          </p>
                          <p className="text-xs text-body">
                            {entry.servings} portion(s)
                          </p>
                        </div>
                        <form action={deleteMealPlanEntryAction}>
                          <input type="hidden" name="id" value={entry.id} />
                          <Button
                            type="submit"
                            size="icon"
                            variant="ghost"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-body">Aucun repas.</p>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
