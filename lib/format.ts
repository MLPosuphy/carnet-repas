export function formatDuration(minutes: number): string {
  if (minutes <= 0) {
    return "À renseigner";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (rest === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${rest}`;
}

export function formatQuantity(quantity: number | null, unit?: string | null) {
  if (quantity === null) {
    return unit ?? "";
  }

  const formatted = Number.isInteger(quantity)
    ? quantity.toString()
    : quantity.toFixed(1).replace(".", ",");

  return [formatted, unit].filter(Boolean).join(" ");
}

export function labelFromValue(value: string) {
  const labels: Record<string, string> = {
    easy: "Facile",
    medium: "Moyen",
    hard: "Difficile",
    low: "Bas",
    high: "Élevé",
    all_year: "Toute l'année",
    spring: "Printemps",
    summer: "Été",
    autumn: "Automne",
    winter: "Hiver",
    personal: "Personnelle",
    family: "Famille",
    website: "Site web",
    book: "Livre",
    friend: "Ami",
    imported: "Importée",
    produce: "Fruits et légumes",
    dairy: "Frais",
    meat_fish: "Viande et poisson",
    bakery: "Boulangerie",
    pantry: "Épicerie",
    frozen: "Surgelé",
    drinks: "Boissons",
    household: "Maison",
    other: "Autre"
  };

  return labels[value] ?? value.replace(/_/g, " ");
}
