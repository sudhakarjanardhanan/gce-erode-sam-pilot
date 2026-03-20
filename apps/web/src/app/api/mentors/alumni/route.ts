import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const pageSizeRaw = Number.parseInt(searchParams.get("pageSize") || "20", 10);
  const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(Math.max(pageSizeRaw, 1), 100) : 20;
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const skip = (safePage - 1) * pageSize;

  const where = {
    isActive: true,
    OR: q
      ? [
          { fullName: { contains: q, mode: "insensitive" as const } },
          { branch: { contains: q, mode: "insensitive" as const } },
          { organization: { contains: q, mode: "insensitive" as const } },
          { roleTitle: { contains: q, mode: "insensitive" as const } },
        ]
      : undefined,
  };

  try {
    const [total, mentors] = await Promise.all([
      db.alumniMentor.count({ where }),
      db.alumniMentor.findMany({
        where,
        orderBy: [{ graduationYear: "desc" }, { fullName: "asc" }],
        skip,
        take: pageSize,
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
      }),
    ]);

    return NextResponse.json(
      {
        mentors,
        pagination: {
          page: safePage,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not load alumni mentors. Ensure database is running and migrated." },
      { status: 503 },
    );
  }
}
