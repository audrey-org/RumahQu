import type {
  MealRecommendation,
  MealRecommendationBucket,
  RecommendationIngredientMatch,
  InventoryItem,
} from "../../../shared/contracts.js";
import { ingredientAliasMap, ingredientsById, normalizeCatalogText, recipeCatalog, getRecipeDefinitionById } from "./catalog.js";
import type { IngredientDefinition, RecipeDefinition } from "./catalog-types.js";

const EXPIRING_SOON_THRESHOLD_DAYS = 7;

type IngredientAvailability = {
  ingredientId: string;
  definition: IngredientDefinition;
  matchedItemNames: string[];
  isAvailable: boolean;
  isExpiringSoon: boolean;
  soonestExpiryDays: number | null;
};

type InventoryIngredientMatch = {
  itemNames: string[];
  hasExpiringSoonItem: boolean;
  nearestExpiryInDays: number | null;
};

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getExpiryStatus(expirationDate: string) {
  const diffInDays = getDaysUntilExpiry(expirationDate);

  if (diffInDays < 0) return "expired";
  if (diffInDays <= EXPIRING_SOON_THRESHOLD_DAYS) return "expiring-soon";
  return "safe";
}

function getDaysUntilExpiry(expirationDate: string) {
  const expiration = getStartOfDay(new Date(expirationDate));
  const today = getStartOfDay(new Date());
  return Math.floor((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function buildIngredientMatchMap(items: InventoryItem[]) {
  const ingredientMatches = new Map<string, InventoryIngredientMatch>();

  for (const item of items) {
    if (item.quantity <= 0 || getExpiryStatus(item.expirationDate) === "expired") {
      continue;
    }

    const ingredientId = ingredientAliasMap.get(normalizeCatalogText(item.name));

    if (!ingredientId) {
      continue;
    }

    const current = ingredientMatches.get(ingredientId) ?? {
      itemNames: [],
      hasExpiringSoonItem: false,
      nearestExpiryInDays: null,
    };

    const daysUntilExpiry = getDaysUntilExpiry(item.expirationDate);
    current.itemNames.push(item.name);
    current.hasExpiringSoonItem ||= getExpiryStatus(item.expirationDate) === "expiring-soon";
    current.nearestExpiryInDays =
      current.nearestExpiryInDays === null
        ? daysUntilExpiry
        : Math.min(current.nearestExpiryInDays, daysUntilExpiry);
    ingredientMatches.set(ingredientId, current);
  }

  return ingredientMatches;
}

function getIngredientAvailability(
  ingredientId: string,
  matches: Map<string, InventoryIngredientMatch>,
): IngredientAvailability {
  const definition = ingredientsById.get(ingredientId);

  if (!definition) {
    throw new Error(`Ingredient ${ingredientId} is missing from registry`);
  }

  const match = matches.get(ingredientId);

  return {
    ingredientId,
    definition,
    matchedItemNames: match?.itemNames ?? [],
    isAvailable: Boolean(match),
    isExpiringSoon: match?.hasExpiringSoonItem ?? false,
    soonestExpiryDays: match?.nearestExpiryInDays ?? null,
  };
}

function toRecommendationIngredientMatch(
  availability: IngredientAvailability,
  isRequired: boolean,
): RecommendationIngredientMatch {
  return {
    ingredientId: availability.ingredientId,
    label: availability.definition.label,
    matchedItemNames: availability.matchedItemNames,
    isRequired,
    isAvailable: availability.isAvailable,
    isExpiringSoon: availability.isExpiringSoon,
    soonestExpiryDays: availability.soonestExpiryDays,
  };
}

function compareRecommendations(a: MealRecommendation, b: MealRecommendation) {
  const bucketOrder: Record<MealRecommendationBucket, number> = {
    "prioritas-hari-ini": 0,
    "bisa-dimasak": 1,
    "kurang-sedikit": 2,
  };

  return (
    bucketOrder[a.bucket] - bucketOrder[b.bucket]
    || (a.nearestExpiryInDays ?? Number.POSITIVE_INFINITY) - (b.nearestExpiryInDays ?? Number.POSITIVE_INFINITY)
    || b.expiringSoonCount - a.expiringSoonCount
    || b.matchedOptionalCount - a.matchedOptionalCount
    || a.name.localeCompare(b.name, "id")
  );
}

function isMealRecommendation(
  recommendation: MealRecommendation | null,
): recommendation is MealRecommendation {
  return recommendation !== null;
}

function formatExpiryCountdown(days: number) {
  if (days <= 0) {
    return "hari ini";
  }

  if (days === 1) {
    return "1 hari lagi";
  }

  return `${days} hari lagi`;
}

function buildUrgencyReason(
  bucket: MealRecommendationBucket,
  availableRequired: IngredientAvailability[],
  matchedOptional: IngredientAvailability[],
  missingRequired: IngredientAvailability[],
) {
  const expiringSoonIngredients = [...availableRequired, ...matchedOptional]
    .filter((ingredient) => ingredient.isExpiringSoon && ingredient.soonestExpiryDays !== null)
    .sort((a, b) => (a.soonestExpiryDays ?? Number.POSITIVE_INFINITY) - (b.soonestExpiryDays ?? Number.POSITIVE_INFINITY));

  if (expiringSoonIngredients.length > 0) {
    const firstIngredient = expiringSoonIngredients[0];
    const extraCount = expiringSoonIngredients.length - 1;
    const extraText = extraCount > 0 ? ` dan ${extraCount} bahan lain` : "";
    return `Pakai ${firstIngredient.definition.label} yang expired ${formatExpiryCountdown(firstIngredient.soonestExpiryDays ?? 0)}${extraText}.`;
  }

  if (bucket === "kurang-sedikit" && missingRequired.length > 0) {
    return `Tinggal tambah ${missingRequired[0].definition.label} untuk melengkapi bahan utama.`;
  }

  return "Semua bahan utama sudah tersedia dan siap dimasak.";
}

function evaluateRecipe(recipe: RecipeDefinition, matches: Map<string, InventoryIngredientMatch>) {
  const requiredAvailability = recipe.requiredIngredients.map((ingredientId) =>
    getIngredientAvailability(ingredientId, matches),
  );
  const optionalAvailability = recipe.optionalIngredients.map((ingredientId) =>
    getIngredientAvailability(ingredientId, matches),
  );

  const availableRequired = requiredAvailability.filter((ingredient) => ingredient.isAvailable);
  const missingRequired = requiredAvailability.filter((ingredient) => !ingredient.isAvailable);
  const matchedOptional = optionalAvailability.filter((ingredient) => ingredient.isAvailable);
  const expiringSoonCount = [...availableRequired, ...matchedOptional].filter(
    (ingredient) => ingredient.isExpiringSoon,
  ).length;
  const nearestExpiryInDays = [...availableRequired, ...matchedOptional]
    .map((ingredient) => ingredient.soonestExpiryDays)
    .filter((days): days is number => days !== null)
    .reduce<number | null>((nearest, days) => (nearest === null ? days : Math.min(nearest, days)), null);

  let bucket: MealRecommendationBucket | null = null;

  if (missingRequired.length === 0) {
    bucket = expiringSoonCount > 0 ? "prioritas-hari-ini" : "bisa-dimasak";
  } else if (missingRequired.length === 1) {
    bucket = "kurang-sedikit";
  }

  const recommendation: MealRecommendation | null = bucket
    ? {
      recipeId: recipe.id,
      name: recipe.name,
      cuisine: recipe.cuisine,
      summary: recipe.summary,
      tags: recipe.tags,
      bucket,
      requiredCount: recipe.requiredIngredients.length,
      availableRequiredCount: availableRequired.length,
      matchedOptionalCount: matchedOptional.length,
      expiringSoonCount,
      nearestExpiryInDays,
      urgencyReason: buildUrgencyReason(bucket, availableRequired, matchedOptional, missingRequired),
      availableIngredients: availableRequired.map((ingredient) => toRecommendationIngredientMatch(ingredient, true)),
      missingIngredients: missingRequired.map((ingredient) => toRecommendationIngredientMatch(ingredient, true)),
      optionalMatches: matchedOptional.map((ingredient) => toRecommendationIngredientMatch(ingredient, false)),
    } satisfies MealRecommendation
    : null;

  return {
    recipe,
    recommendation,
    availableRequired,
    missingRequired,
  };
}

export function buildMealRecommendations(items: InventoryItem[]) {
  const ingredientMatchMap = buildIngredientMatchMap(items);

  return recipeCatalog
    .map((recipe) => evaluateRecipe(recipe, ingredientMatchMap).recommendation)
    .filter(isMealRecommendation)
    .sort(compareRecommendations);
}

export function getMissingRequiredIngredientsForRecipe(recipeId: string, items: InventoryItem[]) {
  const recipe = getRecipeDefinitionById(recipeId);

  if (!recipe) {
    return null;
  }

  const evaluation = evaluateRecipe(recipe, buildIngredientMatchMap(items));
  return evaluation.missingRequired.map((ingredient) => ingredient.definition);
}
