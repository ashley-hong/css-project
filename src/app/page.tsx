"use client";

import { useEffect, useMemo, useState } from "react";

type Berth = { id: number; name: string; lengthFt: number };
type Vessel = { id: number; name: string; loaFt: number | null };
type Booking = {
  id: number;
  berthId: number;
  vesselId: number | null;
  eventLabel: string | null;
  startDate: string;
  endDate: string;
  vessel: Vessel | null;
};
type Violation = { kind: string; detail: string };

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

const emptyForm = {
  berthId: "",
  startDate: "",
  endDate: "",
  occupantType: "vessel" as "vessel" | "event",
  vesselName: "",
  loaFt: "",
  eventLabel: "",
};

export default function Home() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  });
  const [berths, setBerths] = useState<Berth[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const monthStart = useMemo(() => new Date(Date.UTC(cursor.year, cursor.month, 1)), [cursor]);
  const monthEnd = useMemo(
    () => new Date(Date.UTC(cursor.year, cursor.month, daysInMonth(cursor.year, cursor.month))),
    [cursor],
  );
  const dayCount = daysInMonth(cursor.year, cursor.month);

  async function loadBookings() {
    const res = await fetch(`/api/bookings?from=${toISODate(monthStart)}&to=${toISODate(monthEnd)}`);
    setBookings(await res.json());
  }

  useEffect(() => {
    fetch("/api/berths").then((r) => r.json()).then(setBerths);
  }, []);

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  function occupantFor(berthId: number, day: number): Booking | undefined {
    const date = Date.UTC(cursor.year, cursor.month, day);
    return bookings.find(
      (b) =>
        b.berthId === berthId &&
        date >= new Date(b.startDate).getTime() &&
        date <= new Date(b.endDate).getTime(),
    );
  }

  function openFormFor(berthId: number, day: number) {
    const iso = toISODate(new Date(Date.UTC(cursor.year, cursor.month, day)));
    setForm({ ...emptyForm, berthId: String(berthId), startDate: iso, endDate: iso });
    setViolations([]);
    setShowForm(true);
  }

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setViolations([]);
    try {
      let vesselId: number | null = null;
      if (form.occupantType === "vessel") {
        const vRes = await fetch("/api/vessels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.vesselName, loaFt: form.loaFt || null }),
        });
        if (!vRes.ok) {
          setViolations([{ kind: "error", detail: "Could not save vessel." }]);
          return;
        }
        vesselId = (await vRes.json()).id;
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          berthId: Number(form.berthId),
          startDate: form.startDate,
          endDate: form.endDate,
          vesselId,
          eventLabel: form.occupantType === "event" ? form.eventLabel : null,
        }),
      });

      if (res.status === 409) {
        const body = await res.json();
        setViolations(body.violations ?? [{ kind: "error", detail: body.error }]);
        return;
      }
      if (!res.ok) {
        setViolations([{ kind: "error", detail: "Something went wrong creating the booking." }]);
        return;
      }

      setShowForm(false);
      setForm(emptyForm);
      await loadBookings();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteBooking(id: number) {
    if (!confirm("Remove this booking?")) return;
    await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    await loadBookings();
  }

  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">WHOI Dock Scheduler</h1>
          <div className="flex items-center gap-3">
            <button
              className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-100"
              onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}
            >
              ← Prev
            </button>
            <span className="font-medium w-40 text-center">{monthLabel}</span>
            <button
              className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-100"
              onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}
            >
              Next →
            </button>
          </div>
        </header>

        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
          <table className="border-collapse text-sm w-full">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white text-left p-2 border-b border-slate-200 min-w-[180px]">Berth</th>
                {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
                  <th key={day} className="p-1 border-b border-slate-200 text-xs font-normal w-10 text-center">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {berths.map((berth) => (
                <tr key={berth.id} className="border-b border-slate-100">
                  <td className="sticky left-0 bg-white p-2 font-medium whitespace-nowrap">
                    {berth.name} <span className="text-slate-400 font-normal">— {berth.lengthFt}&apos;</span>
                  </td>
                  {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => {
                    const b = occupantFor(berth.id, day);
                    const isFirstDay = b && new Date(b.startDate).getUTCDate() === day && new Date(b.startDate).getUTCMonth() === cursor.month;
                    return (
                      <td
                        key={day}
                        onClick={() => (b ? deleteBooking(b.id) : openFormFor(berth.id, day))}
                        title={b ? `${b.vessel?.name ?? b.eventLabel} — click to remove` : "Click to book"}
                        className={`h-9 w-10 text-center align-middle cursor-pointer border-l border-slate-100 text-[10px] leading-tight ${
                          b ? (b.vesselId ? "bg-sky-100 hover:bg-sky-200" : "bg-emerald-100 hover:bg-emerald-200") : "hover:bg-slate-100"
                        }`}
                      >
                        {b && isFirstDay ? (b.vessel?.name ?? b.eventLabel)?.slice(0, 10) : b ? "·" : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {berths.length === 0 && (
                <tr>
                  <td colSpan={dayCount + 1} className="p-6 text-center text-slate-400">
                    No berths yet — run the import script or add one via the API.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-500">
          Click an empty cell to add a booking. Click an occupied cell to remove it.
          <span className="inline-block w-3 h-3 bg-sky-100 border border-sky-300 ml-3 mr-1 align-middle" /> vessel
          <span className="inline-block w-3 h-3 bg-emerald-100 border border-emerald-300 ml-3 mr-1 align-middle" /> event
        </p>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <form
            onSubmit={submitBooking}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg p-5 w-full max-w-sm space-y-3 shadow-xl"
          >
            <h2 className="font-semibold">New booking</h2>

            <label className="block text-sm">
              Berth
              <select
                className="mt-1 w-full border border-slate-300 rounded px-2 py-1"
                value={form.berthId}
                onChange={(e) => setForm({ ...form, berthId: e.target.value })}
                required
              >
                <option value="" disabled>
                  Select a berth
                </option>
                {berths.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.lengthFt}&apos;)
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-2">
              <label className="block text-sm flex-1">
                Start date
                <input
                  type="date"
                  className="mt-1 w-full border border-slate-300 rounded px-2 py-1"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                />
              </label>
              <label className="block text-sm flex-1">
                End date
                <input
                  type="date"
                  className="mt-1 w-full border border-slate-300 rounded px-2 py-1"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  required
                />
              </label>
            </div>

            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={form.occupantType === "vessel"}
                  onChange={() => setForm({ ...form, occupantType: "vessel" })}
                />
                Vessel
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={form.occupantType === "event"}
                  onChange={() => setForm({ ...form, occupantType: "event" })}
                />
                Non-vessel event
              </label>
            </div>

            {form.occupantType === "vessel" ? (
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm"
                  placeholder="Vessel name"
                  value={form.vesselName}
                  onChange={(e) => setForm({ ...form, vesselName: e.target.value })}
                  required
                />
                <input
                  className="w-24 border border-slate-300 rounded px-2 py-1 text-sm"
                  placeholder="LOA (ft)"
                  type="number"
                  value={form.loaFt}
                  onChange={(e) => setForm({ ...form, loaFt: e.target.value })}
                />
              </div>
            ) : (
              <input
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                placeholder="Event label, e.g. Community sail day"
                value={form.eventLabel}
                onChange={(e) => setForm({ ...form, eventLabel: e.target.value })}
                required
              />
            )}

            {violations.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-2 space-y-1">
                {violations.map((v, i) => (
                  <div key={i}>⚠ {v.detail}</div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="px-3 py-1 text-sm rounded border border-slate-300" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1 text-sm rounded bg-slate-900 text-white disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Book it"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
