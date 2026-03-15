import React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

interface RequirementCheckResult {
  met: boolean;
  label: string;
}

const checkPasswordRequirements = (password: string) => {
  return {
    minLength: {
      met: password.length >= 8,
      label: "At least 8 characters",
    },
    hasUppercase: {
      met: /[A-Z]/.test(password),
      label: "At least one uppercase letter",
    },
    hasLowercase: {
      met: /[a-z]/.test(password),
      label: "At least one lowercase letter",
    },
    hasNumber: {
      met: /\d/.test(password),
      label: "At least one number",
    },
    hasSpecialChar: {
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      label: "At least one special character (!@#$%^&*)",
    },
  };
};

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
  className,
}) => {
  const requirements = checkPasswordRequirements(password);

  return (
    <div
      className={cn(
        "space-y-2 rounded-md border p-3 text-sm",
        "border-gray-200 bg-gray-50",
        className
      )}
    >
      <p className="font-medium text-gray-700">Password requirements:</p>
      <div className="space-y-1">
        {Object.values(requirements).map((req: RequirementCheckResult, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-center gap-2 transition-colors",
              req.met ? "text-green-700" : "text-gray-500"
            )}
          >
            {req.met ? (
              <Check className="size-4 flex-shrink-0 text-green-600" />
            ) : (
              <X className="size-4 flex-shrink-0 text-gray-400" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const checkPasswordStrength = (password: string) => {
  const requirements = checkPasswordRequirements(password);
  const met = Object.values(requirements).filter((r) => r.met).length;
  const total = Object.keys(requirements).length;

  const strengthLevels: Record<string, string> = {
    none: "None",
    weak: "Weak",
    medium: "Good",
    strong: "Strong",
  };

  const level = met === 0 ? "none" : met <= 2 ? "weak" : met <= 4 ? "medium" : "strong";

  return {
    meetsAllRequirements: met === total,
    strength: {
      percentage: (met / total) * 100,
      level,
      label: strengthLevels[level],
    },
    details: requirements,
  };
};
