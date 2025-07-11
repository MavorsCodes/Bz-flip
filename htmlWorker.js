const { parentPort } = require("worker_threads");
const crafting = require("./crafting.js");
const path = require("path");
const fs = require("fs");

parentPort.on(
  "message",
  async ({ allBzProductData, requestType, queryParams, tax }) => {
    await crafting.recipesReady;
    let response;
    switch (requestType) {
      case "crafting":
        response = getAllCraftingItemDivs(allBzProductData, tax);
        parentPort.postMessage(response);
        break;

      case "home":
        response = await getHomepage(allBzProductData, tax);
        parentPort.postMessage(response);
        break;

      case "flipping":
        try {
          response = HTMLSearchedPage(
            {
              address: "BAZAAR",
              product: "",
              treshholdsells: 0,
              treshholdbuys: 0,
              min_coins_per_hour: 0,
              maxbuyRange: Infinity,
              show_only_profit: "true", //TODO WTF IS THIS OMG CHANGE THIS SO IT TAKES A BOOLEAN AND NOT A STRING
              sortby: "coinsPerHour",
            },
            allBzProductData
          );
        } catch (error) {
          console.error("Error in caching Home Page", error);
          response = "<h1>Error generating flipping page</h1>";
        }
        parentPort.postMessage(response);
        break;

      case "forging":
        response = getHtmlForgingPage(allBzProductData, tax);
        parentPort.postMessage(response);
        break;

      case "searching":
        try {
          response = HTMLSearchedPage(queryParams, allBzProductData);
        } catch (error) {
          console.error("Error in caching Home Page", error);
          response = "<h1>Error generating flipping page</h1>";
        }
        parentPort.postMessage(response);
        break;
      case "updating":
        try {
          response = updateVisibleProducts(queryParams, allBzProductData);
        } catch (error) {
          console.error("Error in caching Home Page", error);
          response = "<h1>Error generating flipping page</h1>";
        }
        parentPort.postMessage(response);
        break;
      case "favorites":
        try {
          response = HTMLFavorites(queryParams, allBzProductData);
        } catch (error) {
          console.error("Error in caching Home Page", error);
          response = "<h1>Error generating flipping page</h1>";
        }
        parentPort.postMessage(response);
        break;
      default:
        parentPort.postMessage("<h1>Unknown request type</h1>");
        break;
    }
  }
);

function getCraftingItemDiv(productID, product, computedStats) {
  return `<div id="${
    product.name
  }" class="output" onclick="window.location.href='/product/${encodeURIComponent(
    product.name
  )}'">
    ${returnCraftingProductHtml(product, computedStats)}
  </div>`;
}

function getProductCraftingCost(recipe, allBzProductData, tax) {
  if (!recipe) return null;

  let bazaarCostSubtotal = 0;
  let npcCostSubtotal = 0;
  let hasValidIngredient = false;

  for (const ingredient in recipe) {
    if (ingredient === "count") continue;

    const quantity = recipe[ingredient];
    if (!quantity || isNaN(quantity)) return null;

    // Try Bazaar data first
    const product = allBzProductData[ingredient];
    if (product && !isNaN(product.sell_price) && product.sell_price > 0) {
      bazaarCostSubtotal += product.sell_price * quantity;
      hasValidIngredient = true;
      continue;
    }

    // Then fallback to NPC price
    const npcCost = crafting.getProductNpcPrice(ingredient);
    if (npcCost) {
      if (!isNaN(npcCost)) {
        npcCostSubtotal += npcCost * quantity;
        hasValidIngredient = true;
        continue;
      }
    }

    return null;
  }

  if (!hasValidIngredient) return null;

  // Apply tax only on Bazaar subtotal
  const totalCost =
    bazaarCostSubtotal * (1 + (typeof tax === "number" ? tax : 0)) +
    npcCostSubtotal;
  return totalCost;
}

