import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  const vessels = await prisma.vessel.findMany({
    where: q ? { name: { contains: q } } : undefined,
    orderBy: { name: "asc" },
    take: 20,
  });
  return NextResponse.json(vessels);
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Vessel name is required." }, { status: 400 });
  }
  const loaFt = body.loaFt != null && body.loaFt !== "" ? Number(body.loaFt) : null;
  const vessel = await prisma.vessel.upsert({
    where: { name },
    update: {},
    create: { name, loaFt, operator: body.operator || null },
  });
  return NextResponse.json(vessel, { status: 201 });
}
