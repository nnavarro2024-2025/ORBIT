/**
 * Detects user role based on UIC email format
 * Student: email has "_" and contains 7+ consecutive digits (enrollment ID)
 *   Example: nnavarro_230000002875@uic.edu.ph
 * Faculty: email has no numbers in local part, just name pattern
 *   Example: scloribel@uic.edu.ph, ccastro@uic.edu.ph
 * Admin: Should NEVER be auto-detected, must be set manually
 */
export function detectRoleFromEmail(email: string): "student" | "faculty" | "admin" | null {
  const localPart = email.split("@")[0];

  if (!localPart) return null;

  // Check if it's a student email: has underscore and 7+ digit sequence
  if (localPart.includes("_")) {
    // Look for 7+ consecutive digits (enrollment ID)
    const hasEnrollmentID = /\d{7,}/.test(localPart);
    if (hasEnrollmentID) {
      return "student";
    }
  }

  // Check if it's a faculty email: no numbers in local part
  // Faculty emails are like: scloribel, ccastro, cbenablo (name pattern only)
  if (!/\d/.test(localPart)) {
    // Additional check: should be 2-15 characters (reasonable name length)
    if (localPart.length >= 2 && localPart.length <= 15) {
      return "faculty";
    }
  }

  // Could not determine role with confidence
  return null;
}

/**
 * Gets default role for new sign-ups
 * Tries to auto-detect, falls back to student if unable to determine
 */
export function getDefaultRoleForEmail(email: string): "student" | "faculty" {
  const detected = detectRoleFromEmail(email);
  if (detected === "faculty") {
    return "faculty";
  }
  // Default to student if unable to determine or student
  return "student";
}
