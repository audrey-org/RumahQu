import type { RecipeDefinition } from "./catalog-types.js";

type RecipeTuple = [string, string, string[], string[], string[]];

function recipe(config: Omit<RecipeDefinition, "cuisine">): RecipeDefinition {
  return {
    ...config,
    cuisine: "internasional",
    tags: [...new Set(config.tags)],
    requiredIngredients: [...new Set(config.requiredIngredients)],
    optionalIngredients: [...new Set(config.optionalIngredients)],
  };
}

const breakfastRecipes = ([
  ["classic-omelette", "Classic Omelette", ["telur"], ["susu", "mentega", "lada"], ["sarapan", "simple"]],
  ["cheese-omelette", "Cheese Omelette", ["telur", "keju"], ["susu", "mentega", "lada"], ["sarapan", "simple"]],
  ["mushroom-omelette", "Mushroom Omelette", ["telur", "jamur"], ["keju", "susu", "lada"], ["sarapan", "simple"]],
  ["tomato-omelette", "Tomato Omelette", ["telur", "tomat"], ["keju", "lada", "mentega"], ["sarapan", "simple"]],
  ["sausage-omelette", "Sausage Omelette", ["telur", "sosis"], ["keju", "lada", "mentega"], ["sarapan", "simple"]],
  ["veggie-scramble", "Veggie Scrambled Eggs", ["telur", "tomat"], ["sawi", "mentega", "lada"], ["sarapan", "simple"]],
  ["egg-toast", "Egg Toast", ["roti", "telur"], ["mentega", "keju", "lada"], ["sarapan", "simple"]],
  ["cheese-toast", "Cheese Toast", ["roti", "keju"], ["mentega", "tomat"], ["sarapan", "simple"]],
  ["french-toast", "French Toast", ["roti", "telur", "susu"], ["gula", "mentega"], ["sarapan", "simple"]],
  ["breakfast-sandwich", "Breakfast Sandwich", ["roti", "telur", "keju"], ["tomat", "selada", "mentega"], ["sarapan", "simple"]],
] satisfies RecipeTuple[]).map(([slug, name, requiredIngredients, optionalIngredients, tags]) =>
  recipe({
    id: `intl-breakfast-${slug}`,
    name,
    summary: `${name} adalah menu sarapan cepat dengan bahan dasar yang umum di dapur rumah.`,
    tags: tags as string[],
    requiredIngredients: requiredIngredients as string[],
    optionalIngredients: optionalIngredients as string[],
  }),
);

const pancakeRecipes = ([
  ["classic", "Classic Pancake", ["tepung", "telur", "susu"], ["gula", "mentega"], ["sarapan", "cemilan", "simple"]],
  ["banana", "Banana Pancake", ["tepung", "telur", "pisang"], ["susu", "gula", "mentega"], ["sarapan", "cemilan"]],
  ["apple", "Apple Pancake", ["tepung", "telur", "apel"], ["susu", "gula", "mentega"], ["sarapan", "cemilan"]],
  ["chocolate-banana", "Chocolate Banana Pancake", ["tepung", "telur", "pisang"], ["selai_cokelat", "susu", "mentega"], ["cemilan", "simple"]],
  ["savory-cheese", "Savory Cheese Pancake", ["tepung", "telur", "keju"], ["susu", "mentega", "lada"], ["sarapan", "simple"]],
  ["corn-fritter-style", "Corn Pancake", ["tepung", "jagung", "telur"], ["daun_bawang", "lada", "mentega"], ["cemilan", "simple"]],
  ["milk-pancake", "Milk Pancake", ["tepung", "susu", "telur"], ["gula", "mentega"], ["sarapan", "simple"]],
  ["banana-oat", "Banana Oat Pancake", ["pisang", "oat", "telur"], ["susu", "gula"], ["sarapan", "simple"]],
  ["apple-oat", "Apple Oat Pancake", ["apel", "oat", "telur"], ["susu", "gula"], ["sarapan", "simple"]],
  ["toast-roll-up", "Sweet Toast Roll", ["roti", "pisang", "telur"], ["selai_cokelat", "mentega"], ["cemilan", "simple"]],
] satisfies RecipeTuple[]).map(([slug, name, requiredIngredients, optionalIngredients, tags]) =>
  recipe({
    id: `intl-pancake-${slug}`,
    name,
    summary: `${name} cocok untuk sarapan manis atau camilan akhir pekan.`,
    tags: tags as string[],
    requiredIngredients: requiredIngredients as string[],
    optionalIngredients: optionalIngredients as string[],
  }),
);

