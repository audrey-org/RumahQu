import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, ChevronDown, ChevronRight } from "lucide-react";
import {
  CATEGORIES,
  formatInventoryLastUpdate,
  getExpiryStatus,
  getLastInventoryUpdate,
  type InventoryItem,
} from "@/lib/inventory";
import { useGroup } from "@/contexts/GroupContext";
import { useInventory } from "@/hooks/useInventory";
import { ExpiringSoonAlert } from "@/components/ExpiringSoonAlert";
import { ItemCard } from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useExpiringSoonNotification } from "@/hooks/useExpiringSoonNotification";

const Inventory = () => {
  const { activeGroup } = useGroup();
  const navigate = useNavigate();
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set());
  const inventoryQuery = useInventory(activeGroup?.id);
  const currentItems = useMemo(() => inventoryQuery.data ?? [], [inventoryQuery.data]);
  const lastUpdatedAt = useMemo(() => getLastInventoryUpdate(currentItems), [currentItems]);
  const { notificationsSupported, notificationPermission, enableNotifications } = useExpiringSoonNotification(
    currentItems,
    activeGroup?.id,
    activeGroup?.name,
  );

  usePageMeta({
    title: "Inventory",
    description: "Lihat inventaris lengkap per kategori, stok aktif, dan barang yang mendekati masa kedaluwarsa di RumahQu.",
  });

  const grouped = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    for (const cat of CATEGORIES) map.set(cat, []);
    for (const item of currentItems) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [currentItems]);

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const totalByStatus = (items: InventoryItem[]) => {
    let expired = 0, expiring = 0, safe = 0;
    for (const i of items) {
      const s = getExpiryStatus(i.expirationDate);
      if (s === "expired") expired++;
      else if (s === "expiring-soon") expiring++;
      else safe++;
    }
    return { expired, expiring, safe };
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto flex items-center gap-3 py-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold">Inventory</h1>
                {activeGroup && (
                  <Badge variant="outline" className="text-xs">{activeGroup.name}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Last update: {formatInventoryLastUpdate(lastUpdatedAt)}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto font-bold">
            {currentItems.length} barang
          </Badge>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto space-y-3 px-4 py-6 pb-32 md:pb-6">
        {inventoryQuery.error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Gagal memuat inventory untuk grup ini.
          </div>
        )}

        <ExpiringSoonAlert
          items={currentItems}
          notificationSupported={notificationsSupported}
          notificationPermission={notificationPermission}
          onEnableNotifications={() => void enableNotifications()}
        />

        {inventoryQuery.isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Memuat inventory...</div>
        ) : (
          <>
            {CATEGORIES.map((cat) => {
              const catItems = grouped.get(cat) || [];
              const isOpen = openCategories.has(cat);
              const stats = totalByStatus(catItems);

              return (
                <Collapsible key={cat} open={isOpen} onOpenChange={() => toggleCategory(cat)}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors text-left">
                      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <span className="font-bold text-base flex-1">{cat}</span>
                      <div className="flex items-center gap-2">
                        {stats.expired > 0 && <Badge variant="destructive" className="text-xs">{stats.expired} kadaluarsa</Badge>}
                        {stats.expiring > 0 && <Badge className="text-xs bg-expiring-soon text-warning-foreground border-0">{stats.expiring} segera exp</Badge>}
                        <Badge variant="outline" className="text-xs font-bold">{catItems.length}</Badge>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {catItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-3 px-4 italic">Belum ada barang di kategori ini</p>
                    ) : (
                      <div className="grid gap-2 pt-2 pl-4">
                        {catItems
                          .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime())
                          .map((item) => (
                            <ItemCard key={item.id} item={item} onDeleted={() => void inventoryQuery.refetch()} groupId={activeGroup?.id} />
                          ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            {currentItems.length === 0 && (
              <div className="text-center py-16">
                <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg font-bold text-muted-foreground">Inventory kosong</p>
                <p className="text-sm text-muted-foreground">Tambahkan barang dari halaman utama</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Inventory;
