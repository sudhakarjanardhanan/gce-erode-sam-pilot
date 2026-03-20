import { NextResponse } from "next/server";

import { requireReviewer } from "@/lib/auth/reviewerAuth";
import { db } from "@/lib/db";

type ReviewPayload = {
  status?: string;
  reviewerNotes?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const reviewerAuth = await requireReviewer(request, ["ADMIN"]);
  if (!reviewerAuth.ok) {
    return reviewerAuth.response;
  }

  let body: ReviewPayload;
  try {
    body = (await request.json()) as ReviewPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const nextStatus = body.status?.toUpperCase();
  if (nextStatus !== "APPROVED" && nextStatus !== "REJECTED") {
    return NextResponse.json({ error: "status must be APPROVED or REJECTED" }, { status: 400 });
  }

  const { requestId } = await context.params;
  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
  }

  try {
    const updated = await db.registrationRequest.update({
      where: { id: requestId },
      data: {
        status: nextStatus,
        reviewedAt: new Date(),
        reviewerNotes: body.reviewerNotes?.trim() || null,
        userId: reviewerAuth.reviewer.userId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        reviewedAt: true,
        reviewerNotes: true,
      },
    });

    return NextResponse.json({ ok: true, request: updated }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Could not update registration request. Check ID and database state." },
      { status: 503 },
    );
  }
}