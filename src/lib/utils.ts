
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { FIXED_COLUMN_IDS } from "@/types/kanban"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Get column color class based on column ID
export function getColumnColorClass(columnId: string) {
  switch (columnId) {
    case FIXED_COLUMN_IDS.NEW_LEAD:
      return "border-l-4 border-l-ticlin";
    case FIXED_COLUMN_IDS.WON:
      return "border-l-4 border-l-green-500";
    case FIXED_COLUMN_IDS.LOST:
      return "border-l-4 border-l-red-500";
    default:
      return ""; // Default, no special color for custom columns
  }
}

// Add custom scrollbar styling to the global css
document.documentElement.style.setProperty(
  "--scrollbar-thumb", 
  "rgba(156, 163, 175, 0.5)"
);
document.documentElement.style.setProperty(
  "--scrollbar-track", 
  "rgba(229, 231, 235, 0.1)"
);

/**
 * Format a number as currency (BRL)
 */
export function formatCurrency(value: number): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Parse a currency string to number
 */
export function parseCurrency(formattedValue: string): number {
  const numbers = formattedValue.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(numbers) || 0;
}

// Generate a lead ID in the format "ID: XXXXXXXX"
export function generateLeadId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'ID: ';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
