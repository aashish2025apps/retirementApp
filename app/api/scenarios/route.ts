import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserScenarios, createScenario, upsertUser } from "@/lib/db/scenarios";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scenarios = await getUserScenarios(userId);
  return NextResponse.json(scenarios);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  if (user) {
    await upsertUser(userId, user.emailAddresses[0]?.emailAddress ?? "");
  }

  const { name, data } = await req.json();
  const scenario = await createScenario(userId, name, data);
  return NextResponse.json(scenario, { status: 201 });
}
