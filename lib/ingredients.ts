const FILLER_WORDS = [
  "frais",
  "fraiche",
  "fraiche",
  "coupé",
  "coupée",
  "coupe",
  "coupee",
  "haché",
  "hachée",
  "hache",
  "hachee",
  "râpé",
  "râpée",
  "rape",
  "rapee"
];

export function normalizeIngredientName(name: string): string {
  const normalized = name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((part) => part && !FILLER_WORDS.includes(part))
    .join(" ")
    .trim();

  return normalized
    .split(" ")
    .map((part) =>
      part.length > 3 && part.endsWith("s") ? part.slice(0, -1) : part
    )
    .join(" ");
}
