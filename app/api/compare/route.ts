import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.PLAGIARISM_API_BASE_URL?.trim().replace(/\/$/, "") ||
  "https://ai-plagiarism-checker-and-quality-scorer.onrender.com";
const API_URL = `${API_BASE_URL}/compare`;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const language = typeof body?.language === "string" ? body.language : "python";
    const reference_code = typeof body?.reference_code === "string" ? body.reference_code : "";
    const submission_code = typeof body?.submission_code === "string" ? body.submission_code : "";

    if (!reference_code.trim() || !submission_code.trim()) {
      return NextResponse.json(
        { ok: false, message: "Both reference_code and submission_code are required" },
        { status: 400 },
      );
    }

    const upstreamResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language, reference_code, submission_code }),
      cache: "no-store",
    });

    const text = await upstreamResponse.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // leave data as null to surface parsing failure
    }

    if (!upstreamResponse.ok) {
      const message = typeof (data as { message?: string } | null)?.message === "string"
        ? (data as { message?: string }).message
        : `Upstream error (${upstreamResponse.status})`;
      return NextResponse.json(
        { ok: false, message, details: data },
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json(data ?? { ok: false, message: "Empty upstream response" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unexpected server error" },
      { status: 500 },
    );
  }
}
