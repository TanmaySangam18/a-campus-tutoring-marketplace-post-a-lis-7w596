"use client";

import { useCallback, useEffect, useState } from "react";
import type { Listing } from "./api/items/route";

interface FormState {
  subject: string;
  tutorName: string;
  description: string;
  rate: string;
  slot: string;
}

const EMPTY_FORM: FormState = {
  subject: "",
  tutorName: "",
  description: "",
  rate: "",
  slot: "",
};

function formatSlot(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4.5 5.5h11M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M6 5.5v9.5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V5.5M8.25 9v4M11.75 9v4" />
    </svg>
  );
}

function nowForInput(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/items", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Couldn't load listings.");
      }
      setListings(data.listings as Listing[]);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Couldn't load listings."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const rateValue = Number(formState.rate);
    if (
      !formState.subject.trim() ||
      !formState.tutorName.trim() ||
      !formState.slot ||
      !Number.isFinite(rateValue) ||
      rateValue <= 0
    ) {
      setFormError(
        "Fill in the subject, your name, an hourly rate, and a time slot."
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: formState.subject.trim(),
          tutorName: formState.tutorName.trim(),
          description: formState.description.trim(),
          rate: rateValue,
          slot: new Date(formState.slot).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }
      setListings((prev) => [data.listing as Listing, ...prev]);
      setFormState(EMPTY_FORM);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBook(id: string) {
    setActionError(null);
    setPendingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/items?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "booked" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not book this slot.");
      }
      setListings((prev) =>
        prev.map((item) => (item.id === id ? (data.listing as Listing) : item))
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not book this slot."
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleDelete(id: string) {
    setActionError(null);
    setPendingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/items?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not delete this listing.");
      }
      setListings((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not delete this listing."
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8 lg:px-10 lg:py-16">
        <header className="mb-12 max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Campus Tutoring
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
            Find a tutor. Book a slot. Show up ready.
          </h1>
          <p className="text-base leading-7 text-zinc-600">
            Post an open slot if you tutor, or grab one before it&apos;s gone.
            No accounts, no back-and-forth — just real sessions from students
            on your campus.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr]">
          <section
            aria-labelledby="post-listing-heading"
            className="h-fit space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-8"
          >
            <div className="space-y-1">
              <h2
                id="post-listing-heading"
                className="text-lg font-semibold text-zinc-900"
              >
                Open a slot
              </h2>
              <p className="text-sm leading-6 text-zinc-500">
                Tutoring something? Post it here and students can book it
                directly.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={formState.subject}
                  onChange={(e) => updateField("subject", e.target.value)}
                  placeholder="Organic Chemistry, Calc II, Spanish…"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="tutorName"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Your name
                </label>
                <input
                  id="tutorName"
                  type="text"
                  value={formState.tutorName}
                  onChange={(e) => updateField("tutorName", e.target.value)}
                  placeholder="Jordan Lee"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="rate"
                    className="block text-sm font-medium text-zinc-700"
                  >
                    Rate ($/hr)
                  </label>
                  <input
                    id="rate"
                    type="number"
                    min={1}
                    step={0.5}
                    value={formState.rate}
                    onChange={(e) => updateField("rate", e.target.value)}
                    placeholder="25"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="slot"
                    className="block text-sm font-medium text-zinc-700"
                  >
                    Slot
                  </label>
                  <input
                    id="slot"
                    type="datetime-local"
                    min={nowForInput()}
                    value={formState.slot}
                    onChange={(e) => updateField("slot", e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Notes{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formState.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="What you'll cover, format, materials to bring…"
                  className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 placeholder:text-zinc-400 transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition duration-150 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Posting…" : "Post listing"}
              </button>
            </form>
          </section>

          <section aria-labelledby="browse-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2
                id="browse-heading"
                className="text-lg font-semibold text-zinc-900"
              >
                Open sessions
              </h2>
              {!loading && !loadError && (
                <span className="text-sm text-zinc-500">
                  {listings.length}{" "}
                  {listings.length === 1 ? "listing" : "listings"}
                </span>
              )}
            </div>

            {actionError && (
              <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <p>{actionError}</p>
                <button
                  onClick={() => setActionError(null)}
                  className="shrink-0 font-semibold underline-offset-2 transition duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  Dismiss
                </button>
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl border border-zinc-200 bg-white p-5"
                  >
                    <div className="h-4 w-1/3 rounded bg-zinc-200" />
                    <div className="mt-3 h-3 w-1/2 rounded bg-zinc-100" />
                    <div className="mt-6 h-3 w-full rounded bg-zinc-100" />
                    <div className="mt-2 h-3 w-2/3 rounded bg-zinc-100" />
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                <p className="font-semibold">Couldn&apos;t load listings</p>
                <p className="mt-1 leading-6">{loadError}</p>
                <button
                  onClick={loadListings}
                  className="mt-4 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 transition duration-150 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  Try again
                </button>
              </div>
            ) : listings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
                <p className="text-base font-semibold text-zinc-900">
                  No sessions posted yet
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                  Tutors: open a slot on the left and it&apos;ll show up here
                  for students to grab. Be the first.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {listings.map((listing) => {
                  const isPending = pendingIds.has(listing.id);
                  const isBooked = listing.status === "booked";
                  return (
                    <li key={listing.id}>
                      <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition duration-150 hover:shadow-md">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-base font-semibold text-zinc-900">
                                {listing.subject}
                              </h3>
                              {isBooked && (
                                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                                  Booked
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-zinc-500">
                              with {listing.tutorName} ·{" "}
                              {formatSlot(listing.slot)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(listing.id)}
                            disabled={isPending}
                            aria-label={`Delete ${listing.subject} listing`}
                            className="shrink-0 rounded-lg p-2 text-zinc-400 transition duration-150 hover:bg-zinc-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <TrashIcon />
                          </button>
                        </div>

                        {listing.description && (
                          <p className="mt-3 text-sm leading-6 text-zinc-600">
                            {listing.description}
                          </p>
                        )}

                        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
                          <p className="text-sm font-semibold text-zinc-900">
                            ${listing.rate.toFixed(2)}
                            <span className="font-normal text-zinc-500">
                              /hr
                            </span>
                          </p>
                          <button
                            onClick={() => handleBook(listing.id)}
                            disabled={isBooked || isPending}
                            className="rounded-lg border border-indigo-600 px-3 py-1.5 text-sm font-semibold text-indigo-600 transition duration-150 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400 disabled:hover:bg-transparent"
                          >
                            {isBooked
                              ? "Slot taken"
                              : isPending
                              ? "Booking…"
                              : "Book this slot"}
                          </button>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
