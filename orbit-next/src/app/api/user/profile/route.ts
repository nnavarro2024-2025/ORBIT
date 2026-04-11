import { randomUUID } from "crypto";

import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser } from "@/server/core";
import { storage } from "@/server/core";
import { isBuildTime } from "@/server/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json({ success: false, build: true }, { status: 200 });
  }

  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const userId = authResult.user.id;

    const existingUser = await storage.getUser(userId);
    if (!existingUser) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    const changes: string[] = [];

    if (typeof body.firstName === "string" && body.firstName.trim() !== (existingUser.firstName || "")) {
      updates.firstName = body.firstName.trim();
      changes.push("first name");
    }

    if (typeof body.lastName === "string" && body.lastName.trim() !== (existingUser.lastName || "")) {
      updates.lastName = body.lastName.trim();
      changes.push("last name");
    }

    if (typeof body.profileImageUrl === "string" && body.profileImageUrl !== (existingUser.profileImageUrl || "")) {
      updates.profileImageUrl = body.profileImageUrl;
      changes.push("profile image");
    }

    if (changes.length === 0) {
      return NextResponse.json({ user: existingUser }, { status: 200 });
    }

    const updatedUser = await storage.updateUser(userId, updates);

    // Create notification for profile update
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    await storage.createSystemAlert({
      id: randomUUID(),
      type: "user",
      severity: "low",
      title: "Profile Updated",
      message: `Your profile was successfully updated on ${formattedDate}. Changes: ${changes.join(", ")}.`,
      userId,
      isRead: false,
      createdAt: now,
      updatedAt: now,
    }).catch((err) => {
      console.warn("[user/profile] Failed to create profile update notification", err);
    });

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch (error) {
    console.error("[user/profile] Error updating profile:", error);
    return NextResponse.json({ message: "Failed to update profile." }, { status: 500 });
  }
}
