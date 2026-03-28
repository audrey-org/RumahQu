import { useMemo, useState } from "react";
import { ClipboardCheck, ShoppingCart } from "lucide-react";
import { useShoppingList } from "@/hooks/useShoppingList";
import { AddShoppingListDialog } from "@/components/AddShoppingListDialog";
import { ShoppingListItemRow } from "@/components/ShoppingListItemRow";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FilterTab = "pending" | "purchased" | "all";

interface Props {
  groupId?: string;
}

export function ShoppingListSection({ groupId }: Props) {
  const [filter, setFilter] = useState<FilterTab>("pending");
  const shoppingListQuery = useShoppingList(groupId);
  const items = useMemo(() => shoppingListQuery.data ?? [], [shoppingListQuery.data]);

  const pendingItems = useMemo(() => items.filter((item) => !item.isPurchased), [items]);
  const purchasedItems = useMemo(() => items.filter((item) => item.isPurchased), [items]);
  const filteredItems = useMemo(() => {
    if (filter === "pending") {
      return pendingItems;
    }

    if (filter === "purchased") {
      return purchasedItems;
    }

    return items;
  }, [filter, items, pendingItems, purchasedItems]);

  return (
    <Card className="border-primary/10 shadow-sm">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg font-extrabold">Daftar Belanja Restock</CardTitle>
          </div>
          <CardDescription>
            Catat barang yang perlu dibeli ulang supaya stok rumah tetap aman.
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="font-bold">
              {pendingItems.length} perlu dibeli
            </Badge>
            <Badge variant="secondary" className="font-bold">
              {purchasedItems.length} sudah dibeli
            </Badge>
          </div>
        </div>
        <AddShoppingListDialog groupId={groupId} />
      </CardHeader>
      <CardContent className="space-y-4">
        {shoppingListQuery.error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Gagal memuat daftar belanja. Silakan coba lagi.
          </div>
        )}

        <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterTab)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="pending" className="flex-1 text-xs font-bold sm:flex-none">
              Perlu Dibeli
            </TabsTrigger>
            <TabsTrigger value="purchased" className="flex-1 text-xs font-bold sm:flex-none">
              Sudah Dibeli
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1 text-xs font-bold sm:flex-none">
              Semua
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {shoppingListQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Memuat daftar belanja...</div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center">
            <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-bold text-muted-foreground">
              {filter === "purchased"
                ? "Belum ada item yang ditandai sudah dibeli"
                : filter === "all"
                  ? "Belum ada daftar belanja"
                  : "Belum ada barang yang perlu dibeli"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tambahkan barang yang mau dibeli lagi untuk isi stok rumah.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((item) => (
              <ShoppingListItemRow key={item.id} item={item} groupId={groupId} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
