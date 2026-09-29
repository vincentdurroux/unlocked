import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatName(name: string | null | undefined): string {
  if (!name) return '';
  let cleanName = name.includes('|') ? name.split('|')[0] : name;
  cleanName = cleanName.trim();
  if (cleanName.includes('@')) {
    const prefix = cleanName.split('@')[0];
    cleanName = prefix.replace(/[._-]/g, ' ');
  }
  const parts = cleanName.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    const formattedFirst = first.charAt(0).toUpperCase() + first.slice(1);
    const formattedLastInitial = last.charAt(0).toUpperCase() + '.';
    return `${formattedFirst} ${formattedLastInitial}`;
  }
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return '';
}