function getCraftingProductVolume(recipe, allBzProductData) {
  let minVolume = Infinity;
  let hasBazaarIngredient = false;

  if (!recipe) return 0;

  for (const ingredient in recipe) {
    if (ingredient === "count") continue;

    const quantity = recipe[ingredient];
    const product = allBzProductData[ingredient];

    if (!product) {
      // NPC-only ingredient, skip volume tracking
      continue;
    }

    if (
      !isNaN(product.one_hour_instasells) &&
      product.one_hour_instasells > 0
    ) {
      hasBazaarIngredient = true;
      const possible = product.one_hour_instasells / quantity;
      if (possible < minVolume) minVolume = possible;
    } else {
      return 0; // Has Bazaar item, but no volume — treat as invalid
    }
  }

  return hasBazaarIngredient ? Math.floor(minVolume) : Infinity;
}

function returnCraftingProductHtml(product, computedStats) {
  const { craftingCost, profit, oneHourCrafts, coinsPerHour } = computedStats;
  let displayName;
  const recipeKey = product.name.replace(/enchantment/gi, "");
  if (
    crafting.recipes &&
    crafting.recipes[recipeKey] &&
    crafting.recipes[recipeKey].name
  ) {
    displayName = crafting.recipes[recipeKey].name;
  } else {
    displayName = product.name
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/enchantment/gi, "")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }
  return `<img loading="lazy" src="${product.img}" alt="img of ${
    product.name
  }"> 
    <input id="${
      product.name
    }FavoriteCrafting" class="star" type="checkbox"  onclick="handleFavoriteClick('${
    product.name
  }','Crafting',event)">
    <p class="productName">${displayName}</p>
    <p>
      Buy Price: ${safeFixed(product.buy_price).replace(
        /\d(?=(\d{3})+\.)/g,
        "$&,"
      )} coins<br>
      One-Hour Instabuys: ${safeFixed(product.one_hour_instabuys).replace(
        /\d(?=(\d{3})+\.)/g,
        "$&,"
      )}<br>
      Crafting Cost: ${safeFixed(craftingCost).replace(
        /\d(?=(\d{3})+\.)/g,
        "$&,"
      )}<br>
      One-Hour Crafts: ${oneHourCrafts}<br>
      Profit: ${safeFixed(profit).replace(/\d(?=(\d{3})+\.)/g, "$&,")} coins<br>
      Coins per Hour: ${safeFixed(coinsPerHour).replace(
        /\d(?=(\d{3})+\.)/g,
        "$&,"
      )} coins
    </p>`;
}

function getAllCraftingItemDivs(allBzProductData, tax) {
  const items = [];
  for (const productID in allBzProductData) {
    const recipe = crafting.getRecipeIngredients(productID);
    if (!recipe || Object.keys(recipe).length === 0) continue;

    const product = allBzProductData[productID];
    const craftingCount = recipe.count || 1;
    const rawCraftingCost = getProductCraftingCost(
      recipe,
      allBzProductData,
      tax
    );
    if (rawCraftingCost === null) continue;
    const craftingCost = rawCraftingCost / craftingCount;
    if (craftingCost <= 0 || isNaN(craftingCost)) continue; // extra safety

    const profit = product.buy_price - craftingCost;
    let oneHourCrafts = getCraftingProductVolume(recipe, allBzProductData);
    oneHourCrafts =
      oneHourCrafts <= product.one_hour_instasells
        ? oneHourCrafts
        : parseInt(safeFixed(product.one_hour_instabuys, 0), 10);
    const coinsPerHour = oneHourCrafts * profit;

    const computedStats = {
      craftingCost,
      profit,
      oneHourCrafts,
      coinsPerHour,
    };

    items.push({ productID, product, computedStats });
  }

  // Sort by coinsPerHour descending
  items.sort(
    (a, b) => b.computedStats.coinsPerHour - a.computedStats.coinsPerHour
  );

  let html = "";
  for (const { productID, product, computedStats } of items) {
    html += getCraftingItemDiv(productID, product, computedStats); // ✅ this must pass all 3 args
  }

  return html;
}

