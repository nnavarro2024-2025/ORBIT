import type { User as SupabaseUser } from "@supabase/supabase-js";

import { userRoleEnum } from "@shared/schema";

type AppRole = (typeof userRoleEnum.enumValues)[number];

function extractProviders(user: SupabaseUser): string[] {
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers)) {
    return providers.map((value) => String(value).toLowerCase());
  }

  const singleProvider = user.app_metadata?.provider;
  if (typeof singleProvider === "string") {
    return [singleProvider.toLowerCase()];
  }

  return [];
}

export function hasPasswordProvider(user: SupabaseUser): boolean {
  const passwordSetupCompleted = Boolean(
    user.user_metadata?.has_password || user.user_metadata?.password_setup_completed_at,
  );

  if (passwordSetupCompleted) {
    return true;
  }

  const providers = extractProviders(user);
  return providers.includes("email");
}

export function inferRoleFromUicEmail(rawEmail: string): AppRole {
  const email = rawEmail.trim().toLowerCase();
  const [localPart] = email.split("@");

  // Student pattern: firstletterlastname_##########@uic.edu.ph
  if (/_\d{6,}$/.test(localPart)) {
    return "student";
  }

  // Faculty pattern: firstletterlastname@uic.edu.ph (no underscores/digits)
  if (/^[a-z][a-z]+$/.test(localPart) && !/[\d_]/.test(localPart)) {
    return "faculty";
  }

  return "student";
}