const pastaRecipes = ([
  ["aglio-olio", "Spaghetti Aglio e Olio", ["spaghetti", "bawang_putih"], ["cabai", "minyak", "keju"], ["makan-malam", "simple"]],
  ["tomato", "Spaghetti Tomato", ["spaghetti", "saus_tomat"], ["bawang_putih", "tomat", "keju"], ["makan-malam", "simple"]],
  ["bolognese", "Spaghetti Bolognese", ["spaghetti", "sapi", "saus_tomat"], ["bawang_putih", "tomat", "keju"], ["makan-malam"]],
  ["chicken-tomato", "Spaghetti Chicken Tomato", ["spaghetti", "ayam", "saus_tomat"], ["bawang_putih", "keju", "lada"], ["makan-malam"]],
  ["tuna-pasta", "Spaghetti Tuna", ["spaghetti", "tuna_kaleng", "saus_tomat"], ["bawang_putih", "cabai", "keju"], ["makan-malam", "simple"]],
  ["sausage-pasta", "Spaghetti Sausage", ["spaghetti", "sosis", "saus_tomat"], ["bawang_putih", "keju", "lada"], ["makan-malam"]],
  ["creamy-mushroom", "Creamy Mushroom Pasta", ["spaghetti", "jamur", "susu"], ["keju", "mentega", "lada"], ["makan-malam"]],
  ["mac-cheese", "Mac and Cheese", ["makaroni", "keju", "susu"], ["mentega", "lada"], ["makan-malam", "simple"]],
  ["mac-sausage", "Macaroni Sausage", ["makaroni", "sosis", "keju"], ["susu", "mentega", "lada"], ["makan-malam", "simple"]],
  ["mac-tuna", "Macaroni Tuna", ["makaroni", "tuna_kaleng", "saus_tomat"], ["keju", "bawang_putih", "lada"], ["makan-malam", "simple"]],
] satisfies RecipeTuple[]).map(([slug, name, requiredIngredients, optionalIngredients, tags]) =>
  recipe({
    id: `intl-pasta-${slug}`,
    name,
    summary: `${name} menghadirkan menu pasta simple yang cocok untuk stok pantry.`,
    tags: tags as string[],
    requiredIngredients: requiredIngredients as string[],
    optionalIngredients: optionalIngredients as string[],
  }),
);

const sandwichRecipes = ([
  ["tuna-sandwich", "Tuna Sandwich", ["roti", "tuna_kaleng", "mayones"], ["selada", "tomat"], ["sarapan", "simple"]],
  ["egg-sandwich", "Egg Sandwich", ["roti", "telur", "mayones"], ["selada", "tomat"], ["sarapan", "simple"]],
  ["chicken-sandwich", "Chicken Sandwich", ["roti", "ayam"], ["mayones", "selada", "tomat"], ["sarapan", "simple"]],
  ["sausage-sandwich", "Sausage Sandwich", ["roti", "sosis"], ["saus_tomat", "keju", "selada"], ["sarapan", "simple"]],
  ["grilled-cheese", "Grilled Cheese Sandwich", ["roti", "keju"], ["mentega", "tomat"], ["sarapan", "simple"]],
  ["chicken-wrap", "Chicken Wrap", ["tortilla", "ayam"], ["selada", "tomat", "mayones"], ["makan-siang", "simple"]],
  ["tuna-wrap", "Tuna Wrap", ["tortilla", "tuna_kaleng"], ["selada", "tomat", "mayones"], ["makan-siang", "simple"]],
  ["egg-wrap", "Egg Wrap", ["tortilla", "telur"], ["keju", "tomat", "selada"], ["sarapan", "simple"]],
  ["veggie-wrap", "Veggie Wrap", ["tortilla", "selada", "tomat"], ["keju", "mayones", "timun"], ["makan-siang", "simple"]],
  ["cheese-quesadilla-style", "Cheese Quesadilla Style", ["tortilla", "keju"], ["ayam", "tomat", "saus_cabai"], ["makan-siang", "simple"]],
] satisfies RecipeTuple[]).map(([slug, name, requiredIngredients, optionalIngredients, tags]) =>
  recipe({
    id: `intl-sandwich-${slug}`,
    name,
    summary: `${name} memberi opsi makan cepat untuk stok roti atau tortilla.`,
    tags: tags as string[],
    requiredIngredients: requiredIngredients as string[],
    optionalIngredients: optionalIngredients as string[],
  }),
);

