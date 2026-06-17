import { Plus } from "lucide-react";
import { createChapterAction } from "@/app/actions";
import { ChapterCard } from "@/components/chapters/ChapterCard";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { getChapters } from "@/services/chapterService";
import { getRecipesForSelect } from "@/services/recipeService";
import { getDemoUser } from "@/services/userService";

export default async function ChaptersPage() {
  const user = await getDemoUser();
  const [chapters, recipes] = await Promise.all([
    getChapters(user.id),
    getRecipesForSelect(user.id)
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Chapitres"
        description="Organise ton carnet comme un vrai livre de cuisine personnel."
      />

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Créer un chapitre</h2>
        </CardHeader>
        <CardBody>
          <form action={createChapterAction} className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto_auto]">
            <Input name="title" required placeholder="Ex. Recettes de famille" />
            <Input name="description" placeholder="Description courte" />
            <Input name="color" type="color" defaultValue="#e8b94a" aria-label="Couleur" className="w-16 px-1" />
            <Button type="submit">
              <Plus className="h-4 w-4" />
              Créer
            </Button>
          </form>
        </CardBody>
      </Card>

      {chapters.length > 0 ? (
        <div className="grid gap-4">
          {chapters.map((chapter) => (
            <ChapterCard key={chapter.id} chapter={chapter} recipes={recipes} />
          ))}
        </div>
      ) : (
        <EmptyState title="Aucun chapitre">
          Crée une première section pour organiser tes recettes préférées.
        </EmptyState>
      )}
    </div>
  );
}
