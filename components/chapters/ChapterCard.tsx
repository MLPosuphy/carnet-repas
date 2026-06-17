import { Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import {
  addRecipeToChapterAction,
  deleteChapterAction,
  removeRecipeFromChapterAction,
  updateChapterAction
} from "@/app/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type ChapterCardProps = {
  chapter: {
    id: string;
    title: string;
    description: string | null;
    color: string;
    recipes: Array<{
      recipe: {
        id: string;
        title: string;
        totalTimeMinutes: number;
        tags: Array<{ tag: { id: string; name: string } }>;
      };
    }>;
  };
  recipes: Array<{ id: string; title: string }>;
};

export function ChapterCard({ chapter, recipes }: ChapterCardProps) {
  return (
    <Card>
      <CardHeader>
        <form action={updateChapterAction} className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto]">
          <input type="hidden" name="id" value={chapter.id} />
          <Input name="title" defaultValue={chapter.title} required />
          <Input
            name="description"
            defaultValue={chapter.description ?? ""}
            placeholder="Description"
          />
          <div className="flex gap-2">
            <Input
              name="color"
              type="color"
              defaultValue={chapter.color}
              className="w-12 px-1"
              aria-label="Couleur"
            />
            <Button type="submit" variant="secondary">
              Sauver
            </Button>
          </div>
        </form>
      </CardHeader>
      <CardBody className="grid gap-4">
        <form action={addRecipeToChapterAction} className="grid gap-2 md:grid-cols-[1fr_auto]">
          <input type="hidden" name="chapterId" value={chapter.id} />
          <Select name="recipeId" required>
            <option value="">Ajouter une recette</option>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.title}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </form>

        {chapter.recipes.length > 0 ? (
          <div className="grid gap-2">
            {chapter.recipes.map(({ recipe }) => (
              <div
                key={recipe.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-canvas px-3 py-2"
              >
                <Link href={`/recipes/${recipe.id}`} className="font-medium hover:underline">
                  {recipe.title}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  {recipe.tags.slice(0, 2).map(({ tag }) => (
                    <Badge key={tag.id} tone="green">
                      {tag.name}
                    </Badge>
                  ))}
                  <form action={removeRecipeFromChapterAction}>
                    <input type="hidden" name="chapterId" value={chapter.id} />
                    <input type="hidden" name="recipeId" value={recipe.id} />
                    <Button type="submit" size="icon" variant="ghost" aria-label="Retirer">
                      <X className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md bg-canvas px-3 py-2 text-sm text-body">
            Aucune recette dans ce chapitre.
          </p>
        )}

        <form action={deleteChapterAction} className="flex justify-end">
          <input type="hidden" name="id" value={chapter.id} />
          <Button type="submit" variant="danger">
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
