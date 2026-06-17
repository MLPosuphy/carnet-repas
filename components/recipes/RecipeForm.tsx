"use client";

import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { createRecipeAction, updateRecipeAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { InstructionStepInput, RecipeIngredientInput } from "@/types/recipe";

type IngredientDraft = RecipeIngredientInput & { id: string };
type StepDraft = InstructionStepInput & { id: string };
type RecipeFormInitialRecipe = {
  id: string;
  title: string;
  description: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: string;
  costLevel: string;
  season: string;
  sourceType: string;
  sourceName: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  personalNotes: string | null;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number | null;
    unit: string | null;
    notes: string | null;
    optional: boolean;
    groupName: string | null;
  }>;
  steps: Array<{
    id: string;
    text: string;
    timerMinutes: number | null;
    temperature: string | null;
    equipment: string | null;
    tip: string | null;
  }>;
  tags: Array<{ tag: { name: string } }>;
};

function draftId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const next = [...items];
  const target = index + direction;

  if (target < 0 || target >= items.length) {
    return next;
  }

  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const blankIngredient = (): IngredientDraft => ({
  id: draftId(),
  name: "",
  quantity: null,
  unit: "",
  notes: "",
  optional: false,
  groupName: ""
});

const blankStep = (): StepDraft => ({
  id: draftId(),
  text: "",
  timerMinutes: null,
  temperature: "",
  equipment: "",
  tip: ""
});

function recipeIngredientsToDrafts(recipe?: RecipeFormInitialRecipe) {
  if (!recipe || recipe.ingredients.length === 0) {
    return [blankIngredient()];
  }

  return recipe.ingredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit ?? "",
    notes: ingredient.notes ?? "",
    optional: ingredient.optional ?? false,
    groupName: ingredient.groupName ?? ""
  }));
}

function recipeStepsToDrafts(recipe?: RecipeFormInitialRecipe) {
  if (!recipe || recipe.steps.length === 0) {
    return [blankStep()];
  }

  return recipe.steps.map((step) => ({
    id: step.id,
    text: step.text,
    timerMinutes: step.timerMinutes ?? null,
    temperature: step.temperature ?? "",
    equipment: step.equipment ?? "",
    tip: step.tip ?? ""
  }));
}

