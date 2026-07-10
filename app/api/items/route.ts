import { NextRequest, NextResponse } from "next/server";

export type ListingStatus = "open" | "booked";

export interface Listing {
  id: string;
  subject: string;
  tutorName: string;
  description: string;
  rate: number;
  slot: string;
  status: ListingStatus;
  createdAt: string;
}

interface ListingRow {
  id: string;
  subject: string;
  tutor_name: string;
  description: string;
  rate: number;
  slot: string;
  status: ListingStatus;
  created_at: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const TABLE = "listings";

function rowToListing(row: ListingRow): Listing {
  return {
    id: row.id,
    subject: row.subject,
    tutorName: row.tutor_name,
    description: row.description,
    rate: row.rate,
    slot: row.slot,
    status: row.status,
    createdAt: row.created_at,
  };
}

function supabaseHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY as string,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

// In-memory fallback store (per server instance).
let memoryStore: Listing[] = [];

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function getAll(): Promise<Listing[]> {
  if (USE_SUPABASE) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?select=*&order=created_at.desc`,
      { headers: supabaseHeaders(), cache: "no-store" }
    );
    if (!res.ok) {
      throw new Error(`Supabase fetch failed: ${res.status}`);
    }
    const rows = (await res.json()) as ListingRow[];
    return rows.map(rowToListing);
  }

  return [...memoryStore].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function createListing(input: {
  subject: string;
  tutorName: string;
  description: string;
  rate: number;
  slot: string;
}): Promise<Listing> {
  const listing: Listing = {
    id: generateId(),
    subject: input.subject,
    tutorName: input.tutorName,
    description: input.description,
    rate: input.rate,
    slot: input.slot,
    status: "open",
    createdAt: new Date().toISOString(),
  };

  if (USE_SUPABASE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(),
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        id: listing.id,
        subject: listing.subject,
        tutor_name: listing.tutorName,
        description: listing.description,
        rate: listing.rate,
        slot: listing.slot,
        status: listing.status,
        created_at: listing.createdAt,
      }),
    });
    if (!res.ok) {
      throw new Error(`Supabase insert failed: ${res.status}`);
    }
    const rows = (await res.json()) as ListingRow[];
    return rowToListing(rows[0]);
  }

  memoryStore.push(listing);
  return listing;
}

async function deleteListing(id: string): Promise<void> {
  if (USE_SUPABASE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}`, {
      method: "DELETE",
      headers: supabaseHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Supabase delete failed: ${res.status}`);
    }
    return;
  }

  memoryStore = memoryStore.filter((item) => item.id !== id);
}

async function updateStatus(
  id: string,
  status: ListingStatus
): Promise<Listing | null> {
  if (USE_SUPABASE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        ...supabaseHeaders(),
        Prefer: "return=representation",
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      throw new Error(`Supabase update failed: ${res.status}`);
    }
    const rows = (await res.json()) as ListingRow[];
    return rows[0] ? rowToListing(rows[0]) : null;
  }

  const idx = memoryStore.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  memoryStore[idx] = { ...memoryStore[idx], status };
  return memoryStore[idx];
}

export async function GET() {
  try {
    const listings = await getAll();
    return NextResponse.json({ listings });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load listings." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = (await request.json()) as Record<string, unknown>;

    const subject =
      typeof rawBody.subject === "string" ? rawBody.subject.trim() : "";
    const tutorName =
      typeof rawBody.tutorName === "string" ? rawBody.tutorName.trim() : "";
    const description =
      typeof rawBody.description === "string"
        ? rawBody.description.trim()
        : "";
    const rate =
      typeof rawBody.rate === "number" ? rawBody.rate : Number(rawBody.rate);
    const slot = typeof rawBody.slot === "string" ? rawBody.slot : "";

    if (!subject || !tutorName || !slot || !Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json(
        {
          error:
            "Subject, your name, an hourly rate, and a time slot are required.",
        },
        { status: 400 }
      );
    }

    const listing = await createListing({
      subject,
      tutorName,
      description,
      rate,
      slot,
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create listing." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id." }, { status: 400 });
    }

    const rawBody = (await request.json()) as Record<string, unknown>;
    const status: ListingStatus = rawBody.status === "booked" ? "booked" : "open";

    const updated = await updateStatus(id, status);
    if (!updated) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ listing: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update listing." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id." }, { status: 400 });
    }

    await deleteListing(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete listing." },
      { status: 500 }
    );
  }
}
