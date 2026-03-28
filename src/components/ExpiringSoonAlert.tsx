import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronRight, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EXPIRING_SOON_THRESHOLD_DAYS,
  formatExpiryCountdown,
  getExpiringSoonItems,
  type InventoryItem,
} from "@/lib/inventory";
import { cn } from "@/lib/utils";

interface Props {
  items: InventoryItem[];
  className?: string;
  onViewAll?: () => void;
}

export function ExpiringSoonAlert({ items, className, onViewAll }: Props) {
  const expiringSoonItems = useMemo(() => getExpiringSoonItems(items), [items]);

  if (expiringSoonItems.length === 0) return null;

  const previewItems = expiringSoonItems.slice(0, 3);
  const remainingItems = expiringSoonItems.length - previewItems.length;
  const summary =
    expiringSoonItems.length === 1
      ? `Ada 1 barang yang akan kadaluarsa dalam ${EXPIRING_SOON_THRESHOLD_DAYS} hari ke depan.`
      : `Ada ${expiringSoonItems.length} barang yang akan kadaluarsa dalam ${EXPIRING_SOON_THRESHOLD_DAYS} hari ke depan.`;

  return (
    <Alert className={cn("border-expiring-soon/40 bg-warning/10", className)}>
      <Clock className="h-4 w-4 text-expiring-soon" />
      <AlertTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>Notifikasi stok</span>
        <Badge className="w-fit border-0 bg-expiring-soon text-warning-foreground">
          {expiringSoonItems.length} segera exp
        </Badge>
      </AlertTitle>

      <AlertDescription className="space-y-3">
        <p>{summary}</p>

        <div className="grid gap-2">
          {previewItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-md border border-expiring-soon/30 bg-background/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.category} | Exp {format(parseISO(item.expirationDate), "dd MMM yyyy", { locale: localeId })}
                </p>
              </div>
              <Badge
                variant="outline"
                className="w-fit border-expiring-soon/40 bg-background/80 font-semibold text-foreground"
              >
                {formatExpiryCountdown(item.expirationDate)}
              </Badge>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {remainingItems > 0 ? `Masih ada ${remainingItems} barang lain yang perlu dicek.` : "Cek stok sekarang agar tidak terlewat."}
          </p>

          {onViewAll && (
            <Button type="button" variant="outline" size="sm" onClick={onViewAll} className="w-full sm:w-auto">
              Lihat inventory
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
