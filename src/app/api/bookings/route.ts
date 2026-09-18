import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkBookingRules } from "@/lib/booking-rules";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");

  const bookings = await prisma.booking.findMany({
    where: {
      ...(from && to ? { startDate: { lte: new Date(to) }, endDate: { gte: new Date(from) } } : {}),
    },
    include: { vessel: true, berth: true },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(bookings);
}

export async function POST(request: Request) {
  const body = await request.json();

  const berthId = Number(body.berthId);
  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  const vesselId = body.vesselId ? Number(body.vesselId) : null;
  const eventLabel = body.eventLabel ? String(body.eventLabel).trim() : null;

  if (!berthId || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "berthId, startDate and endDate are required." }, { status: 400 });
  }

  const violations = await checkBookingRules({ berthId, startDate, endDate, vesselId, eventLabel });
  if (violations.length > 0) {
    return NextResponse.json({ error: "Booking rejected.", violations }, { status: 409 });
  }

  const booking = await prisma.booking.create({
    data: { berthId, startDate, endDate, vesselId, eventLabel, source: "manual" },
    include: { vessel: true, berth: true },
  });
  return NextResponse.json(booking, { status: 201 });
}