const simpleMains = ([
  ["fried-chicken", "Fried Chicken", ["ayam", "tepung"], ["lada", "bawang_putih", "minyak"], ["makan-siang", "goreng"]],
  ["garlic-butter-chicken", "Garlic Butter Chicken", ["ayam", "mentega", "bawang_putih"], ["lada", "tomat"], ["makan-malam", "simple"]],
  ["chicken-rice-bowl", "Chicken Rice Bowl", ["ayam", "nasi"], ["saus_tiram", "daun_bawang", "tomat"], ["makan-siang", "simple"]],
  ["beef-rice-bowl", "Beef Rice Bowl", ["sapi", "nasi"], ["kecap_asin", "daun_bawang", "lada"], ["makan-malam", "simple"]],
  ["sausage-rice-bowl", "Sausage Rice Bowl", ["sosis", "nasi"], ["telur", "saus_tomat", "daun_bawang"], ["makan-siang", "simple"]],
  ["fried-rice-style", "Simple Fried Rice", ["nasi", "telur"], ["bawang_putih", "kecap_asin", "daun_bawang"], ["makan-siang", "goreng", "simple"]],
  ["garlic-noodle", "Garlic Noodle", ["mi", "bawang_putih"], ["mentega", "lada", "daun_bawang"], ["makan-malam", "simple"]],
  ["butter-shrimp", "Butter Shrimp", ["udang", "mentega"], ["bawang_putih", "lada", "jeruk_nipis"], ["makan-malam"]],
  ["mashed-potato-style", "Buttery Potato Mash", ["kentang", "mentega"], ["susu", "lada", "keju"], ["makan-siang", "simple"]],
  ["potato-cheese-bake-style", "Potato Cheese Skillet", ["kentang", "keju"], ["susu", "mentega", "lada"], ["makan-siang", "simple"]],
] satisfies RecipeTuple[]).map(([slug, name, requiredIngredients, optionalIngredients, tags]) =>
  recipe({
    id: `intl-main-${slug}`,
    name,
    summary: `${name} adalah menu utama simple ala internasional untuk masak cepat di rumah.`,
    tags: tags as string[],
    requiredIngredients: requiredIngredients as string[],
    optionalIngredients: optionalIngredients as string[],
  }),
);

const saladAndSoupRecipes = ([
  ["chicken-soup", "Chicken Soup", ["ayam", "kaldu", "wortel"], ["kentang", "seledri", "lada"], ["makan-siang", "kuah"]],
  ["mushroom-soup", "Mushroom Soup", ["jamur", "susu"], ["mentega", "lada", "bawang_putih"], ["makan-malam", "kuah"]],
  ["corn-soup", "Corn Soup", ["jagung", "susu"], ["mentega", "lada", "kaldu"], ["makan-siang", "kuah", "simple"]],
  ["potato-soup", "Potato Soup", ["kentang", "susu"], ["mentega", "lada", "kaldu"], ["makan-siang", "kuah", "simple"]],
  ["veggie-soup", "Simple Veggie Soup", ["wortel", "kol", "kaldu"], ["kentang", "seledri", "lada"], ["makan-siang", "kuah", "simple"]],
  ["garden-salad", "Garden Salad", ["selada", "tomat", "timun"], ["mayones", "keju"], ["makan-siang", "simple"]],
  ["tuna-salad", "Tuna Salad", ["tuna_kaleng", "selada"], ["tomat", "timun", "mayones"], ["makan-siang", "simple"]],
  ["egg-salad", "Egg Salad", ["telur", "selada"], ["tomat", "mayones", "timun"], ["makan-siang", "simple"]],
  ["chicken-salad", "Chicken Salad", ["ayam", "selada"], ["tomat", "timun", "mayones"], ["makan-siang", "simple"]],
  ["potato-salad", "Potato Salad", ["kentang", "mayones"], ["telur", "timun", "lada"], ["makan-siang", "simple"]],
] satisfies RecipeTuple[]).map(([slug, name, requiredIngredients, optionalIngredients, tags]) =>
  recipe({
    id: `intl-salad-${slug}`,
    name,
    summary: `${name} memberi pilihan sup atau salad simple yang ringan namun tetap bergizi.`,
    tags: tags as string[],
    requiredIngredients: requiredIngredients as string[],
    optionalIngredients: optionalIngredients as string[],
  }),
);

export const internationalRecipes: RecipeDefinition[] = [
  ...breakfastRecipes,
  ...pancakeRecipes,
  ...pastaRecipes,
  ...sandwichRecipes,
  ...simpleMains,
  ...saladAndSoupRecipes,
];
