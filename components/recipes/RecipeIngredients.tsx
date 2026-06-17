import { formatQuantity } from "@/lib/format";

export function RecipeIngredients({
  ingredients
}: {
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number | null;
    unit: string | null;
    notes: string | null;
    optional: boolean;
    groupName: string | null;
  }>;
}) {
  if (ingredients.length === 0) {
    return (
      <p className="rounded-md bg-canvas px-3 py-2 text-sm leading-6 text-body">
        Aucun ingrédient renseigné pour le moment.
      </p>
    );
  }

  return (
    <ul className="grid gap-2">
      {ingredients.map((ingredient) => (
        <li
          key={ingredient.id}
          className="flex items-start justify-between gap-3 rounded-md bg-canvas px-3 py-2 text-sm"
        >
          <span>
            <span className="font-medium">{ingredient.name}</span>
            {ingredient.notes ? (
              <span className="text-body">, {ingredient.notes}</span>
            ) : null}
            {ingredient.optional ? (
              <span className="text-body"> optionnel</span>
            ) : null}
          </span>
          <span className="shrink-0 font-semibold">
            {formatQuantity(ingredient.quantity, ingredient.unit)}
          </span>
        </li>
      ))}
    </ul>
  );
}
