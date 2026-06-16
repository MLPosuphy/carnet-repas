import { Input } from "@/components/ui/Input";

export function QuantityInput({
  name = "servings",
  defaultValue = 4,
  label = "Portions"
}: {
  name?: string;
  defaultValue?: number;
  label?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <Input name={name} type="number" min={1} step={1} defaultValue={defaultValue} />
    </label>
  );
}
