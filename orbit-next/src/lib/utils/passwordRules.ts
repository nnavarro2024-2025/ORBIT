export type PasswordChecks = {
  hasMinLength: boolean;
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
};

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    hasMinLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function isStrongPassword(password: string): boolean {
  const checks = getPasswordChecks(password);
  return checks.hasMinLength && checks.hasLowercase && checks.hasUppercase && checks.hasNumber && checks.hasSymbol;
}
