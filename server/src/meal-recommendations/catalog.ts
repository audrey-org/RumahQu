import { ingredientRegistry } from "./ingredients.js";
import { internationalRecipes } from "./recipes-internasional.js";
import { indonesianRecipes } from "./recipes-indonesia.js";
import type { IngredientDefinition, RecipeDefinition } from "./catalog-types.js";

export function normalizeCatalogText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

export const recipeCatalog: RecipeDefinition[] = [...indonesianRecipes, ...internationalRecipes];

export const ingredientsById = new Map<string, IngredientDefinition>(
  ingredientRegistry.map((ingredient) => [ingredient.id, ingredient]),
);

export const ingredientAliasMap = (() => {
  const map = new Map<string, string>();

  for (const ingredient of ingredientRegistry) {
    const aliases = new Set([ingredient.label, ...ingredient.aliases]);

    for (const alias of aliases) {
      const normalized = normalizeCatalogText(alias);
      const existing = map.get(normalized);

      if (existing && existing !== ingredient.id) {
        throw new Error(`Duplicate ingredient alias detected: ${normalized}`);
      }

      map.set(normalized, ingredient.id);
    }
  }

  return map;
})();

function assertCatalogIntegrity() {
  const recipeIds = new Set<string>();

  for (const recipe of recipeCatalog) {
    if (recipeIds.has(recipe.id)) {
      throw new Error(`Duplicate recipe id detected: ${recipe.id}`);
    }

    recipeIds.add(recipe.id);

    if (recipe.requiredIngredients.length === 0) {
      throw new Error(`Recipe must have at least one required ingredient: ${recipe.id}`);
    }

    for (const ingredientId of [...recipe.requiredIngredients, ...recipe.optionalIngredients]) {
      if (!ingredientsById.has(ingredientId)) {
        throw new Error(`Unknown ingredient id "${ingredientId}" in recipe "${recipe.id}"`);
      }
    }
  }
}

assertCatalogIntegrity();

export function getRecipeDefinitionById(recipeId: string) {
  return recipeCatalog.find((recipe) => recipe.id === recipeId) ?? null;
}

export function getRecipeCatalogStats() {
  const indonesiaCount = recipeCatalog.filter((recipe) => recipe.cuisine === "indonesia").length;
  const internationalCount = recipeCatalog.length - indonesiaCount;

  return {
    totalRecipes: recipeCatalog.length,
    indonesiaCount,
    internationalCount,
  };
}
