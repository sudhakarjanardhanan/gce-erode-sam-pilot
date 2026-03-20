import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET() {
  try {
    const mentors = await db.alumniMentor.findMany({
      where: { isActive: true },
      orderBy: [{ graduationYear: "desc" }, { fullName: "asc" }],
      select: {
        id: true,
        fullName: true,
        graduationYear: true,
        branch: true,
        organization: true,
        roleTitle: true,
        expertise: true,
        profileSummary: true,
        linkedInUrl: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ mentors }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Could not load alumni mentors. Ensure database is running and migrated." },
      { status: 503 },
    );
  }
}
