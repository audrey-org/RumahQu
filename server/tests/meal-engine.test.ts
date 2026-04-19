// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { InventoryItem } from "../../shared/contracts.js";
import { buildMealRecommendations, getMissingRequiredIngredientsForRecipe } from "../src/meal-recommendations/engine.js";

function isoDateFromToday(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function inventoryItem(overrides: Partial<InventoryItem> & Pick<InventoryItem, "name">): InventoryItem {
  return {
    id: crypto.randomUUID(),
    groupId: "group-1",
    addedBy: "user-1",
    addedByName: "Alice",
    name: overrides.name,
    category: overrides.category ?? "Makanan",
    quantity: overrides.quantity ?? 1,
    unit: overrides.unit ?? "pcs",
    lowStockThreshold: overrides.lowStockThreshold ?? null,
    restockTargetQuantity: overrides.restockTargetQuantity ?? null,
    expirationDate: overrides.expirationDate ?? isoDateFromToday(30),
    notes: overrides.notes ?? null,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  };
}

describe("meal recommendation engine", () => {
  it("matches aliases and promotes recipes with expiring ingredients", () => {
    const recommendations = buildMealRecommendations([
      inventoryItem({ name: "rice", unit: "kg" }),
      inventoryItem({ name: "telor", expirationDate: isoDateFromToday(2) }),
      inventoryItem({ name: "sweet soy sauce", category: "Bumbu Dapur", unit: "botol" }),
    ]);

    const recipe = recommendations.find((recommendation) => recommendation.recipeId === "indo-nasi-goreng-telur");

    expect(recipe).toBeTruthy();
    expect(recipe?.bucket).toBe("prioritas-hari-ini");
    expect(recipe?.expiringSoonCount).toBeGreaterThan(0);
    expect(recipe?.nearestExpiryInDays).toBe(2);
    expect(recipe?.urgencyReason).toContain("Telur Ayam");
  });

  it("ignores expired inventory items", () => {
    const recommendations = buildMealRecommendations([
      inventoryItem({ name: "beras", unit: "kg" }),
      inventoryItem({ name: "telur ayam", expirationDate: isoDateFromToday(-1) }),
      inventoryItem({ name: "kecap manis", category: "Bumbu Dapur", unit: "botol" }),
    ]);

    const recipe = recommendations.find((recommendation) => recommendation.recipeId === "indo-nasi-goreng-telur");

    expect(recipe).toBeTruthy();
    expect(recipe?.bucket).toBe("kurang-sedikit");
    expect(recipe?.missingIngredients.map((ingredient) => ingredient.ingredientId)).toContain("telur");
  });

  it("does not return recipes when more than one required ingredient is missing", () => {
    const recommendations = buildMealRecommendations([
      inventoryItem({ name: "beras", unit: "kg" }),
    ]);

    expect(recommendations.some((recommendation) => recommendation.recipeId === "indo-nasi-goreng-telur")).toBe(false);
  });

  it("returns missing required ingredient definitions for shopping list generation", () => {
    const missingIngredients = getMissingRequiredIngredientsForRecipe("indo-nasi-goreng-telur", [
      inventoryItem({ name: "beras", unit: "kg" }),
      inventoryItem({ name: "telur ayam" }),
    ]);

    expect(missingIngredients?.map((ingredient) => ingredient.id)).toEqual(["kecap_manis"]);
  });

  it("sorts expiring recommendations by the nearest expiry first", () => {
    const recommendations = buildMealRecommendations([
      inventoryItem({ name: "beras", unit: "kg" }),
      inventoryItem({ name: "telur ayam", expirationDate: isoDateFromToday(1) }),
      inventoryItem({ name: "kecap manis", category: "Bumbu Dapur", unit: "botol" }),
      inventoryItem({ name: "roti tawar", category: "Makanan", unit: "bungkus", expirationDate: isoDateFromToday(3) }),
    ]);

    const firstTwo = recommendations.slice(0, 2).map((recommendation) => recommendation.nearestExpiryInDays);
    expect(firstTwo[0]).toBeLessThanOrEqual(firstTwo[1] ?? Number.POSITIVE_INFINITY);
  });
});
