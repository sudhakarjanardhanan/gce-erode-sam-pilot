import { NextResponse } from "next/server";

import { db } from "@/lib/db";

const allowedRoles = new Set(["STUDENT", "FACULTY", "HOD", "ALUMNI"]);

type RegistrationPayload = {
  role?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  departmentId?: string;
  departmentName?: string;
  graduationYear?: number;
  batchYear?: number;
  branch?: string;
  organization?: string;
  roleTitle?: string;
  expertise?: string;
};

export async function POST(request: Request) {
  let body: RegistrationPayload;

  try {
    body = (await request.json()) as RegistrationPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const role = body.role?.toUpperCase();
  if (!role || !allowedRoles.has(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (!body.fullName || !body.email) {
    return NextResponse.json({ error: "fullName and email are required" }, { status: 400 });
  }

  const roleMap: Record<string, "VIEWER" | "FACULTY" | "HOD" | "ALUMNI"> = {
    STUDENT: "VIEWER",
    FACULTY: "FACULTY",
    HOD: "HOD",
    ALUMNI: "ALUMNI",
  };

  try {
    const registration = await db.registrationRequest.create({
      data: {
        role: roleMap[role],
        fullName: body.fullName.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone?.trim() || null,
        departmentId: body.departmentId || null,
        payload: {
          role,
          departmentName: body.departmentName ?? null,
          graduationYear: body.graduationYear ?? null,
          batchYear: body.batchYear ?? null,
          branch: body.branch ?? null,
          organization: body.organization ?? null,
          roleTitle: body.roleTitle ?? null,
          expertise: body.expertise ?? null,
        },
      },
      select: {
        id: true,
        role: true,
        status: true,
        submittedAt: true,
      },
    });

    return NextResponse.json({ ok: true, registration }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Could not submit registration request. Ensure database is running and migrated." },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.toUpperCase();
  const role = searchParams.get("role")?.toUpperCase();

  try {
    const requests = await db.registrationRequest.findMany({
      where: {
        status: status === "PENDING" || status === "APPROVED" || status === "REJECTED" ? status : undefined,
        role: role === "VIEWER" || role === "FACULTY" || role === "HOD" || role === "ALUMNI" ? role : undefined,
      },
      orderBy: { submittedAt: "desc" },
      take: 100,
      select: {
        id: true,
        role: true,
        fullName: true,
        email: true,
        status: true,
        submittedAt: true,
      },
    });

    return NextResponse.json({ requests }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Could not load registration requests. Ensure database is running and migrated." },
      { status: 503 },
    );
  }
}
