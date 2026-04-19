import { prisma } from "@/lib/prisma";
import type { ScenarioData } from "@/lib/types";

export async function upsertUser(clerkId: string, email: string) {
  return prisma.user.upsert({
    where: { id: clerkId },
    update: { email },
    create: { id: clerkId, email },
  });
}

export async function getUserScenarios(userId: string) {
  return prisma.scenario.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getScenario(id: string, userId: string) {
  return prisma.scenario.findFirst({
    where: { id, userId },
  });
}

export async function createScenario(
  userId: string,
  name: string,
  data: ScenarioData
) {
  return prisma.scenario.create({
    data: {
      userId,
      name,
      profile: data.profile as object,
      income: data.income as object,
      accounts: data.accounts as object,
      spending: data.spending as object,
      assumptions: data.assumptions as object,
    },
  });
}

export async function updateScenario(
  id: string,
  userId: string,
  updates: Partial<{ name: string } & ScenarioData>
) {
  const { name, ...data } = updates;
  const payload: Record<string, unknown> = {};
  if (name) payload.name = name;
  if (data.profile) payload.profile = data.profile as object;
  if (data.income) payload.income = data.income as object;
  if (data.accounts) payload.accounts = data.accounts as object;
  if (data.spending) payload.spending = data.spending as object;
  if (data.assumptions) payload.assumptions = data.assumptions as object;

  return prisma.scenario.update({
    where: { id, userId },
    data: payload,
  });
}

export async function deleteScenario(id: string, userId: string) {
  return prisma.scenario.delete({
    where: { id, userId },
  });
}

export async function setDefaultScenario(id: string, userId: string) {
  await prisma.scenario.updateMany({
    where: { userId },
    data: { isDefault: false },
  });
  return prisma.scenario.update({
    where: { id, userId },
    data: { isDefault: true },
  });
}
