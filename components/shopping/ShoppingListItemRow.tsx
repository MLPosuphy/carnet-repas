import { Check, Trash2 } from "lucide-react";
import {
  deleteShoppingItemAction,
  toggleShoppingItemAction
} from "@/app/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatQuantity, labelFromValue } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ShoppingListItemRow({
  item
}: {
  item: {
    id: string;
    name: string;
    quantity: number | null;
    unit: string | null;
    category: string;
    checked: boolean;
    notes: string | null;
  };
}) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-md border border-[#eee6da] bg-white p-3 md:grid-cols-[auto_1fr_auto_auto]",
        item.checked && "opacity-60"
      )}
    >
      <form action={toggleShoppingItemAction}>
        <input type="hidden" name="id" value={item.id} />
        <Button
          type="submit"
          size="icon"
          variant={item.checked ? "secondary" : "ghost"}
          aria-label={item.checked ? "Décocher" : "Cocher"}
        >
          <Check className="h-4 w-4" />
        </Button>
      </form>
      <div>
        <p className={cn("font-medium", item.checked && "line-through")}>{item.name}</p>
        <p className="text-sm text-[#6d6257]">
          {formatQuantity(item.quantity, item.unit)}
          {item.notes ? ` · ${item.notes}` : ""}
        </p>
      </div>
      <Badge>{labelFromValue(item.category)}</Badge>
      <form action={deleteShoppingItemAction}>
        <input type="hidden" name="id" value={item.id} />
        <Button type="submit" size="icon" variant="danger" aria-label="Supprimer">
          <Trash2 className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
