const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

/**
 * Escapes regular-expression metacharacters so arbitrary user input can be
 * embedded as a literal pattern in a MongoDB $regex filter (search injection /
 * unintended matches / backtracking protection).
 */
export function escapeRegex(value: string): string {
  return value.replace(REGEX_SPECIAL_CHARS, "\\$&");
}

export interface FormattedValidationError {
  message: string;
  fields: Record<string, string[]>;
}

export function formatZodError(error: {
  errors: { path: (string | number)[]; message: string }[];
}): FormattedValidationError {
  const fields: Record<string, string[]> = {};

  for (const err of error.errors) {
    const fieldPath = err.path.length > 0 ? err.path.join(".") : "root";
    if (!fields[fieldPath]) {
      fields[fieldPath] = [];
    }
    fields[fieldPath].push(err.message);
  }

  return {
    message: "Request validation failed.",
    fields
  };
}
