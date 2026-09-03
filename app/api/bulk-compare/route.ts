import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.PLAGIARISM_API_BASE_URL?.trim().replace(/\/$/, "") ||
  "https://ai-plagiarism-checker-and-quality-scorer.onrender.com";
const BULK_API_URL = `${API_BASE_URL}/bulk-compare`;
export const dynamic = "force-dynamic";

type SubmissionInput = { id: string; code: string };

function sanitizeSubmissions(input: unknown): SubmissionInput[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry, index) => {
      const id = typeof entry?.id === "string" && entry.id.trim() ? entry.id.trim() : `submission-${index + 1}`;
      const code = typeof entry?.code === "string" ? entry.code : "";
      return { id, code };
    })
    .filter((entry) => entry.code.trim().length > 0);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const language = typeof body?.language === "string" ? body.language : "python";
    const reference_code = typeof body?.reference_code === "string" ? body.reference_code : "";
    const submissions = sanitizeSubmissions(body?.submissions);

    if (!reference_code.trim()) {
      return NextResponse.json({ ok: false, message: "reference_code is required" }, { status: 400 });
    }

    if (!submissions.length) {
      return NextResponse.json({ ok: false, message: "At least one submission is required" }, { status: 400 });
    }

    const upstreamResponse = await fetch(BULK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language, reference_code, submissions }),
      cache: "no-store",
    });

    const text = await upstreamResponse.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // leave data as null so we can surface parsing errors via response below
    }

    if (!upstreamResponse.ok) {
      const message = typeof (data as { message?: string } | null)?.message === "string"
        ? (data as { message?: string }).message
        : `Upstream error (${upstreamResponse.status})`;
      return NextResponse.json({ ok: false, message, details: data }, { status: upstreamResponse.status });
    }

    if (!data) {
      return NextResponse.json({ ok: false, message: "Empty upstream response" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unexpected server error" },
      { status: 500 },
    );
  }
}