function HTMLSearchedPage(queryParams, allBzProductData) {
  return createProductDivs(queryParams, allBzProductData);
}

function returnProductHtml(product) {
  //profit and margin are the same thing i'm just very very dumb
  // Try to get a display name from recipes, otherwise format the product name
  let displayName;
  const recipeKey = product.name.replace(/enchantment/gi, "");
  if (
    crafting.recipes &&
    crafting.recipes[recipeKey] &&
    crafting.recipes[recipeKey].name
  ) {
    displayName = crafting.recipes[recipeKey].name;
  } else {
    displayName = product.name
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/enchantment/gi, "")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  return `<img loading="lazy" src="${product.img}" alt="img of ${product.name}">
      <input id="${
        product.name
      }FavoriteFlipping" class="star" type="checkbox" onclick="handleFavoriteClick('${
    product.name
  }','Flipping',event)">
          <p class="productName">${displayName}</p>
          <p>Buy Price: ${safeFixed(product.buy_price).replace(
            /\d(?=(\d{3})+\.)/g,
            "$&,"
          )} coins <br>
          One-Hour Instabuys: ${safeFixed(product.one_hour_instabuys).replace(
            /\d(?=(\d{3})+\.)/g,
            "$&,"
          )}<br>
          Sell Price: ${safeFixed(product.sell_price).replace(
            /\d(?=(\d{3})+\.)/g,
            "$&,"
          )} coins<br>
          One-Hour Instasells: ${safeFixed(product.one_hour_instasells).replace(
            /\d(?=(\d{3})+\.)/g,
            "$&,"
          )}<br>
          Profit: ${safeFixed(product.margin).replace(
            /\d(?=(\d{3})+\.)/g,
            "$&,"
          )} coins <br>
          Coins per Hour: ${safeFixed(product.coins_per_hour).replace(
            /\d(?=(\d{3})+\.)/g,
            "$&,"
          )} coins</p>
          `;
}
/* STRUCTURE OF QUERY PARAMS
    address ='BAZAAR'
    min_coins_per_hour ='0'
    maxbuyRange ='infinity'
    product =''
    treshholdbuys ='0'
    treshholdsells ='0'
    show_only_profit = "true"
    sortby= 'coinsPerHour'*/
function bzSearch(queryParams, allBzProductData) {
  // Convert queryParams to object if it's a string (for backward compatibility)
  let params =
    typeof queryParams === "string" ? { product: queryParams } : queryParams;

  // Helper to check if product name or recipe name matches search
  function matchesSearch(product) {
    const search = normalize(params.product);
    if (!search) return true;
    // Check product name
    if (normalize(product.name).includes(search)) return true;
    // Check recipe name if available
    const recipeKey = product.name.replace(/enchantment/gi, "");
    if (
      crafting.recipes &&
      crafting.recipes[recipeKey] &&
      crafting.recipes[recipeKey].name &&
      normalize(crafting.recipes[recipeKey].name).includes(search)
    ) {
      return true;
    }
    return false;
  }

  let filteredProducts = Object.values(allBzProductData).filter((product) => {
    if (!product) return false;
    if (product.one_hour_instabuys < params.treshholdbuys) return false;
    if (product.one_hour_instasells < params.treshholdsells) return false;
    if (product.coins_per_hour < params.min_coins_per_hour) return false;
    if (product.buy_price > params.maxbuyRange) return false;
    if (product.coins_per_hour <= 1 && params.show_only_profit == "true")
      return false;
    if (!matchesSearch(product)) return false;
    return true;
  });

  return sortProducts(filteredProducts, queryParams.sortby);
}

