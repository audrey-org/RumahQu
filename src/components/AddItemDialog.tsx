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
}

export function AddItemDialog({ onAdded, groupId, trigger }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [date, setDate] = useState<Date>();
  const [notes, setNotes] = useState("");
  const createItemMutation = useMutation({
    mutationFn: () =>
      api.createInventoryItem({
        groupId: groupId!,
        name,
        category,
        quantity: Number(quantity),
        unit,
        expirationDate: date!.toISOString(),
        notes: notes || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.inventory(groupId!),
      });
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
    setName("");
    setCategory("");
    setQuantity("1");
    setUnit("pcs");
    setDate(undefined);
    setDatePickerOpen(false);
    setNotes("");
  };

  const handleSubmit = () => {
    if (!name || !category || !date || !groupId) return;
    createItemMutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
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
              <Input id="qty" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
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

          <div className="grid gap-2">
            <Label htmlFor="notes">Catatan (opsional)</Label>
            <Textarea id="notes" placeholder="Catatan tambahan..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!name || !category || !date || !groupId || createItemMutation.isPending}
            className="w-full font-bold text-base mt-2"
          >
            Simpan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
