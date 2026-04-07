import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChefHat } from "lucide-react";
import { useGroup } from "@/contexts/GroupContext";
import { useMealRecommendations } from "@/hooks/useMealRecommendations";
import type { MealRecommendationBucket } from "@/lib/contracts";
import { MealRecommendationCard } from "@/components/MealRecommendationCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/usePageMeta";

const bucketSections: Array<{
  bucket: MealRecommendationBucket;
  title: string;
  description: string;
}> = [
  {
    bucket: "prioritas-hari-ini",
    title: "Prioritas Hari Ini",
    description: "Masak ini dulu supaya bahan yang segera kedaluwarsa bisa segera dipakai.",
  },
  {
    bucket: "bisa-dimasak",
    title: "Bisa Dimasak Sekarang",
    description: "Semua bahan utama sudah tersedia di stok.",
  },
  {
    bucket: "kurang-sedikit",
    title: "Kurang Sedikit Bahan",
    description: "Tinggal satu bahan utama lagi dan bisa langsung masuk daftar belanja.",
  },
];

const MealRecommendations = () => {
  const navigate = useNavigate();
  const { activeGroup } = useGroup();
  const recommendationsQuery = useMealRecommendations(activeGroup?.id);

  usePageMeta({
    title: "Rekomendasi Masakan",
    description: "Lihat ide menu berdasarkan stok bahan yang tersedia di inventory RumahQu.",
    noIndex: true,
    canonicalPath: "/meal-recommendations",
  });

  const groupedRecommendations = useMemo(() => {
    const recommendations = recommendationsQuery.data?.recommendations ?? [];

    return Object.fromEntries(
      bucketSections.map((section) => [
        section.bucket,
        recommendations.filter((recommendation) => recommendation.bucket === section.bucket),
      ]),
    ) as Record<MealRecommendationBucket, typeof recommendations>;
  }, [recommendationsQuery.data?.recommendations]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold">Rekomendasi Masakan</h1>
                {activeGroup && (
                  <Badge variant="outline" className="text-xs">
                    {activeGroup.name}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {recommendationsQuery.data?.recommendations.length ?? 0} rekomendasi dari{" "}
                {recommendationsQuery.data?.totalCatalogRecipes ?? 0} resep internal
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl space-y-6 px-4 py-6 pb-32 md:pb-6">
        {recommendationsQuery.error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Gagal memuat rekomendasi masakan. Silakan coba lagi.
          </div>
        )}

        {recommendationsQuery.isLoading ? (
          <div className="py-16 text-center text-muted-foreground">Menyiapkan daftar rekomendasi...</div>
        ) : recommendationsQuery.data?.recommendations.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-14 text-center">
            <ChefHat className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-bold text-muted-foreground">Belum ada rekomendasi yang cocok</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Coba tambahkan bahan pokok dan lauk utama ke inventory agar lebih banyak resep bisa terdeteksi.
            </p>
          </div>
        ) : (
          bucketSections.map((section) => {
            const items = groupedRecommendations[section.bucket];

            return (
              <section key={section.bucket} className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-extrabold">{section.title}</h2>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                    Belum ada menu pada kategori ini.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {items.map((recommendation) => (
                      <MealRecommendationCard
                        key={recommendation.recipeId}
                        recommendation={recommendation}
                        groupId={activeGroup?.id}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </main>
    </div>
  );
};

export default MealRecommendations;
