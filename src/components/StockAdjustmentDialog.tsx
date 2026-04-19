import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { InventoryAdjustmentType, InventoryItem } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Props {
  item: InventoryItem;
  groupId?: string;
}

export function StockAdjustmentDialog({ item, groupId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<InventoryAdjustmentType>("use");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [restockTargetQuantity, setRestockTargetQuantity] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setLowStockThreshold(item.lowStockThreshold === null ? "" : String(item.lowStockThreshold));
    setRestockTargetQuantity(item.restockTargetQuantity === null ? "" : String(item.restockTargetQuantity));
  }, [item.lowStockThreshold, item.restockTargetQuantity, open]);

  const adjustmentsQuery = useQuery({
    queryKey: queryKeys.inventoryAdjustments(item.id),
    enabled: open,
    retry: false,
    queryFn: async () => {
      const response = await api.getInventoryAdjustments(item.id);
      return response.adjustments;
    },
  });

  const parsedQuantity = Number(quantity);
  const nextQuantity = useMemo(() => {
    if (Number.isNaN(parsedQuantity)) {
      return item.quantity;
    }

    if (type === "add") {
      return item.quantity + parsedQuantity;
    }

    if (type === "use") {
      return item.quantity - parsedQuantity;
    }

    return parsedQuantity;
  }, [item.quantity, parsedQuantity, type]);

  const refreshInventory = async () => {
    if (!groupId) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory(groupId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.mealRecommendations(groupId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryAdjustments(item.id) }),
    ]);
  };

  const adjustMutation = useMutation({
    mutationFn: () =>
      api.adjustInventoryStock(item.id, {
        type,
        quantity: parsedQuantity,
        reason: reason || undefined,
      }),
    onSuccess: async () => {
      await refreshInventory();
      setReason("");
      setQuantity("1");
      toast({ title: "Stok diperbarui", description: "Perubahan stok berhasil disimpan" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: () =>
      api.updateInventoryItem(item.id, {
        lowStockThreshold: lowStockThreshold.trim() === "" ? null : Number(lowStockThreshold),
        restockTargetQuantity: restockTargetQuantity.trim() === "" ? null : Number(restockTargetQuantity),
      }),
    onSuccess: async () => {
      await refreshInventory();
      toast({ title: "Pengaturan disimpan", description: "Batas stok rendah berhasil diperbarui" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const invalidAdjustment =
    !groupId ||
    Number.isNaN(parsedQuantity) ||
    parsedQuantity < 0 ||
    ((type === "add" || type === "use") && parsedQuantity <= 0) ||
    nextQuantity < 0 ||
    adjustMutation.isPending;

  const parsedThreshold = lowStockThreshold.trim() === "" ? null : Number(lowStockThreshold);
  const parsedTarget = restockTargetQuantity.trim() === "" ? null : Number(restockTargetQuantity);
  const invalidSettings =
    !groupId ||
    (parsedThreshold !== null && (Number.isNaN(parsedThreshold) || parsedThreshold < 0)) ||
    (parsedTarget !== null && (Number.isNaN(parsedTarget) || parsedTarget < 0)) ||
    (parsedThreshold !== null && parsedTarget !== null && parsedTarget <= parsedThreshold) ||
    settingsMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Atur Stok
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Atur Stok {item.name}</DialogTitle>
          <DialogDescription>
            Catat perubahan stok dan atur batas restock untuk barang ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            Stok sekarang: <span className="font-bold">{item.quantity} {item.unit}</span>
          </div>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Jenis perubahan</Label>
                <Select value={type} onValueChange={(value) => setType(value as InventoryAdjustmentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="use">Pakai</SelectItem>
                    <SelectItem value="add">Tambah</SelectItem>
                    <SelectItem value="set">Setel jumlah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`adjust-quantity-${item.id}`}>{type === "set" ? "Jumlah akhir" : "Jumlah"}</Label>
                <Input
                  id={`adjust-quantity-${item.id}`}
                  type="number"
                  min={type === "set" ? 0 : 1}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`adjust-reason-${item.id}`}>Alasan (opsional)</Label>
              <Textarea
                id={`adjust-reason-${item.id}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Contoh: dipakai untuk sarapan"
                rows={2}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              Stok setelah disimpan: <span className="font-bold text-foreground">{Math.max(nextQuantity, 0)} {item.unit}</span>
              {nextQuantity < 0 && <span className="ml-2 font-medium text-destructive">Stok tidak boleh negatif.</span>}
            </div>

            <Button type="button" onClick={() => adjustMutation.mutate()} disabled={invalidAdjustment}>
              Simpan Perubahan Stok
            </Button>
          </div>

          <div className="grid gap-3 border-t pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor={`threshold-${item.id}`}>Batas stok rendah</Label>
                <Input
                  id={`threshold-${item.id}`}
                  type="number"
                  min="0"
                  placeholder="Opsional"
                  value={lowStockThreshold}
                  onChange={(event) => setLowStockThreshold(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`target-${item.id}`}>Target restock</Label>
                <Input
                  id={`target-${item.id}`}
                  type="number"
                  min="0"
                  placeholder="Opsional"
                  value={restockTargetQuantity}
                  onChange={(event) => setRestockTargetQuantity(event.target.value)}
                />
              </div>
            </div>

            {parsedThreshold !== null && parsedTarget !== null && parsedTarget <= parsedThreshold && (
              <p className="text-xs font-medium text-destructive">
                Target restock harus lebih besar dari batas stok rendah.
              </p>
            )}

            <Button type="button" variant="outline" onClick={() => settingsMutation.mutate()} disabled={invalidSettings}>
              Simpan Batas Restock
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="mb-2 text-sm font-bold">Riwayat Terakhir</h4>
            {adjustmentsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat riwayat...</p>
            ) : (adjustmentsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada perubahan stok.</p>
            ) : (
              <div className="max-h-44 space-y-2 overflow-auto pr-1">
                {(adjustmentsQuery.data ?? []).map((adjustment) => (
                  <div key={adjustment.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold">
                        {adjustment.type === "add" ? "Tambah" : adjustment.type === "use" ? "Pakai" : "Setel"}
                        {" "}
                        ({adjustment.quantityBefore} {"->"} {adjustment.quantityAfter})
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(adjustment.createdAt), "dd MMM yyyy, HH:mm", { locale: localeId })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {adjustment.adjustedByName ? `Oleh ${adjustment.adjustedByName}` : "Oleh anggota grup"}
                      {adjustment.reason ? ` - ${adjustment.reason}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
