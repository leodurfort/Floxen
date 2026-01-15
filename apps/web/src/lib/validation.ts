/**
 * Shared validation utilities for form inputs
 */

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

/**
 * Calculate password strength based on length and character variety
 * Returns a score from 0-5, with label and CSS color class
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: '', color: 'bg-gray-200' };
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-500' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500' };
  if (score <= 4) return { score, label: 'Strong', color: 'bg-green-500' };
  return { score, label: 'Very Strong', color: 'bg-emerald-500' };
}

/**
 * Validate URL format
 * Returns true for empty strings (optional fields) or valid URLs
 */
export function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    new URL(value.trim());
    return true;
  } catch {
    return false;
  }
}

/**
 * Format a date timestamp for display
 */
export function formatTimestamp(date: string | null | undefined): string {
  if (!date) return 'Never';
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
