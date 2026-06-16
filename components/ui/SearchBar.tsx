import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";

export function SearchBar({
  name = "q",
  defaultValue,
  placeholder = "Rechercher"
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="relative block">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f8171]"
        aria-hidden="true"
      />
      <Input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="pl-9"
      />
    </label>
  );
}
