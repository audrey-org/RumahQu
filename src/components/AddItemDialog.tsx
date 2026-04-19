import { type ReactNode, useState } from "react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { CATEGORIES, UNITS } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onAdded: () => void;
  groupId?: string;
  trigger?: ReactNode;
  initialValues?: {
    name?: string;
    category?: string;
    quantity?: number;
    unit?: string;
    notes?: string | null;
    lowStockThreshold?: number | null;
    restockTargetQuantity?: number | null;
  };
}

export function AddItemDialog({ onAdded, groupId, trigger, initialValues }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [name, setName] = useState(initialValues?.name ?? "");
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [quantity, setQuantity] = useState(String(initialValues?.quantity ?? 1));
  const [unit, setUnit] = useState(initialValues?.unit ?? "pcs");
  const [date, setDate] = useState<Date>();
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [lowStockThreshold, setLowStockThreshold] = useState(
    initialValues?.lowStockThreshold === undefined || initialValues.lowStockThreshold === null
      ? ""
      : String(initialValues.lowStockThreshold),
  );
  const [restockTargetQuantity, setRestockTargetQuantity] = useState(
    initialValues?.restockTargetQuantity === undefined || initialValues.restockTargetQuantity === null
      ? ""
      : String(initialValues.restockTargetQuantity),
  );

  const parseOptionalQuantity = (value: string) => {
    if (value.trim() === "") return null;
    return Number(value);
  };

  const createItemMutation = useMutation({
    mutationFn: () =>
      api.createInventoryItem({
        groupId: groupId!,
        name,
        category,
        quantity: Number(quantity),
        unit,
        lowStockThreshold: parseOptionalQuantity(lowStockThreshold),
        restockTargetQuantity: parseOptionalQuantity(restockTargetQuantity),
        expirationDate: date!.toISOString(),
        notes: notes || undefined,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.inventory(groupId!),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.mealRecommendations(groupId!),
        }),
      ]);
      reset();
      setOpen(false);
      onAdded();
      toast({ title: "Berhasil", description: "Barang berhasil ditambahkan" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const reset = () => {
    setName(initialValues?.name ?? "");
    setCategory(initialValues?.category ?? "");
    setQuantity(String(initialValues?.quantity ?? 1));
    setUnit(initialValues?.unit ?? "pcs");
    setDate(undefined);
    setDatePickerOpen(false);
    setNotes(initialValues?.notes ?? "");
    setLowStockThreshold(
      initialValues?.lowStockThreshold === undefined || initialValues.lowStockThreshold === null
        ? ""
        : String(initialValues.lowStockThreshold),
    );
    setRestockTargetQuantity(
      initialValues?.restockTargetQuantity === undefined || initialValues.restockTargetQuantity === null
        ? ""
        : String(initialValues.restockTargetQuantity),
    );
  };

  const handleSubmit = () => {
    const parsedQuantity = Number(quantity);
    const parsedLowThreshold = parseOptionalQuantity(lowStockThreshold);
    const parsedRestockTarget = parseOptionalQuantity(restockTargetQuantity);

    if (
      !name ||
      !category ||
      !date ||
      !groupId ||
      Number.isNaN(parsedQuantity) ||
      parsedQuantity < 0 ||
      (parsedLowThreshold !== null && (Number.isNaN(parsedLowThreshold) || parsedLowThreshold < 0)) ||
      (parsedRestockTarget !== null && (Number.isNaN(parsedRestockTarget) || parsedRestockTarget < 0)) ||
      (parsedLowThreshold !== null && parsedRestockTarget !== null && parsedRestockTarget <= parsedLowThreshold)
    ) {
      return;
    }

    createItemMutation.mutate();
  };

  const isInvalidRestockTarget =
    lowStockThreshold.trim() !== "" &&
    restockTargetQuantity.trim() !== "" &&
    Number(restockTargetQuantity) <= Number(lowStockThreshold);

  const isSubmitDisabled =
    !name ||
    !category ||
    !date ||
    !groupId ||
    Number(quantity) < 0 ||
    isInvalidRestockTarget ||
    createItemMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          reset();
        }
        setOpen(nextOpen);
        if (!nextOpen) {
          setDatePickerOpen(false);
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="gap-2 rounded-full shadow-lg font-bold text-base">
            <Plus className="h-5 w-5" />
            Tambah Barang
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Tambah Barang Baru</DialogTitle>
          <DialogDescription>
            Isi detail barang dan pilih tanggal kadaluarsa untuk menyimpan item baru.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Nama Barang</Label>
            <Input id="name" placeholder="Contoh: Susu UHT" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Tanggal Kadaluarsa</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy") : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(selectedDate) => {
                      setDate(selectedDate);
                      if (selectedDate) {
                        setDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="qty">Jumlah</Label>
              <Input id="qty" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Satuan</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="low-stock-threshold">Batas stok rendah</Label>
              <Input
                id="low-stock-threshold"
                type="number"
                min="0"
                placeholder="Opsional"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="restock-target">Target restock</Label>
              <Input
                id="restock-target"
                type="number"
                min="0"
                placeholder="Opsional"
                value={restockTargetQuantity}
                onChange={(e) => setRestockTargetQuantity(e.target.value)}
              />
            </div>
          </div>

          {isInvalidRestockTarget && (
            <p className="text-xs font-medium text-destructive">
              Target restock harus lebih besar dari batas stok rendah.
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="notes">Catatan (opsional)</Label>
            <Textarea id="notes" placeholder="Catatan tambahan..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="w-full font-bold text-base mt-2"
          >
            Simpan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
