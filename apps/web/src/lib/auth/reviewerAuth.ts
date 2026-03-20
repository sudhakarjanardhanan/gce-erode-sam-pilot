import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

type ReviewerAuthResult =
  | {
      ok: true;
      reviewer: {
        userId: string;
        email: string;
        roles: UserRole[];
      };
    }
  | {
      ok: false;
      response: NextResponse;
    };

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function requireReviewer(
  request: Request,
  allowedRoles: UserRole[] = ["ADMIN"],
): Promise<ReviewerAuthResult> {
  const expectedToken = process.env.REVIEW_API_TOKEN;
  if (!expectedToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Reviewer authentication is not configured" },
        { status: 500 },
      ),
    };
  }

  const token = getBearerToken(request);
  if (!token || token !== expectedToken) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const reviewerEmail = request.headers.get("x-user-email")?.trim().toLowerCase();
  if (!reviewerEmail) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Missing reviewer identity" }, { status: 401 }),
    };
  }

  const reviewer = await db.user.findUnique({
    where: { email: reviewerEmail },
    select: {
      id: true,
      email: true,
      roleAssignments: {
        select: { role: true },
      },
    },
  });

  if (!reviewer) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const reviewerRoles = Array.from(new Set(reviewer.roleAssignments.map((entry) => entry.role)));
  const isAllowed = reviewerRoles.some((role) => allowedRoles.includes(role));
  if (!isAllowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    reviewer: {
      userId: reviewer.id,
      email: reviewer.email,
      roles: reviewerRoles,
    },
  };
}