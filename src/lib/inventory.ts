import { differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { id as indonesianLocale } from "date-fns/locale";
import type { InventoryItem } from "@/lib/contracts";

function parseExpiryDate(value: string) {
  return startOfDay(parseISO(value));
}

export type { InventoryItem };

export type ExpiryStatus = "expired" | "expiring-soon" | "safe";
export const EXPIRING_SOON_THRESHOLD_DAYS = 7;

export const getExpiryStatus = (expirationDate: string): ExpiryStatus => {
  const diffDays = differenceInCalendarDays(parseExpiryDate(expirationDate), startOfDay(new Date()));

  if (diffDays < 0) return "expired";
  if (diffDays <= EXPIRING_SOON_THRESHOLD_DAYS) return "expiring-soon";
  return "safe";
};

export const getDaysUntilExpiry = (expirationDate: string): number => {
  return differenceInCalendarDays(parseExpiryDate(expirationDate), startOfDay(new Date()));
};

export const getExpiringSoonItems = (items: InventoryItem[]) =>
  items
    .filter((item) => getExpiryStatus(item.expirationDate) === "expiring-soon")
    .sort((a, b) => parseExpiryDate(a.expirationDate).getTime() - parseExpiryDate(b.expirationDate).getTime());

export const isLowStock = (item: InventoryItem) =>
  item.lowStockThreshold !== null && item.quantity <= item.lowStockThreshold;

export const canSuggestRestock = (item: InventoryItem) =>
  isLowStock(item) && item.restockTargetQuantity !== null && item.restockTargetQuantity > item.quantity;

export const getLastInventoryUpdate = (items: InventoryItem[]) => {
  if (items.length === 0) return null;

  return items.reduce<string | null>((latest, item) => {
    if (!latest) return item.updatedAt;
    return new Date(item.updatedAt).getTime() > new Date(latest).getTime() ? item.updatedAt : latest;
  }, null);
};

export const formatInventoryLastUpdate = (value: string | null) => {
  if (!value) return "Belum ada data";

  return format(parseISO(value), "dd MMM yyyy", { locale: indonesianLocale });
};

export const formatExpiryCountdown = (expirationDate: string) => {
  const days = getDaysUntilExpiry(expirationDate);

  if (days === 0) return "Hari ini";
  return `${days} hari lagi`;
};

export const CATEGORIES = [
  "Makanan",
  "Minuman",
  "Obat-obatan",
  "Bumbu Dapur",
  "Produk Kebersihan",
  "Kosmetik",
  "Lainnya",
];

export const UNITS = ["pcs", "kg", "gram", "liter", "ml", "botol", "bungkus", "kaleng", "kotak"];
