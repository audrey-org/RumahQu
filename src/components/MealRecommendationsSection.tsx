import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChefHat, ArrowRight } from "lucide-react";
import { useMealRecommendations } from "@/hooks/useMealRecommendations";
import type { MealRecommendation, MealRecommendationBucket } from "@/lib/contracts";
import { MealRecommendationCard } from "@/components/MealRecommendationCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  groupId?: string;
}

const previewOrder: MealRecommendationBucket[] = [
  "prioritas-hari-ini",
  "bisa-dimasak",
  "kurang-sedikit",
];

export function MealRecommendationsSection({ groupId }: Props) {
  const navigate = useNavigate();
  const recommendationsQuery = useMealRecommendations(groupId);

  const previewRecommendations = useMemo(() => {
    const all = recommendationsQuery.data?.recommendations ?? [];

    return previewOrder
      .map((bucket) => all.find((recommendation) => recommendation.bucket === bucket))
      .filter((recommendation): recommendation is MealRecommendation => Boolean(recommendation));
  }, [recommendationsQuery.data?.recommendations]);

  return (
    <Card className="border-primary/10 shadow-sm">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <ChefHat className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg font-extrabold">Rekomendasi Masakan</CardTitle>
          </div>
          <CardDescription>
            Ide menu berdasarkan bahan yang tersedia di stok rumah saat ini.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2 rounded-full font-bold"
          disabled={!groupId}
          onClick={() => navigate("/meal-recommendations")}
        >
          Lihat semua
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendationsQuery.error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Gagal memuat rekomendasi menu. Silakan coba lagi.
          </div>
        )}

        {recommendationsQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Menyiapkan rekomendasi menu...</div>
        ) : previewRecommendations.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center">
            <ChefHat className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-bold text-muted-foreground">Belum ada rekomendasi yang cocok</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tambahkan bahan inti seperti telur, ayam, nasi, atau sayur agar sistem bisa mencocokkan resep.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {previewRecommendations.map((recommendation) => (
              <MealRecommendationCard
                key={recommendation.recipeId}
                recommendation={recommendation}
                groupId={groupId}
                compact
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
