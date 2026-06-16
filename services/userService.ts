import { prisma } from "@/lib/db";

export const DEMO_USER_EMAIL = "mateo@example.local";

export async function getDemoUser() {
  const existing = await prisma.user.findUnique({
    where: {
      email: DEMO_USER_EMAIL
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.user.create({
    data: {
      name: "Mateo",
      email: DEMO_USER_EMAIL,
      profile: {
        create: {
          householdSize: 2,
          defaultServings: 4,
          skillLevel: "intermediate",
          budgetLevel: "medium"
        }
      }
    }
  });
}
