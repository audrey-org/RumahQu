import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ShoppingCart } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { CATEGORIES, UNITS } from "@/lib/inventory";
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
  groupId?: string;
}

export function AddShoppingListDialog({ groupId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setName("");
    setCategory("");
    setQuantity("1");
    setUnit("pcs");
    setNotes("");
  };

  const createItemMutation = useMutation({
    mutationFn: () =>
      api.createShoppingListItem({
        groupId: groupId!,
        name,
        category,
        quantity: Number(quantity),
        unit,
        notes: notes || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.shoppingList(groupId!),
      });
      reset();
      setOpen(false);
      toast({ title: "Berhasil", description: "Item belanja berhasil ditambahkan" });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!groupId || !name || !category || Number(quantity) <= 0) {
      return;
    }

    createItemMutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-full font-bold">
          <Plus className="h-4 w-4" />
          Tambah Belanja
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Tambah Daftar Belanja
          </DialogTitle>
          <DialogDescription>
            Catat barang yang perlu dibeli lagi untuk mengisi stok rumah.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="shopping-name">Nama Barang</Label>
            <Input
              id="shopping-name"
              placeholder="Contoh: Telur ayam"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((currentCategory) => (
                    <SelectItem key={currentCategory} value={currentCategory}>
                      {currentCategory}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shopping-qty">Jumlah Target</Label>
              <Input
                id="shopping-qty"
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Satuan</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((currentUnit) => (
                  <SelectItem key={currentUnit} value={currentUnit}>
                    {currentUnit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="shopping-notes">Catatan (opsional)</Label>
            <Textarea
              id="shopping-notes"
              placeholder="Contoh: beli merek yang biasa dipakai"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!groupId || !name || !category || Number(quantity) <= 0 || createItemMutation.isPending}
            className="w-full font-bold text-base mt-2"
          >
            Simpan ke Daftar Belanja
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
