const {parentPort} = require('worker_threads');
const crafting = require('./crafting.js');
const path = require('path');
const fs = require('fs');

parentPort.on('message', async ({ allBzProductData, requestType, queryParams, tax }) => {
  await crafting.recipesReady;
  let response;
  switch (requestType) {
    case 'crafting':
      response = getAllCraftingItemDivs(allBzProductData, tax);
      parentPort.postMessage(response);
      break;
    case 'flipping':
      try {
        response = HTMLSearchedPage({
          address: "BAZAAR",
          product: "",
          treshholdsells: 0,
          treshholdbuys: 0,
          min_coins_per_hour: 0,
          maxbuyRange: Infinity,
          show_only_profit: "true", //TODO WTF IS THIS OMG CHANGE THIS SO IT TAKES A BOOLEAN AND NOT A STRING
          sortby: "coinsPerHour",
        }, allBzProductData);
      } catch (error) {
        console.error("Error in caching Home Page", error);
        response = "<h1>Error generating flipping page</h1>";
      }
      parentPort.postMessage(response);
      break;
      
      case 'forging':
      response = getHtmlForgingPage(allBzProductData, tax);
      parentPort.postMessage(response);
      break;

    case 'searching':
      try {
        response = HTMLSearchedPage(queryParams, allBzProductData);
      } catch (error) {
        console.error("Error in caching Home Page", error);
        response = "<h1>Error generating flipping page</h1>";
      }
      parentPort.postMessage(response);
      break;
    case 'updating':
      try {
        response = updateVisibleProducts(queryParams, allBzProductData);
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
});

function getCraftingItemDiv(productID, product, computedStats) {
  return `<div id="${
    product.name
  }" class="output" onclick="window.location.href='/product/${encodeURIComponent(
    product.name
  )}'">
    ${returnCraftingProductHtml( product, computedStats)}
  </div>`;
}

function getProductCraftingCost(recipe,allBzProductData,tax) {
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

function getCraftingProductVolume(recipe,allBzProductData) {
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
  const { craftingCost, profit, oneHourCrafts, coinsPerHour } =
    computedStats;

  return `<img loading="lazy" src="${product.img}" alt="img of ${product.name}">
    <p class="productName">${product.name
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/enchantment/gi, "")}</p>
    <p>
      Buy Price: ${product.buy_price
        .toFixed(1)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,")} coins<br>
      One-Hour Instabuys: ${product.one_hour_instabuys
        .toFixed(1)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,")}<br>
      Crafting Cost: ${craftingCost
        .toFixed(1)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,")}<br>
      One-Hour Crafts: ${oneHourCrafts}<br>
      Profit: ${profit.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, "$&,")} coins<br>
      Coins per Hour: ${coinsPerHour
        .toFixed(1)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,")} coins
    </p>`;
}

function getAllCraftingItemDivs(allBzProductData,tax) {
  const items = [];
  for (const productID in allBzProductData) {
    const recipe = crafting.getRecipeIngredients(productID);
    if (!recipe || Object.keys(recipe).length === 0) continue;
    
    const product = allBzProductData[productID];
    const craftingCount = recipe.count || 1;
    const rawCraftingCost = getProductCraftingCost(recipe,allBzProductData,tax);
    if (rawCraftingCost === null) continue;
    const craftingCost = rawCraftingCost / craftingCount;
    if (craftingCost <= 0 || isNaN(craftingCost)) continue; // extra safety

    const profit = product.buy_price - craftingCost;
    let oneHourCrafts = getCraftingProductVolume(recipe,allBzProductData);
    oneHourCrafts =
      oneHourCrafts <= product.one_hour_instasells
        ? oneHourCrafts
        : parseInt(product.one_hour_instabuys.toFixed(0), 10);
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

function HTMLSearchedPage(queryParams,allBzProductData) {
  return createProductDivs(queryParams,allBzProductData);
}

function returnProductHtml(product) {
  //profit and margin are the same thing i'm just very very dumb
  // Try to get a display name from recipes, otherwise format the product name
  let displayName;
  const recipeKey = product.name.replace(/enchantment/gi, "");
  if (crafting.recipes && crafting.recipes[recipeKey] && crafting.recipes[recipeKey].name) {
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
          <p class="productName">${displayName}</p>
          <p>Buy Price: ${product.buy_price
            .toFixed(1)
            .replace(/\d(?=(\d{3})+\.)/g, "$&,")} coins <br>
          One-Hour Instabuys: ${product.one_hour_instabuys
            .toFixed(1)
            .replace(/\d(?=(\d{3})+\.)/g, "$&,")}<br>
          Sell Price: ${product.sell_price
            .toFixed(1)
            .replace(/\d(?=(\d{3})+\.)/g, "$&,")} coins<br>
          One-Hour Instasells: ${product.one_hour_instasells
            .toFixed(1)
            .replace(/\d(?=(\d{3})+\.)/g, "$&,")}<br>
          Profit: ${product.margin
            .toFixed(1)
            .replace(/\d(?=(\d{3})+\.)/g, "$&,")} coins <br>
          Coins per Hour: ${product.coins_per_hour
            .toFixed(1)
            .replace(/\d(?=(\d{3})+\.)/g, "$&,")} coins</p>
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
function bzSearch(queryParams,allBzProductData) {
  //TODO ADD MORE FILTERING AND SORTING OPTIONS
  if (!allBzProductData) return [];

  // Convert queryParams to object if it's a string (for backward compatibility)
  let params =
    typeof queryParams === "string" ? { product: queryParams } : queryParams;
  let filteredProducts = Object.values(allBzProductData).filter((product) => {
    if (!product) return false;
    if (product.one_hour_instabuys < params.treshholdbuys) return false;
    if (product.one_hour_instasells < params.treshholdsells) return false;
    if (product.coins_per_hour < params.min_coins_per_hour) return false;
    if (product.buy_price > params.maxbuyRange) return false;
    if (product.coins_per_hour <= 1 && params.show_only_profit == "true")
      return false;

    if (!normalize(product.name).includes(normalize(params.product)))
      return false;
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

function createProductDivs(queryParams,allBzProductData) {
  let productDivs = "";
  let products = bzSearch(queryParams,allBzProductData);
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

function updateVisibleProducts(queryParams,allBzProductData) {
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

function getHtmlForgingPage(allBzProductData,tax){
  const forgeItemsPath = path.join(__dirname, 'forgeItems.json');
  let forgeItems = [];
  try {
    const data = fs.readFileSync(forgeItemsPath, 'utf8');
    forgeItems = JSON.parse(data);
  } catch (err) {
    console.error('Failed to load forgeItems.json:', err);
    return '<h1>Error loading forge items</h1>';
  }
  return getAllForgingDivs(forgeItems,allBzProductData,tax)
}

function getAllForgingDivs(forgeItems, allBzProductData, tax) {
  let html = '';
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
      craftsPerHour > product.one_hour_instabuys ? profit * product.one_hour_instabuys : profit * craftsPerHour;
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

  const safeBuyPrice = product.buy_price && !isNaN(product.buy_price) ? product.buy_price : 0;
  const safeInstabuys = product.one_hour_instabuys && !isNaN(product.one_hour_instabuys) ? product.one_hour_instabuys : 0;
  return `<img loading="lazy" src="${product.img}" alt="img of ${product.name}">
    <p class="productName">${product.name
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/enchantment/gi, "")}</p>
    <p>
      Buy Price: ${safeBuyPrice
        .toFixed(1)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,")} coins<br>
      One-Hour Instabuys: ${safeInstabuys
        .toFixed(1)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,")}<br>
      Crafting Cost: ${!isNaN(craftingCost) ? craftingCost.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, "$&,") : "N/A"}<br>
      Forging Time: ${!isNaN(forgingTime) ? formatHours(forgingTime) : "N/A"}<br>
      Profit: ${!isNaN(profit) ? profit.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, "$&,") : "N/A"} coins<br>
      Coins per Hour: ${!isNaN(coinsPerHour) ? coinsPerHour.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, "$&,") : "N/A"} coins
    </p>`;
}

function getForgingDiv(product,computedStats){
  return `<div id="${
    product.name
  }" class="output" onclick="window.location.href='/product/${encodeURIComponent(
    product.name
  )}'">
    ${getForgingHtml( product, computedStats)}
  </div>`;
}

function getRecipeIngredients(forgeItems,productId) {
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

  const h = hours > 0 ? `${hours}h` : '';
  const m = minutes > 0 ? `${minutes}m` : '';
  const s = seconds > 0 ? `${seconds}s` : '';

  return [h, m, s].filter(Boolean).join(' ') || '0s';
}