function sortProducts(filteredProducts, sortby) {
  switch (sortby) {
    case "coinsPerHour":
      return filteredProducts.sort(
        (a, b) => b.coins_per_hour - a.coins_per_hour
      );
    case "profit":
      return filteredProducts.sort((a, b) => b.margin - a.margin);
    case "profit%":
      return filteredProducts.sort((a, b) => {
        const aPct = a.buy_price ? a.margin / a.buy_price : -Infinity;
        const bPct = b.buy_price ? b.margin / b.buy_price : -Infinity;
        return bPct - aPct;
      });
    default:
      return filteredProducts;
  }
}
function createProductDiv(product) {
  return `<div id="${
    product.name
  }" class="output" onclick="window.location.href='/product/${encodeURIComponent(
    product.name
  )}'">${returnProductHtml(product)}</div>`;
}

function createProductDivs(queryParams, allBzProductData) {
  let productDivs = "";
  let products = bzSearch(queryParams, allBzProductData);
  if (!products || products.length === 0) {
    return `<h1>No products found</h1>`;
  }
  for (let i = 0; i < products.length; i++) {
    productDivs += createProductDiv(products[i]);
  }
  return productDivs;
}
function normalize(str) {
  if (typeof str !== "string") return;
  return str
    ?.toLowerCase()
    .replace(/[_\s]+/g, " ") // convert underscores and multiple spaces to single space
    .trim()
    .toString();
}

function updateVisibleProducts(queryParams, allBzProductData) {
  let currentProducts = [];
  if (queryParams && Array.isArray(queryParams.products)) {
    for (const id of queryParams.products) {
      const product = allBzProductData[id];
      if (product) currentProducts.push(product);
    }
  }
  currentProducts = sortProducts(currentProducts, queryParams.sortby);
  const productDivs = currentProducts
    .map((product) => createProductDiv(product))
    .join("");
  return productDivs;
}

function getHtmlForgingPage(allBzProductData, tax) {
  const forgeItemsPath = path.join(__dirname, "forgeItems.json");
  let forgeItems = [];
  try {
    const data = fs.readFileSync(forgeItemsPath, "utf8");
    forgeItems = JSON.parse(data);
  } catch (err) {
    console.error("Failed to load forgeItems.json:", err);
    return "<h1>Error loading forge items</h1>";
  }
  return getAllForgingDivs(forgeItems, allBzProductData, tax);
}

function getAllForgingDivs(forgeItems, allBzProductData, tax) {
  let html = "";
  let items = [];
  for (const item in forgeItems) {
    const product = allBzProductData[item];
    if (!product) continue;
    const recipe = getRecipeIngredients(forgeItems, item);
    const craftingCost = getProductCraftingCost(recipe, allBzProductData, tax);
    const profit = product.buy_price - craftingCost;
    const forgingTime = (forgeItems[item].forge * 0.7) / 3600;
    const craftsPerHour = 1 / forgingTime;
    const coinsPerHour =
      craftsPerHour > product.one_hour_instabuys
        ? profit * product.one_hour_instabuys
        : profit * craftsPerHour;
    const computedStats = {
      product,
      craftingCost,
      profit,
      forgingTime,
      coinsPerHour,
    };
    items.push(computedStats);
  }
  items.sort((a, b) => b.profit - a.profit);
  for (const computedStats of items) {
    html += getForgingDiv(computedStats.product, computedStats);
  }
  return html;
}

