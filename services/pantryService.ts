import { prisma } from "@/lib/db";
import { addDays } from "@/lib/dates";

export async function getPantryItems(userId: string, location?: string) {
  return prisma.pantryItem.findMany({
    where: {
      userId,
      ...(location ? { location } : {})
    },
    orderBy: [
      {
        expirationDate: "asc"
      },
      {
        name: "asc"
      }
    ]
  });
}

export async function getExpiringPantryItems(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.pantryItem.findMany({
    where: {
      userId,
      expirationDate: {
        lte: addDays(today, 3)
      }
    },
    orderBy: {
      expirationDate: "asc"
    },
    take: 5
  });
}

export async function createPantryItem(input: {
  userId: string;
  name: string;
  quantity?: number | null;
  unit?: string;
  location: string;
  expirationDate?: Date | null;
}) {
  return prisma.pantryItem.create({
    data: {
      userId: input.userId,
      name: input.name.trim(),
      quantity: input.quantity ?? null,
      unit: input.unit?.trim() || null,
      location: input.location,
      expirationDate: input.expirationDate ?? null
    }
  });
}

export async function updatePantryItem(input: {
  id: string;
  quantity?: number | null;
  unit?: string;
  location: string;
  expirationDate?: Date | null;
}) {
  return prisma.pantryItem.update({
    where: {
      id: input.id
    },
    data: {
      quantity: input.quantity ?? null,
      unit: input.unit?.trim() || null,
      location: input.location,
      expirationDate: input.expirationDate ?? null
    }
  });
}

export async function deletePantryItem(id: string) {
  return prisma.pantryItem.delete({
    where: {
      id
    }
  });
}
