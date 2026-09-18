import { prisma } from "@/lib/prisma";

export type BookingInput = {
  berthId: number;
  startDate: Date;
  endDate: Date;
  vesselId?: number | null;
  eventLabel?: string | null;
  excludeBookingId?: number;
};

export type BookingRuleViolation =
  | { kind: "overlap"; conflictingBookingId: number; detail: string }
  | { kind: "oversize"; detail: string }
  | { kind: "invalid-range"; detail: string }
  | { kind: "missing-occupant"; detail: string };

/**
 * Checks a proposed booking against the two rules the old spreadsheet-based
 * process only caught by manual inspection: no two bookings on the same
 * berth may overlap in time, and a vessel may not be booked into a berth
 * shorter than its own length. Returns every violation found (not just the
 * first) so the caller can show a complete picture.
 */
export async function checkBookingRules(input: BookingInput): Promise<BookingRuleViolation[]> {
  const violations: BookingRuleViolation[] = [];

  if (input.endDate.getTime() < input.startDate.getTime()) {
    violations.push({ kind: "invalid-range", detail: "End date must be on or after the start date." });
  }
  if (!input.vesselId && !input.eventLabel?.trim()) {
    violations.push({ kind: "missing-occupant", detail: "A booking needs either a vessel or an event label." });
  }

  const berth = await prisma.berth.findUnique({ where: { id: input.berthId } });
  if (!berth) {
    violations.push({ kind: "invalid-range", detail: "Berth not found." });
    return violations;
  }

  if (input.vesselId) {
    const vessel = await prisma.vessel.findUnique({ where: { id: input.vesselId } });
    if (vessel?.loaFt != null && vessel.loaFt > berth.lengthFt) {
      violations.push({
        kind: "oversize",
        detail: `${vessel.name} is ${vessel.loaFt}' but ${berth.name} is only ${berth.lengthFt}' long.`,
      });
    }
  }

  const overlapping = await prisma.booking.findMany({
    where: {
      berthId: input.berthId,
      id: input.excludeBookingId ? { not: input.excludeBookingId } : undefined,
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
    },
    include: { vessel: true },
  });
  for (const b of overlapping) {
    violations.push({
      kind: "overlap",
      conflictingBookingId: b.id,
      detail: `Overlaps ${b.vessel?.name ?? b.eventLabel ?? "an existing booking"} (${b.startDate.toISOString().slice(0, 10)} to ${b.endDate.toISOString().slice(0, 10)}).`,
    });
  }

  return violations;
}
