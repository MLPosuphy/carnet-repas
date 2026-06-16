import { ShoppingBasket } from "lucide-react";
import { generateWeekShoppingListAction } from "@/app/actions";
import { MealPlanWeekView } from "@/components/meal-plan/MealPlanWeekView";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { getOrCreateCurrentMealPlan } from "@/services/mealPlanService";
import { getRecipesForSelect } from "@/services/recipeService";
import { getDemoUser } from "@/services/userService";

export default async function MealPlanPage() {
  const user = await getDemoUser();
  const [mealPlan, recipes] = await Promise.all([
    getOrCreateCurrentMealPlan(user.id),
    getRecipesForSelect(user.id)
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Planning repas"
        description="Planifie une semaine simple et transforme-la en liste de courses."
        actions={
          <form action={generateWeekShoppingListAction}>
            <Button type="submit" variant="secondary">
              <ShoppingBasket className="h-4 w-4" />
              Courses de la semaine
            </Button>
          </form>
        }
      />
      <MealPlanWeekView mealPlan={mealPlan} recipes={recipes} />
    </div>
  );
}