function getForgingHtml(product, computedStats) {
  // Provide default values and safe formatting to avoid runtime errors
  const {
    craftingCost = 0,
    profit = 0,
    forgingTime = 0,
    coinsPerHour = 0,
  } = computedStats || {};

  const safeBuyPrice =
    product.buy_price && !isNaN(product.buy_price) ? product.buy_price : 0;
  const safeInstabuys =
    product.one_hour_instabuys && !isNaN(product.one_hour_instabuys)
      ? product.one_hour_instabuys
      : 0;
  let displayName;
  const recipeKey = product.name.replace(/enchantment/gi, "");
  if (
    crafting.recipes &&
    crafting.recipes[recipeKey] &&
    crafting.recipes[recipeKey].name
  ) {
    displayName = crafting.recipes[recipeKey].name;
  } else {
    displayName = product.name
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/enchantment/gi, "")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }
  return `<img loading="lazy" src="${product.img}" alt="img of ${product.name}">
      <input id="${
        product.name
      }FavoriteForging" class="star" type="checkbox"  onclick="handleFavoriteClick('${
    product.name
  }','Forging',event)">
    <p class="productName">${displayName}</p>
    <p>
      Buy Price: ${safeFixed(safeBuyPrice).replace(
        /\d(?=(\d{3})+\.)/g,
        "$&,"
      )} coins<br>
      One-Hour Instabuys: ${safeFixed(safeInstabuys).replace(
        /\d(?=(\d{3})+\.)/g,
        "$&,"
      )}<br>
      Crafting Cost: ${
        !isNaN(craftingCost)
          ? safeFixed(craftingCost).replace(/\d(?=(\d{3})+\.)/g, "$&,")
          : "N/A"
      }<br>
      Forging Time: ${
        !isNaN(forgingTime) ? formatHours(forgingTime) : "N/A"
      }<br>
      Profit: ${
        !isNaN(profit)
          ? safeFixed(profit).replace(/\d(?=(\d{3})+\.)/g, "$&,")
          : "N/A"
      } coins<br>
      Coins per Hour: ${
        !isNaN(coinsPerHour)
          ? safeFixed(coinsPerHour).replace(/\d(?=(\d{3})+\.)/g, "$&,")
          : "N/A"
      } coins
    </p>`;
}

function getForgingDiv(product, computedStats) {
  return `<div id="${
    product.name
  }" class="output" onclick="window.location.href='/product/${encodeURIComponent(
    product.name
  )}'">
    ${getForgingHtml(product, computedStats)}
  </div>`;
}

