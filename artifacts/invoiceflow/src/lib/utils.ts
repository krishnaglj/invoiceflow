import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string | Date | undefined | null) {
  if (!dateString) return "-";
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(d);
}

/**
 * Generates a smart invoice prefix from the shop name + Indian financial year.
 * Format: {INITIALS}/{FY}/ e.g. "RAE/2526/" for "Rajesh Electronics" in FY 2025-26
 *
 * Initials logic:
 *  - 1 meaningful word  → first 3 chars  ("Sharma"           → "SHA")
 *  - 2 meaningful words → 2 chars of w1 + 1 char of w2  ("Rajesh Electronics" → "RAE")
 *  - 3+ words           → first letter of first 3 words  ("Kumar Trading Co." → "KTC")
 *
 * Financial year: India runs Apr–Mar, so April 2025 → FY 2025-26 → "2526"
 */
export function generateInvoicePrefix(shopName: string): string {
  const SKIP = new Set(['pvt', 'ltd', 'co', 'the', 'and', 'a', 'an', 'of', 'ms', 'm/s', '&', 'llp']);

  const words = shopName
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 0 && !SKIP.has(w.toLowerCase()));

  let initials: string;
  if (words.length === 0) {
    initials = 'INV';
  } else if (words.length === 1) {
    initials = words[0].substring(0, 3).toUpperCase();
  } else if (words.length === 2) {
    initials = (words[0].substring(0, 2) + words[1][0]).toUpperCase();
  } else {
    initials = words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
  }

  // Indian financial year: April–March
  const now = new Date();
  const month = now.getMonth(); // 0-indexed; 3 = April
  const year = now.getFullYear();
  const fyStart = month >= 3 ? year : year - 1;
  const fyEnd = (fyStart + 1).toString().slice(-2);
  const fy = `${fyStart.toString().slice(-2)}${fyEnd}`;

  return `${initials}/${fy}/`;
}

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];
