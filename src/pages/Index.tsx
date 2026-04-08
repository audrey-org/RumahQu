import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Package, ClipboardList, Shield, Users } from "lucide-react";
import { getExpiryStatus } from "@/lib/inventory";
import { useAuth } from "@/contexts/AuthContext";
import { useGroup } from "@/contexts/GroupContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInventory } from "@/hooks/useInventory";
import { useExpiringSoonNotification } from "@/hooks/useExpiringSoonNotification";
import { AddItemDialog } from "@/components/AddItemDialog";
import { ExpiringSoonAlert } from "@/components/ExpiringSoonAlert";
import { ItemCard } from "@/components/ItemCard";
import { ShoppingListSection } from "@/components/ShoppingListSection";
import { StatsCards } from "@/components/StatsCards";
import { MealRecommendationsSection } from "@/components/MealRecommendationsSection";
import { GroupSwitcher } from "@/components/GroupSwitcher";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePageMeta } from "@/hooks/usePageMeta";
import { APP_NAME } from "@/lib/brand";

type FilterTab = "all" | "expired" | "expiring-soon" | "safe";

const Index = () => {
  const { user } = useAuth();
  const { activeGroup, pendingInvites, error: groupError } = useGroup();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const inventoryQuery = useInventory(activeGroup?.id);
  const items = useMemo(() => inventoryQuery.data ?? [], [inventoryQuery.data]);
  const { notificationsSupported, notificationPermission, enableNotifications } = useExpiringSoonNotification(
    items,
    activeGroup?.id,
    activeGroup?.name,
  );

  usePageMeta({
    title: "Dashboard",
    description: "Pantau stok rumah, masa simpan, dan aktivitas inventaris keluarga dari satu dashboard RumahQu.",
    noIndex: true,
    canonicalPath: "/app",
  });

  const initials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== "all") {
      list = list.filter((i) => getExpiryStatus(i.expirationDate) === filter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
  }, [items, filter, search]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-xl p-2">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
          <div>
              <h1 className="text-xl font-extrabold leading-tight">{APP_NAME}</h1>
              <p className="text-xs text-muted-foreground font-medium">Halo, {user?.fullName?.split(" ")[0] || "User"}!</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <AddItemDialog onAdded={() => void inventoryQuery.refetch()} groupId={activeGroup?.id} />
            {user?.role === "admin" && (
              <Button variant="outline" size="icon" onClick={() => navigate("/admin")} className="rounded-full" title="Dashboard Admin">
                <Shield className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => navigate("/inventory")} className="rounded-full" title="Lihat Inventory">
              <ClipboardList className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate("/groups")} className="rounded-full relative" title="Kelola Grup">
              <Users className="h-4 w-4" />
              {pendingInvites.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {pendingInvites.length}
                </span>
              )}
            </Button>
            <button onClick={() => navigate("/profile")} className="focus:outline-none focus:ring-2 focus:ring-ring rounded-full">
              <Avatar className="h-9 w-9 cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto space-y-6 px-4 py-6 pb-32 md:pb-6">
        <GroupSwitcher />

        {groupError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {groupError}
          </div>
        )}

        {isMobile && pendingInvites.length > 0 && (
          <Button
            variant="outline"
            onClick={() => navigate("/groups")}
            className="flex w-full items-center justify-between rounded-2xl border-primary/30 bg-primary/5 py-6"
          >
            <span className="flex items-center gap-2 text-left">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-semibold">Ada {pendingInvites.length} undangan grup menunggu</span>
            </span>
            <span className="text-xs font-bold text-primary">Buka</span>
          </Button>
        )}

        {inventoryQuery.error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Gagal memuat inventory. Silakan coba lagi.
          </div>
        )}

        <ExpiringSoonAlert
          items={items}
          onViewAll={() => navigate("/inventory")}
          notificationSupported={notificationsSupported}
          notificationPermission={notificationPermission}
          onEnableNotifications={() => void enableNotifications()}
        />

        <StatsCards items={items} />
        <MealRecommendationsSection groupId={activeGroup?.id} />
        <ShoppingListSection groupId={activeGroup?.id} />

        <div className="flex flex-col sm:flex-row gap-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)} className="w-full sm:w-auto">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all" className="text-xs font-bold">Semua</TabsTrigger>
              <TabsTrigger value="expired" className="text-xs font-bold">Kadaluarsa</TabsTrigger>
              <TabsTrigger value="expiring-soon" className="text-xs font-bold">Segera Exp</TabsTrigger>
              <TabsTrigger value="safe" className="text-xs font-bold">Aman</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input placeholder="Cari barang..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        </div>

        {inventoryQuery.isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Memuat inventory...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-bold text-muted-foreground">Belum ada barang</p>
            <p className="text-sm text-muted-foreground">Klik "Tambah Barang" untuk mulai mencatat</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((item) => (
              <ItemCard key={item.id} item={item} onDeleted={() => void inventoryQuery.refetch()} groupId={activeGroup?.id} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
