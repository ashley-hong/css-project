import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const berths = await prisma.berth.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(berths);
}
