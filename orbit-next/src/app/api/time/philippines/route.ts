import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getGoogleTimeEpochMs(): Promise<number | null> {
  try {
    const response = await fetch("https://www.google.com/generate_204", {
      cache: "no-store",
      method: "GET",
    });

    const dateHeader = response.headers.get("date");
    if (!dateHeader) {
      return null;
    }

    const epochMs = Date.parse(dateHeader);
    if (Number.isNaN(epochMs)) {
      return null;
    }

    return epochMs;
  } catch (_) {
    return null;
  }
}

export async function GET() {
  const googleEpochMs = await getGoogleTimeEpochMs();
  const epochMs = googleEpochMs ?? Date.now();

  return NextResponse.json(
    {
      epochMs,
      timezone: "Asia/Manila",
      source: googleEpochMs ? "google-date-header" : "server-fallback",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
