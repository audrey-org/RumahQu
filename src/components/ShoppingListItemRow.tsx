import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, ShoppingCart, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ShoppingListItem } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { AddItemDialog } from "@/components/AddItemDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface Props {
  item: ShoppingListItem;
  groupId?: string;
}

export function ShoppingListItemRow({ item, groupId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refreshList = async () => {
    if (!groupId) {
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: queryKeys.shoppingList(groupId),
    });
  };

  const refreshInventory = async () => {
    if (!groupId) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory(groupId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.mealRecommendations(groupId),
      }),
    ]);
  };

  const toggleMutation = useMutation({
    mutationFn: (isPurchased: boolean) =>
      api.updateShoppingListItem(item.id, {
        isPurchased,
      }),
    onSuccess: async () => {
      await refreshList();
      toast({
        title: item.isPurchased ? "Dikembalikan ke daftar" : "Sudah dibeli",
        description: item.isPurchased
          ? "Item kembali masuk ke daftar belanja aktif"
          : "Item ditandai sudah dibeli",
      });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteShoppingListItem(item.id),
    onSuccess: async () => {
      await refreshList();
      toast({ title: "Dihapus", description: "Item belanja berhasil dihapus" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const isBusy = toggleMutation.isPending || deleteMutation.isPending;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 transition-colors",
        item.isPurchased ? "border-border bg-muted/40" : "border-primary/15 bg-card",
      )}
    >
      <Checkbox
        checked={item.isPurchased}
        disabled={isBusy}
        onCheckedChange={(checked) => toggleMutation.mutate(checked === true)}
        aria-label={item.isPurchased ? `Tandai ${item.name} belum dibeli` : `Tandai ${item.name} sudah dibeli`}
        className="mt-1"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("font-bold text-base", item.isPurchased && "text-muted-foreground line-through")}>
            {item.name}
          </p>
          <Badge variant={item.isPurchased ? "secondary" : "outline"}>
            {item.isPurchased ? "Sudah dibeli" : "Perlu dibeli"}
          </Badge>
          <Badge variant="outline">{item.category}</Badge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {item.quantity} {item.unit}
          </span>
          {item.createdByName && <span>Dicatat oleh {item.createdByName}</span>}
          {item.purchasedAt && (
            <span>
              Dibeli {format(parseISO(item.purchasedAt), "dd MMM yyyy, HH:mm", { locale: localeId })}
              {item.purchasedByName ? ` oleh ${item.purchasedByName}` : ""}
            </span>
          )}
        </div>

        {item.notes && (
          <p className={cn("text-sm italic text-muted-foreground", item.isPurchased && "line-through")}>
            {item.notes}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {!item.isPurchased && <ShoppingCart className="h-4 w-4 text-primary" aria-hidden="true" />}
        {item.isPurchased && (
          <AddItemDialog
            groupId={groupId}
            onAdded={() => void refreshInventory()}
            initialValues={{
              name: item.name,
              category: item.category,
              quantity: item.quantity,
              unit: item.unit,
              notes: item.notes,
            }}
            trigger={
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <PackagePlus className="h-4 w-4" />
                Tambah ke Inventory
              </Button>
            }
          />
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => deleteMutation.mutate()}
          disabled={isBusy}
          className="shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Hapus ${item.name} dari daftar belanja`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
