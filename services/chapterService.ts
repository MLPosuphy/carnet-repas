import { prisma } from "@/lib/db";

export async function getChapters(userId: string) {
  return prisma.chapter.findMany({
    where: {
      userId
    },
    include: {
      recipes: {
        include: {
          recipe: {
            include: {
              tags: {
                include: {
                  tag: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      sortOrder: "asc"
    }
  });
}

export async function createChapter(input: {
  userId: string;
  title: string;
  description?: string;
  color?: string;
}) {
  const count = await prisma.chapter.count({
    where: {
      userId: input.userId
    }
  });

  return prisma.chapter.create({
    data: {
      userId: input.userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      color: input.color || "#b78943",
      sortOrder: count
    }
  });
}

export async function updateChapter(input: {
  id: string;
  title: string;
  description?: string;
  color?: string;
}) {
  return prisma.chapter.update({
    where: {
      id: input.id
    },
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      color: input.color || "#b78943"
    }
  });
}

export async function deleteChapter(id: string) {
  return prisma.chapter.delete({
    where: {
      id
    }
  });
}

export async function addRecipeToChapter(chapterId: string, recipeId: string) {
  return prisma.chapterRecipe.upsert({
    where: {
      chapterId_recipeId: {
        chapterId,
        recipeId
      }
    },
    update: {},
    create: {
      chapterId,
      recipeId
    }
  });
}

export async function removeRecipeFromChapter(chapterId: string, recipeId: string) {
  return prisma.chapterRecipe.delete({
    where: {
      chapterId_recipeId: {
        chapterId,
        recipeId
      }
    }
  });
}
