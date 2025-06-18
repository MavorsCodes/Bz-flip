const fs = require("fs");
const path = require("path");

const recipesPath = path.join(__dirname, "InternalNameMappings.json");
var recipes;

async function loadAllItemRecipes(filepath) {
  const data = await fs.promises.readFile(filepath, "utf8");
  return JSON.parse(data);
}


const recipesReady = (async () => {
  try {
    recipes = await loadAllItemRecipes(recipesPath);
    recipesLoaded = true;
  } catch (err) {
    console.error("Failed to load recipes:", err);
  }
})();

function getRecipeIngredients(productId) {
  if (!recipes[productId] || !recipes[productId].recipe) {
    return null;
  }
  const summary = {};
  let recipe = recipes[productId].recipe;
  for (const key in recipe) {
    const value = recipe[key];
    if (!value || value === "") continue;

    if (key === "count") {
      summary.count = parseInt(value, 10);
      continue;
    }

    const [item, qtyStr] = value.split(":");
    const quantity = parseInt(qtyStr, 10);

    if (!summary[item]) {
      summary[item] = 0;
    }

    summary[item] += quantity;
  }

  return summary;
}

function getProductNpcPrice(productId) {
  return recipes[productId]?.npc_buy?.cost[0].split(":")[1];//"oggetto:quantita" => [oggetto,quantita]
}
module.exports = {
  loadAllItemRecipes,
  getRecipeIngredients,
  getProductNpcPrice,
  recipesReady,
  get recipes() { return recipes; }, // <-- add this getter
};