export function RecipeForm({
  recipe
}: {
  recipe?: RecipeFormInitialRecipe;
}) {
  const isEditing = Boolean(recipe);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(() =>
    recipeIngredientsToDrafts(recipe)
  );
  const [steps, setSteps] = useState<StepDraft[]>(() => recipeStepsToDrafts(recipe));

  const ingredientsJson = useMemo(
    () => JSON.stringify(ingredients.map(({ id: _id, ...ingredient }) => ingredient)),
    [ingredients]
  );
  const stepsJson = useMemo(
    () => JSON.stringify(steps.map(({ id: _id, ...step }) => step)),
    [steps]
  );

  return (
    <form
      action={isEditing ? updateRecipeAction : createRecipeAction}
      className="grid gap-5"
    >
      {recipe ? <input type="hidden" name="id" value={recipe.id} /> : null}
      <input type="hidden" name="ingredientsJson" value={ingredientsJson} />
      <input type="hidden" name="stepsJson" value={stepsJson} />

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Informations générales</h2>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium md:col-span-2">
            Titre
            <Input
              name="title"
              required
              defaultValue={recipe?.title ?? ""}
              placeholder="Ex. Curry de lentilles corail"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium md:col-span-2">
            Description
            <Textarea
              name="description"
              defaultValue={recipe?.description ?? ""}
              placeholder="Une courte présentation de la recette"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Portions
            <Input
              name="servings"
              type="number"
              min={1}
              defaultValue={recipe?.servings ?? 4}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Préparation
            <Input
              name="prepTimeMinutes"
              type="number"
              min={0}
              defaultValue={recipe?.prepTimeMinutes ?? 10}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Cuisson
            <Input
              name="cookTimeMinutes"
              type="number"
              min={0}
              defaultValue={recipe?.cookTimeMinutes ?? 20}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Difficulté
            <Select name="difficulty" defaultValue={recipe?.difficulty ?? "easy"}>
              <option value="easy">Facile</option>
              <option value="medium">Moyenne</option>
              <option value="hard">Difficile</option>
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Coût
            <Select name="costLevel" defaultValue={recipe?.costLevel ?? "medium"}>
              <option value="low">Bas</option>
              <option value="medium">Moyen</option>
              <option value="high">Élevé</option>
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Saison
            <Select name="season" defaultValue={recipe?.season ?? "all_year"}>
              <option value="all_year">Toute l'année</option>
              <option value="spring">Printemps</option>
              <option value="summer">Été</option>
              <option value="autumn">Automne</option>
              <option value="winter">Hiver</option>
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium md:col-span-2">
            Tags
            <Input
              name="tags"
              defaultValue={recipe?.tags.map(({ tag }) => tag.name).join(", ") ?? ""}
              placeholder="rapide, végétarien, lunchbox"
            />
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Ingrédients</h2>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIngredients((current) => [...current, blankIngredient()])}
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </CardHeader>
        <CardBody className="grid gap-3">
          {ingredients.map((ingredient, index) => (
            <div
              key={ingredient.id}
              className="grid gap-2 rounded-md border border-hairline bg-canvas p-3 md:grid-cols-[1.2fr_0.45fr_0.45fr_1fr_auto]"
            >
              <Input
                value={ingredient.name}
                placeholder="Nom"
                required={index === 0}
                onChange={(event) =>
                  setIngredients((current) =>
                    current.map((item) =>
                      item.id === ingredient.id
                        ? { ...item, name: event.target.value }
                        : item
                    )
                  )
                }
              />
              <Input
                value={ingredient.quantity ?? ""}
                type="number"
                step="0.1"
                placeholder="Qté"
                onChange={(event) =>
                  setIngredients((current) =>
                    current.map((item) =>
                      item.id === ingredient.id
                        ? {
                            ...item,
                            quantity:
                              event.target.value === ""
                                ? null
                                : Number(event.target.value)
                          }
                        : item
                    )
                  )
                }
              />
              <Input
                value={ingredient.unit ?? ""}
                placeholder="Unité"
                onChange={(event) =>
                  setIngredients((current) =>
                    current.map((item) =>
                      item.id === ingredient.id
                        ? { ...item, unit: event.target.value }
                        : item
                    )
                  )
                }
              />
              <Input
                value={ingredient.notes ?? ""}
                placeholder="Notes"
                onChange={(event) =>
                  setIngredients((current) =>
                    current.map((item) =>
                      item.id === ingredient.id
                        ? { ...item, notes: event.target.value }
                        : item
                    )
                  )
                }
              />
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setIngredients((current) => moveItem(current, index, -1))}
                  aria-label="Monter"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setIngredients((current) => moveItem(current, index, 1))}
                  aria-label="Descendre"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="danger"
                  onClick={() =>
                    setIngredients((current) =>
                      current.length === 1
                        ? [blankIngredient()]
                        : current.filter((item) => item.id !== ingredient.id)
                    )
                  }
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Étapes</h2>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSteps((current) => [...current, blankStep()])}
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </CardHeader>
        <CardBody className="grid gap-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="grid gap-2 rounded-md border border-hairline bg-canvas p-3"
            >
              <Textarea
                value={step.text}
                required={index === 0}
                placeholder={`Étape ${index + 1}`}
                onChange={(event) =>
                  setSteps((current) =>
                    current.map((item) =>
                      item.id === step.id ? { ...item, text: event.target.value } : item
                    )
                  )
                }
              />
              <div className="grid gap-2 md:grid-cols-[0.5fr_0.7fr_1fr_1fr_auto]">
                <Input
                  value={step.timerMinutes ?? ""}
                  type="number"
                  min={0}
                  placeholder="Timer"
                  onChange={(event) =>
                    setSteps((current) =>
                      current.map((item) =>
                        item.id === step.id
                          ? {
                              ...item,
                              timerMinutes:
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value)
                            }
                          : item
                      )
                    )
                  }
                />
                <Input
                  value={step.temperature ?? ""}
                  placeholder="Température"
                  onChange={(event) =>
                    setSteps((current) =>
                      current.map((item) =>
                        item.id === step.id
                          ? { ...item, temperature: event.target.value }
                          : item
                      )
                    )
                  }
                />
                <Input
                  value={step.equipment ?? ""}
                  placeholder="Matériel"
                  onChange={(event) =>
                    setSteps((current) =>
                      current.map((item) =>
                        item.id === step.id
                          ? { ...item, equipment: event.target.value }
                          : item
                      )
                    )
                  }
                />
                <Input
                  value={step.tip ?? ""}
                  placeholder="Astuce"
                  onChange={(event) =>
                    setSteps((current) =>
                      current.map((item) =>
                        item.id === step.id ? { ...item, tip: event.target.value } : item
                      )
                    )
                  }
                />
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setSteps((current) => moveItem(current, index, -1))}
                    aria-label="Monter"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setSteps((current) => moveItem(current, index, 1))}
                    aria-label="Descendre"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="danger"
                    onClick={() =>
                      setSteps((current) =>
                        current.length === 1
                          ? [blankStep()]
                          : current.filter((item) => item.id !== step.id)
                      )
                    }
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Notes et source</h2>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Type de source
            <Select name="sourceType" defaultValue={recipe?.sourceType ?? "personal"}>
              <option value="personal">Personnelle</option>
              <option value="family">Famille</option>
              <option value="website">Site web</option>
              <option value="book">Livre</option>
              <option value="friend">Ami</option>
              <option value="imported">Importée</option>
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Nom de source
            <Input
              name="sourceName"
              defaultValue={recipe?.sourceName ?? ""}
              placeholder="Ex. Carnet familial"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            URL source
            <Input
              name="sourceUrl"
              type="url"
              defaultValue={recipe?.sourceUrl ?? ""}
              placeholder="https://..."
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Image
            <Input
              name="imageUrl"
              type="url"
              defaultValue={recipe?.imageUrl ?? ""}
              placeholder="https://..."
            />
          </label>
          <label className="grid gap-1 text-sm font-medium md:col-span-2">
            Notes personnelles
            <Textarea name="personalNotes" defaultValue={recipe?.personalNotes ?? ""} />
          </label>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg">
          {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isEditing ? "Enregistrer les modifications" : "Créer la recette"}
        </Button>
      </div>
    </form>
  );
}
