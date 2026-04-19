import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, AlertTriangle, Clock, CheckCircle, ShoppingCart } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { InventoryItem, canSuggestRestock, getExpiryStatus, getDaysUntilExpiry, isLowStock } from "@/lib/inventory";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockAdjustmentDialog } from "@/components/StockAdjustmentDialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  item: InventoryItem;
  onDeleted: () => void;
  groupId?: string;
}

const statusConfig = {
  expired: {
    icon: AlertTriangle,
    label: "Kadaluarsa",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    badgeClass: "bg-destructive text-destructive-foreground",
  },
  "expiring-soon": {
    icon: Clock,
    label: "Segera Kadaluarsa",
    className: "bg-warning/10 text-warning-foreground border-expiring-soon/30",
    badgeClass: "bg-expiring-soon text-warning-foreground",
  },
  safe: {
    icon: CheckCircle,
    label: "Aman",
    className: "bg-success/10 text-foreground border-safe/30",
    badgeClass: "bg-safe text-success-foreground",
  },
};

export function ItemCard({ item, onDeleted, groupId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const status = getExpiryStatus(item.expirationDate);
  const days = getDaysUntilExpiry(item.expirationDate);
  const config = statusConfig[status];
  const Icon = config.icon;
  const lowStock = isLowStock(item);
  const restockAvailable = canSuggestRestock(item);
  const deleteMutation = useMutation({
    mutationFn: () => api.deleteInventoryItem(item.id),
    onSuccess: async () => {
      if (groupId) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.inventory(groupId),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.mealRecommendations(groupId),
          }),
        ]);
      }
      onDeleted();
    },
    onError: (error) => {
      toast({ title: "Gagal", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const restockMutation = useMutation({
    mutationFn: () => api.createRestockSuggestion(item.id),
    onSuccess: async (response) => {
      if (groupId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.shoppingList(groupId),
        });
      }

      toast({
        title: response.status === "added" ? "Masuk daftar belanja" : "Sudah ada di daftar belanja",
        description:
          response.status === "added"
            ? `${item.name} ditambahkan ke daftar belanja restock`
            : `${item.name} sudah ada di daftar belanja aktif`,
      });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  return (
    <div className={cn("rounded-lg border-2 p-4 transition-all hover:shadow-md", config.className, status === "expiring-soon" && "animate-pulse-warning")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg truncate">{item.name}</h3>
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap", config.badgeClass)}>
              <Icon className="inline h-3 w-3 mr-1" />
              {config.label}
            </span>
            {item.quantity === 0 && <Badge variant="destructive">Stok habis</Badge>}
            {lowStock && item.quantity > 0 && <Badge variant="secondary">Stok rendah</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mb-2">{item.category}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="font-medium">{item.quantity} {item.unit}</span>
            {item.lowStockThreshold !== null && (
              <span>Batas rendah: {item.lowStockThreshold} {item.unit}</span>
            )}
            <span>Exp: {format(parseISO(item.expirationDate), "dd MMM yyyy", { locale: localeId })}</span>
            <span className="font-semibold">
              {days < 0 ? `${Math.abs(days)} hari lalu` : days === 0 ? "Hari ini!" : `${days} hari lagi`}
            </span>
          </div>
          {item.notes && <p className="text-xs text-muted-foreground mt-2 italic">{item.notes}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <StockAdjustmentDialog item={item} groupId={groupId} />
            {restockAvailable && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => restockMutation.mutate()}
                disabled={restockMutation.isPending}
              >
                <ShoppingCart className="h-4 w-4" />
                Tambah ke Belanja
              </Button>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="text-muted-foreground hover:text-destructive shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
