import type { RecipeCuisine } from "../../../shared/contracts.js";

export interface ShoppingDefaults {
  name: string;
  category: string;
  quantity: number;
  unit: string;
}

export interface IngredientDefinition {
  id: string;
  label: string;
  aliases: string[];
  shoppingDefaults: ShoppingDefaults;
}

export interface RecipeDefinition {
  id: string;
  name: string;
  cuisine: RecipeCuisine;
  summary: string;
  tags: string[];
  requiredIngredients: string[];
  optionalIngredients: string[];
}
