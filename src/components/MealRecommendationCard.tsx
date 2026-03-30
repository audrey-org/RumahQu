import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChefHat, Flame, ShoppingCart } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { MealRecommendation } from "@/lib/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Props {
  recommendation: MealRecommendation;
  groupId?: string;
  compact?: boolean;
  showAction?: boolean;
}

const bucketConfig = {
  "prioritas-hari-ini": {
    label: "Prioritas hari ini",
    badgeClass: "border-0 bg-expiring-soon text-warning-foreground",
  },
  "bisa-dimasak": {
    label: "Bisa dimasak",
    badgeClass: "border-0 bg-safe text-success-foreground",
  },
  "kurang-sedikit": {
    label: "Kurang 1 bahan",
    badgeClass: "border-0 bg-primary text-primary-foreground",
  },
} as const;

const cuisineLabel = {
  indonesia: "Indonesia",
  internasional: "Internasional",
} as const;

export function MealRecommendationCard({
  recommendation,
  groupId,
  compact = false,
  showAction = true,
}: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const bucket = bucketConfig[recommendation.bucket];

  const addMissingMutation = useMutation({
    mutationFn: () => api.addMissingIngredientsToShoppingList(recommendation.recipeId, groupId!),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList(groupId!) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.mealRecommendations(groupId!) }),
      ]);

      if (result.addedItems.length > 0) {
        toast({
          title: "Bahan ditambahkan",
          description: `${result.addedItems.length} bahan masuk ke daftar belanja.`,
        });
        return;
      }

      toast({
        title: "Tidak ada bahan baru",
        description: "Bahan yang kurang sudah ada di daftar belanja aktif.",
      });
    },
    onError: (error) => {
      toast({ title: "Gagal", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const canAddMissing = recommendation.bucket === "kurang-sedikit" && Boolean(groupId) && showAction;
  const availableLabels = recommendation.availableIngredients.map((ingredient) => ingredient.label);
  const missingLabels = recommendation.missingIngredients.map((ingredient) => ingredient.label);
  const optionalLabels = recommendation.optionalMatches.map((ingredient) => ingredient.label);

  return (
    <Card className="border-primary/10 shadow-sm">
      <CardHeader className={compact ? "space-y-3" : "space-y-4"}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <ChefHat className="h-4 w-4" />
              </div>
              <CardTitle className={compact ? "text-base font-extrabold" : "text-lg font-extrabold"}>
                {recommendation.name}
              </CardTitle>
            </div>
            <CardDescription>{recommendation.summary}</CardDescription>
            {recommendation.urgencyReason && (
              <p className="text-sm font-medium text-foreground/80">{recommendation.urgencyReason}</p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge className={bucket.badgeClass}>{bucket.label}</Badge>
            <Badge variant="outline">{cuisineLabel[recommendation.cuisine]}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="font-bold">
            {recommendation.availableRequiredCount}/{recommendation.requiredCount} bahan utama
          </Badge>
          {recommendation.nearestExpiryInDays !== null && (
            <Badge variant="outline" className="font-bold">
              Exp terdekat {recommendation.nearestExpiryInDays === 0 ? "hari ini" : `${recommendation.nearestExpiryInDays} hari`}
            </Badge>
          )}
          {recommendation.expiringSoonCount > 0 && (
            <Badge className="border-0 bg-expiring-soon text-warning-foreground">
              <Flame className="mr-1 h-3 w-3" />
              {recommendation.expiringSoonCount} bahan segera exp
            </Badge>
          )}
          {recommendation.tags.slice(0, compact ? 2 : 4).map((tag) => (
            <Badge key={tag} variant="outline" className="capitalize">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tersedia</p>
            <p className="mt-2 text-sm font-medium">
              {availableLabels.length > 0 ? availableLabels.join(", ") : "Belum ada bahan utama yang cocok"}
            </p>
          </div>
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Kurang</p>
            <p className="mt-2 text-sm font-medium">
              {missingLabels.length > 0 ? missingLabels.join(", ") : "Semua bahan utama sudah ada"}
            </p>
          </div>
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tambahan cocok</p>
            <p className="mt-2 text-sm font-medium">
              {optionalLabels.length > 0 ? optionalLabels.join(", ") : "Tidak ada bahan tambahan yang terdeteksi"}
            </p>
          </div>
        </div>

        {canAddMissing && (
          <Button
            type="button"
            className="w-full gap-2 font-bold"
            disabled={addMissingMutation.isPending}
            onClick={() => addMissingMutation.mutate()}
          >
            <ShoppingCart className="h-4 w-4" />
            Tambah bahan kurang ke belanja
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
