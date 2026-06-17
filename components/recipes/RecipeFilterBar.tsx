import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchBar } from "@/components/ui/SearchBar";
import { Select } from "@/components/ui/Select";

export function RecipeFilterBar({
  tags,
  searchParams
}: {
  tags: Array<{ id: string; name: string }>;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const value = (key: string) => {
    const raw = searchParams[key];
    return Array.isArray(raw) ? raw[0] : raw ?? "";
  };

  return (
    <form className="grid gap-3 rounded-lg border border-hairline bg-surface-card p-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr_1fr_1fr_auto]">
      <SearchBar defaultValue={value("q")} placeholder="Nom ou description" />
      <Select name="tag" defaultValue={value("tag")}>
        <option value="">Tous les tags</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.name}>
            {tag.name}
          </option>
        ))}
      </Select>
      <Select name="difficulty" defaultValue={value("difficulty")}>
        <option value="">Toutes difficultés</option>
        <option value="easy">Facile</option>
        <option value="medium">Moyenne</option>
        <option value="hard">Difficile</option>
      </Select>
      <Select name="cost" defaultValue={value("cost")}>
        <option value="">Tous coûts</option>
        <option value="low">Bas</option>
        <option value="medium">Moyen</option>
        <option value="high">Élevé</option>
      </Select>
      <Input name="maxTime" type="number" min={0} placeholder="Temps max" defaultValue={value("maxTime")} />
      <Select name="status" defaultValue={value("status")}>
        <option value="">Tous statuts</option>
        <option value="to_complete">À compléter</option>
        <option value="ready">Prêtes</option>
      </Select>
      <Select name="sort" defaultValue={value("sort") || "recent"}>
        <option value="recent">Plus récent</option>
        <option value="rating">Mieux noté</option>
        <option value="fastest">Plus rapide</option>
        <option value="alphabetical">A-Z</option>
      </Select>
      <Button type="submit">
        <Filter className="h-4 w-4" />
        <Search className="h-4 w-4 md:hidden" />
        <span className="hidden md:inline">Filtrer</span>
      </Button>
    </form>
  );
}
