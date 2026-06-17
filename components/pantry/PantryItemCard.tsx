import { Trash2 } from "lucide-react";
import {
  deletePantryItemAction,
  updatePantryItemAction
} from "@/app/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toDateInputValue } from "@/lib/dates";
import { formatQuantity } from "@/lib/format";

export function PantryItemCard({
  item,
  expiringSoon
}: {
  item: {
    id: string;
    name: string;
    quantity: number | null;
    unit: string | null;
    location: string;
    expirationDate: Date | null;
  };
  expiringSoon: boolean;
}) {
  return (
    <Card>
      <CardBody className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">{item.name}</h2>
            <p className="text-sm text-body">
              {formatQuantity(item.quantity, item.unit)} · {item.location}
            </p>
          </div>
          {expiringSoon ? <Badge tone="red">à utiliser</Badge> : null}
        </div>
        <form action={updatePantryItemAction} className="grid gap-2 md:grid-cols-4">
          <input type="hidden" name="id" value={item.id} />
          <Input name="quantity" type="number" step="0.1" defaultValue={item.quantity ?? ""} />
          <Input name="unit" defaultValue={item.unit ?? ""} placeholder="Unité" />
          <Select name="location" defaultValue={item.location}>
            <option value="fridge">Frigo</option>
            <option value="freezer">Congélateur</option>
            <option value="pantry">Placard</option>
            <option value="cellar">Cave</option>
            <option value="other">Autre</option>
          </Select>
          <Input
            name="expirationDate"
            type="date"
            defaultValue={item.expirationDate ? toDateInputValue(item.expirationDate) : ""}
          />
          <Button type="submit" variant="secondary" className="md:col-span-3">
            Mettre à jour
          </Button>
        </form>
        <form action={deletePantryItemAction} className="flex justify-end">
          <input type="hidden" name="id" value={item.id} />
          <Button type="submit" variant="danger" size="sm">
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
