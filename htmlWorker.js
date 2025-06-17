const {parentPort} = require('worker_threads');
const crafting = require('./crafting.js');

parentPort.on('message', async ({ allBzProductData, requestType,queryParams,tax}) => {
    await crafting.recipesReady;
    if (requestType === 'crafting') {
        const response = getAllCraftingItemDivs(allBzProductData,tax);
        parentPort.postMessage(response);
    }
    if(requestType === 'flipping'){
    let response;
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
    }
    if(requestType === 'searching'){
      try {
      response = HTMLSearchedPage(queryParams, allBzProductData);
    } catch (error) {
      console.error("Error in caching Home Page", error);
      response = "<h1>Error generating flipping page</h1>";
    }
      parentPort.postMessage(response);
    }
    if(requestType === 'updating'){
      try {
      response = updateVisibleProducts(queryParams, allBzProductData);
    } catch (error) {
      console.error("Error in caching Home Page", error);
      response = "<h1>Error generating flipping page</h1>";
    }
      parentPort.postMessage(response);
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
  const { craftingCost, profit, oneHourCrafts, margin, coinsPerHour } =
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

    const margin = product.buy_price - craftingCost;
    const coinsPerHour = oneHourCrafts * margin;

    const computedStats = {
      craftingCost,
      profit,
      oneHourCrafts,
      margin,
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