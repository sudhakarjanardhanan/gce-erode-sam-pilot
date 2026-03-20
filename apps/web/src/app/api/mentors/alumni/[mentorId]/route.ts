import { NextResponse } from "next/server";

import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ mentorId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { mentorId } = await context.params;

  if (!mentorId) {
    return NextResponse.json({ error: "Missing mentorId" }, { status: 400 });
  }

  try {
    const mentor = await db.alumniMentor.findUnique({
      where: { id: mentorId },
      select: {
        id: true,
        fullName: true,
        graduationYear: true,
        branch: true,
        organization: true,
        roleTitle: true,
        expertise: true,
        profileSummary: true,
        email: true,
        linkedInUrl: true,
        isActive: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!mentor || !mentor.isActive) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }

    return NextResponse.json({ mentor }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Could not load mentor profile. Ensure database is running and migrated." },
      { status: 503 },
    );
  }
}
