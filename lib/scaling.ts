export function scaleQuantity(
  quantity: number | null,
  originalServings: number,
  targetServings: number
): number | null {
  if (quantity === null) {
    return null;
  }

  if (originalServings <= 0 || targetServings <= 0) {
    return quantity;
  }

  return quantity * (targetServings / originalServings);
}

export function roundScaledQuantity(quantity: number | null, unit?: string | null) {
  if (quantity === null) {
    return null;
  }

  const normalizedUnit = unit?.toLowerCase().trim() ?? "";

  if (["g", "kg", "ml", "cl", "l"].includes(normalizedUnit)) {
    return Math.round(quantity);
  }

  if (
    ["cuillère", "cuillere", "cs", "càs", "cas", "cc", "càc", "cac"].includes(
      normalizedUnit
    )
  ) {
    return Math.round(quantity * 2) / 2;
  }

  return Math.round(quantity * 2) / 2;
}

export function scaleAndRoundQuantity(
  quantity: number | null,
  originalServings: number,
  targetServings: number,
  unit?: string | null
) {
  return roundScaledQuantity(
    scaleQuantity(quantity, originalServings, targetServings),
    unit
  );
}
