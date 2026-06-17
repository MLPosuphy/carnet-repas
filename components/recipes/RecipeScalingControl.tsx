"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { formatQuantity } from "@/lib/format";
import { scaleAndRoundQuantity } from "@/lib/scaling";

export function RecipeScalingControl({
  originalServings,
  ingredients
}: {
  originalServings: number;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number | null;
    unit: string | null;
  }>;
}) {
  const [targetServings, setTargetServings] = useState(originalServings);

  if (ingredients.length === 0) {
    return (
      <p className="rounded-md bg-canvas px-3 py-2 text-sm leading-6 text-body">
        Ajoute des ingrédients pour pouvoir adapter les portions.
      </p>
    );
  }

  return (
    <section className="grid gap-4">
      <label className="grid max-w-xs gap-1 text-sm font-medium">
        Adapter les portions
        <Input
          type="number"
          min={1}
          value={targetServings}
          onChange={(event) =>
            setTargetServings(Math.max(1, Number(event.target.value) || 1))
          }
        />
      </label>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-hairline text-muted">
            <tr>
              <th className="py-2 font-medium">Ingrédient</th>
              <th className="py-2 font-medium">Original</th>
              <th className="py-2 font-medium">Ajusté</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ingredient) => (
              <tr key={ingredient.id} className="border-b border-hairline">
                <td className="py-2 font-medium">{ingredient.name}</td>
                <td className="py-2">
                  {formatQuantity(ingredient.quantity, ingredient.unit)}
                </td>
                <td className="py-2 font-semibold">
                  {formatQuantity(
                    scaleAndRoundQuantity(
                      ingredient.quantity,
                      originalServings,
                      targetServings,
                      ingredient.unit
                    ),
                    ingredient.unit
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
