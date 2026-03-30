// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ingredientRegistry } from "../src/meal-recommendations/ingredients.js";
import { getRecipeCatalogStats, ingredientsById, normalizeCatalogText, recipeCatalog } from "../src/meal-recommendations/catalog.js";

describe("meal recommendation catalog", () => {
  it("ships with at least 200 recipes and the expected cuisine mix", () => {
    const stats = getRecipeCatalogStats();

    expect(stats.totalRecipes).toBeGreaterThanOrEqual(200);
    expect(stats.indonesiaCount).toBeGreaterThanOrEqual(140);
    expect(stats.internationalCount).toBeGreaterThanOrEqual(60);
  });

  it("keeps recipe ids unique and ingredient references valid", () => {
    const recipeIds = new Set<string>();

    for (const recipe of recipeCatalog) {
      expect(recipe.requiredIngredients.length).toBeGreaterThan(0);
      expect(recipeIds.has(recipe.id)).toBe(false);
      recipeIds.add(recipe.id);

      for (const ingredientId of [...recipe.requiredIngredients, ...recipe.optionalIngredients]) {
        expect(ingredientsById.has(ingredientId)).toBe(true);
      }
    }
  });

  it("keeps ingredient aliases unique after normalization", () => {
    const aliases = new Map<string, string>();

    for (const ingredient of ingredientRegistry) {
      for (const alias of new Set([ingredient.label, ...ingredient.aliases])) {
        const normalized = normalizeCatalogText(alias);
        const existingIngredientId = aliases.get(normalized);

        if (existingIngredientId) {
          expect(existingIngredientId).toBe(ingredient.id);
          continue;
        }

        aliases.set(normalized, ingredient.id);
      }
    }
  });
});