function getRecipeIngredients(forgeItems, productId) {
  if (!forgeItems[productId] || !forgeItems[productId].recipe) {
    return null;
  }
  const summary = {};
  let recipe = forgeItems[productId].recipe;
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

function formatHours(time) {
  const totalSeconds = Math.round(time * 3600);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const h = hours > 0 ? `${hours}h` : "";
  const m = minutes > 0 ? `${minutes}m` : "";
  const s = seconds > 0 ? `${seconds}s` : "";

  return [h, m, s].filter(Boolean).join(" ") || "0s";
}

async function getHomepage(allBzProductData, tax) {
  await crafting.recipesReady;

  // Get top 3 Crafting
  const craftingItems = [];
  for (const productID in allBzProductData) {
    const recipe = crafting.getRecipeIngredients(productID);
    if (!recipe || Object.keys(recipe).length === 0) continue;

    const product = allBzProductData[productID];
    const craftingCount = recipe.count || 1;
    const rawCraftingCost = getProductCraftingCost(
      recipe,
      allBzProductData,
      tax
    );
    if (rawCraftingCost === null) continue;
    const craftingCost = rawCraftingCost / craftingCount;
    const profit = product.buy_price - craftingCost;
    let oneHourCrafts = getCraftingProductVolume(recipe, allBzProductData);
    oneHourCrafts =
      oneHourCrafts <= product.one_hour_instasells
        ? oneHourCrafts
        : parseInt(safeFixed(product.one_hour_instabuys, 0), 10);
    const coinsPerHour = oneHourCrafts * profit;

    craftingItems.push({
      html: getCraftingItemDiv(productID, product, {
        craftingCost,
        profit,
        oneHourCrafts,
        coinsPerHour,
      }),
      coinsPerHour,
    });
  }
  craftingItems.sort((a, b) => b.coinsPerHour - a.coinsPerHour);
  const topCrafting = craftingItems
    .slice(0, 3)
    .map((item) => item.html)
    .join("");
  // Get top 3 Flipping
  const flippingParams = {
    address: "BAZAAR",
    product: "",
    treshholdsells: 0,
    treshholdbuys: 0,
    min_coins_per_hour: 0,
    maxbuyRange: Infinity,
    show_only_profit: true,
    sortby: "coinsPerHour",
  };
  const flipProducts = bzSearch(flippingParams, allBzProductData).slice(0, 3);
  const topFlipping = flipProducts
    .map((product) => createProductDiv(product))
    .join("");
  // Get top 3 Forging
  const forgeItemsPath = path.join(__dirname, "forgeItems.json");
  let forgeItems = [];
  try {
    forgeItems = JSON.parse(fs.readFileSync(forgeItemsPath, "utf8"));
  } catch (err) {
    console.error("Error loading forge items:", err);
  }
  const forgingStats = [];
  for (const item in forgeItems) {
    const product = allBzProductData[item];
    if (!product) continue;
    const recipe = getRecipeIngredients(forgeItems, item);
    const craftingCost = getProductCraftingCost(recipe, allBzProductData, tax);
    const profit = product.buy_price - craftingCost;
    const forgingTime = (forgeItems[item].forge * 0.7) / 3600;
    const craftsPerHour = 1 / forgingTime;
    const coinsPerHour =
      Math.min(craftsPerHour, product.one_hour_instabuys) * profit;

    forgingStats.push({
      html: getForgingDiv(product, {
        craftingCost,
        profit,
        forgingTime,
        coinsPerHour,
      }),
      profit,
    });
  }
  forgingStats.sort((a, b) => b.profit - a.profit);
  const topForging = forgingStats
    .slice(0, 3)
    .map((item) => item.html)
    .join("");

  return `
    ${topFlipping}
    ${topCrafting}
    ${topForging}
  `;
}

function safeFixed(val, digits = 1) {
  const num = Number(val);
  return !isNaN(num) && num !== null && num !== undefined
    ? num.toFixed(digits)
    : (0).toFixed(digits);
}

function HTMLFavorites(queryParams,allBzProductData){
  if (!queryParams || !Array.isArray(queryParams.favorites) || queryParams.favorites.length === 0) {
    return `<h1>No favorites found</h1>`;
  }
  let html = "";
  for (const fav of queryParams.favorites) {
    const { name, type } = fav;
    const product = allBzProductData[name];
    if (!product) continue;
    if (type === "Crafting") {
      const recipe = crafting.getRecipeIngredients(name);
      if (!recipe) continue;
      const craftingCount = recipe.count || 1;
      const craftingCost = getProductCraftingCost(recipe, allBzProductData, queryParams.tax) / craftingCount;
      const profit = product.buy_price - craftingCost;
      let oneHourCrafts = getCraftingProductVolume(recipe, allBzProductData);
      oneHourCrafts =
        oneHourCrafts <= product.one_hour_instasells
          ? oneHourCrafts
          : parseInt(safeFixed(product.one_hour_instabuys, 0), 10);
      const coinsPerHour = oneHourCrafts * profit;
      html += getCraftingItemDiv(name, product, { craftingCost, profit, oneHourCrafts, coinsPerHour });
    } else if (type === "Flipping") {
      html += createProductDiv(product);
    } else if (type === "Forging") {
      const forgeItemsPath = path.join(__dirname, "forgeItems.json");
      let forgeItems = {};
      try {
        forgeItems = JSON.parse(fs.readFileSync(forgeItemsPath, "utf8"));
      } catch (err) {
        // skip if forgeItems can't be loaded
        continue;
      }
      const recipe = getRecipeIngredients(forgeItems, name);
      if (!recipe) continue;
      const craftingCost = getProductCraftingCost(recipe, allBzProductData, queryParams.tax);
      const profit = product.buy_price - craftingCost;
      const forgingTime = (forgeItems[name]?.forge * 0.7) / 3600;
      const craftsPerHour = 1 / forgingTime;
      const coinsPerHour =
        Math.min(craftsPerHour, product.one_hour_instabuys) * profit;
      html += getForgingDiv(product, { craftingCost, profit, forgingTime, coinsPerHour });
    }
  }
  return html || `<h1>No favorites found</h1>`;
}