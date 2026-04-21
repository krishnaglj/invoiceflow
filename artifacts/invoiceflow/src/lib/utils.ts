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

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function currentFyAndMonth() {
  const now = new Date();
  const m = now.getMonth(); // 0-indexed; 3 = April
  const y = now.getFullYear();
  const fyStart = m >= 3 ? y : y - 1;
  const fy = `${fyStart.toString().slice(-2)}${(fyStart + 1).toString().slice(-2)}`;
  return { fy, month: MONTHS[m] };
}

function buildInitials(shopName: string): string {
  const SKIP = new Set(['pvt', 'ltd', 'co', 'the', 'and', 'a', 'an', 'of', 'ms', 'm/s', '&', 'llp']);
  const words = shopName
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 0 && !SKIP.has(w.toLowerCase()));
  if (words.length === 0) return 'INV';
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  if (words.length === 2) return (words[0].substring(0, 2) + words[1][0]).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

/**
 * Generates a smart invoice prefix from the shop name + Indian financial year + month.
 * Format: {INITIALS}/{FY}/{MMM}/ e.g. "RAE/2526/APR/" for "Rajesh Electronics" in April 2025
 *
 * Initials logic:
 *  - 1 meaningful word  → first 3 chars  ("Sharma"           → "SHA")
 *  - 2 meaningful words → 2 chars of w1 + 1 char of w2  ("Rajesh Electronics" → "RAE")
 *  - 3+ words           → first letter of first 3 words  ("Kumar Trading Co." → "KTC")
 *
 * Financial year: India runs Apr–Mar, so April 2025 → FY 2025-26 → "2526"
 */
export function generateInvoicePrefix(shopName: string): string {
  const { fy, month } = currentFyAndMonth();
  return `${buildInitials(shopName)}/${fy}/${month}/`;
}

/**
 * Checks whether a stored prefix follows the auto-generated pattern:
 *   INITIALS/YYYY/MMM/  (e.g. "RAE/2526/APR/")
 *   INITIALS/YYYY/      (old format without month — upgrades it)
 *
 * Returns the refreshed prefix for today if it needs updating, or null if:
 *   - It's already current, OR
 *   - It doesn't match the pattern (user has a fully custom prefix — leave it alone)
 */
export function refreshInvoicePrefix(stored: string): string | null {
  const match = stored.trim().match(/^([A-Z]{2,4})\/(\d{4})\/(?:([A-Z]{3})\/)?$/i);
  if (!match) return null; // custom prefix, don't touch

  const initials = match[1].toUpperCase();
  const { fy, month } = currentFyAndMonth();
  const expected = `${initials}/${fy}/${month}/`;
  return stored === expected ? null : expected;
}

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export const INDIAN_CITIES = [
  "Agra", "Ahmedabad", "Aizawl", "Ajmer", "Akola", "Aligarh", "Alwar", "Ambala",
  "Amravati", "Amritsar", "Anand", "Anantapur", "Asansol", "Aurangabad",
  "Bangalore", "Bareilly", "Belagavi", "Bhavnagar", "Bhilai", "Bhilwara", "Bhopal",
  "Bhubaneswar", "Bikaner", "Bilaspur", "Bokaro",
  "Chandigarh", "Chennai", "Coimbatore", "Cuttack",
  "Davangere", "Dehradun", "Delhi", "Dhanbad", "Durgapur",
  "Erode", "Ernakulam",
  "Faridabad", "Firozabad",
  "Gandhinagar", "Ghaziabad", "Gorakhpur", "Gulbarga", "Guntur", "Gurgaon",
  "Guwahati", "Gwalior",
  "Haridwar", "Hubli", "Hyderabad",
  "Imphal", "Indore",
  "Jabalpur", "Jaipur", "Jalandhar", "Jammu", "Jamnagar", "Jamshedpur",
  "Jhansi", "Jodhpur",
  "Kakinada", "Kanpur", "Kochi", "Kohima", "Kolhapur", "Kolkata", "Kota",
  "Kozhikode", "Kurnool",
  "Latur", "Lucknow", "Ludhiana",
  "Madurai", "Mangalore", "Mathura", "Meerut", "Moradabad", "Mumbai", "Muzaffarnagar",
  "Mysore",
  "Nagpur", "Nashik", "Navi Mumbai", "Nellore", "Noida",
  "Patiala", "Patna", "Pimpri-Chinchwad", "Pune",
  "Raipur", "Rajkot", "Rampur", "Ranchi", "Rohtak",
  "Salem", "Sangli", "Shillong", "Shimla", "Siliguri", "Solapur", "Srinagar", "Surat",
  "Thane", "Thiruvananthapuram", "Tiruchirappalli", "Tirunelveli", "Tiruppur",
  "Tirupati", "Tiruvannamalai",
  "Udaipur", "Ujjain",
  "Vadodara", "Varanasi", "Vasai-Virar", "Vijayawada", "Visakhapatnam",
  "Warangal",
];
