const fs = require("fs");
const path = require("path");

const recipesPath = path.join(__dirname, 'InternalNameMappings.json');


let recipes;

async function loadAllItemRecipes(filepath) {
    const data = await fs.promises.readFile(filepath, 'utf8');
    return JSON.parse(data);
}

(async () => {
    try {
        recipes = await loadAllItemRecipes(recipesPath);
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
        if (!value || value == '' || key == 'count') continue;

        const [item, qtyStr] = value.split(':');
        const quantity = parseInt(qtyStr, 10);

        if (!summary[item]) {
            summary[item] = 0;
        }

        summary[item] += quantity;
    }

    return summary;
}
module.exports = {
    loadAllItemRecipes,
    getRecipeIngredients,
    recipes,
};