const fs = require("fs");
const http = require('http');
const path = require('path');
const url = require('url');
const mysql = require('mysql');
const db = require ('./db.js');
const crafting = require ('./crafting.js')

const port = 49166;
const API_KEY = "LUKO E' UNA PUTTANA";

const API_ADDRESSES = {
    AUCTIONS: "https://api.hypixel.net/v2/skyblock/auctions",
    BAZAAR: "https://api.hypixel.net/v2/skyblock/bazaar",
    MAYOR: "https://api.hypixel.net/v2/resources/skyblock/election"
};

const FILE_PATHS = {
  AUCTIONS: path.join(__dirname, "JSON", "auctions.json"),
  BAZAAR: path.join(__dirname, "JSON", "bazaar.json"),
  ALL_PRODUCTS: path.join(__dirname, "JSON", "allproducts.json")
}


class Product{
  constructor(name,buy_price,one_hour_instabuys,sell_price,one_hour_instasells){
    this.name = name;
  if (name.includes("ENCHANTMENT")) {
    this.img = `/images/ENCHANTED_BOOK`;
  } else if (availableImages.has(name)) {
    this.img = `/images/${name}`;
  } else {
    this.img = `/images/WIP`;
  }
    this.buy_price = buy_price;
    this.one_hour_instabuys = one_hour_instabuys;
    this.sell_price = sell_price;
    this.one_hour_instasells = one_hour_instasells;
    this.margin = (buy_price - sell_price) - tax * buy_price;
    if(one_hour_instabuys < one_hour_instasells)
      this.coins_per_hour = this.margin * one_hour_instabuys;
    else
      this.coins_per_hour = this.margin * one_hour_instasells;
  }
}


var bzData;//all bz data as json
var ahData;//all ah data as json
var allBzProductData;//all bz data as product class objects
var Mayor;//current mayor name as a string
const updating = true;
const fetchAllProducts = true;
const populatedb = false;
const callDelay = 3 * 1000;
var readingBzData = false;//binary semaphore to avoid reading bz data while it is being written
var cachedFlippingPage = null; // Cache for the homepage response
var isWritingBazaarJSON = false
const imageDir = path.join(__dirname, 'ASSETS', 'PRODUCTS');
var {recipes} = require('./crafting.js');
let bzDataReady = false;
let tax;
const availableImages = new Set(
  fs.readdirSync(imageDir)
    .filter(file => file.endsWith('.png'))
    .map(file => file.replace('.png', ''))
);

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;
  const pathname = parsedUrl.pathname;

  switch (true) {
    case pathname.startsWith('/images/'): {
      const imageKey = pathname.replace('/images/', '');
      const imgPath = path.join('ASSETS', 'PRODUCTS', imageKey + '.png');
      fs.readFile(imgPath, (err, data) => {
        if (err) {
          res.writeHead(404);
          return res.end();
        }
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(data);
      });
      break;
    }

    case pathname.startsWith('/mayors/'): {
      const imgPath = path.join(__dirname, 'ASSETS', 'MAYORS', pathname.replace('/mayors/', ''));
      fs.readFile(imgPath, (err, data) => {
        if (err) {
          res.writeHead(404);
          return res.end();
        }
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(data);
      });
      break;
    }

    case pathname.startsWith('/icons/'): {
      const imgPath = path.join(__dirname, 'ASSETS', 'ICONS', pathname.replace('/icons/', ''));
      fs.readFile(imgPath, (err, data) => {
        if (err) {
          res.writeHead(404);
          return res.end();
        }
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(data);
      });
      break;
    }

    case pathname === '/mayorname': {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(Mayor.mayor.name);
      break;
    }
    case pathname.startsWith('/homepage') && method === 'GET': {
      const response = 'WIP HOMEPAGE'
      res.setHeader('Content-Type', 'text/html');
      res.end(response);
      break;
    }
    case pathname.startsWith('/flipping') && method === 'GET': {
      const response = cachedFlippingPage != null ? getFlippingPagge() : HTMLSearchedPage({ product: "" });
      res.setHeader('Content-Type', 'text/html');
      res.end(response);
      break;
    }
    case pathname.startsWith('/crafting') && method === 'GET': {
      const response = getAllCraftingItemDivs();
      res.setHeader('Content-Type', 'text/html');
      res.end(response);
      break;
    }
        case pathname.startsWith('/forging') && method === 'GET': {
      const response = 'WIP FORGING'
      res.setHeader('Content-Type', 'text/html');
      res.end(response);
      break;
    }
        case pathname.startsWith('/npc') && method === 'GET': {
      const response = 'WIP NPC'
      res.setHeader('Content-Type', 'text/html');
      res.end(response);
      break;
    }
        case pathname.startsWith('/reversenpc') && method === 'GET': {
      const response = 'WIP REVERSE NPC'
      res.setHeader('Content-Type', 'text/html');
      res.end(response);
      break;
    }
    

    case pathname.startsWith('/search') && method === 'GET': {
      if (!allBzProductData || Object.keys(allBzProductData).length === 0) {
        res.setHeader('Content-Type', 'text/html');
        res.end('<h1>Bazaar data is still loading. Please wait a bit before trying to search again.</h1>');
      } else {
        const response = HTMLSearchedPage(parsedUrl.query);
        res.setHeader('Content-Type', 'text/html');
        res.end(response);
      }
      break;
    }

    case pathname.startsWith('/update') && method === 'POST': {
      if (!allBzProductData || Object.keys(allBzProductData).length === 0) {
        res.setHeader('Content-Type', 'text/html');
        res.end('<h1>Bazaar data is still loading. Please wait a bit before trying to search again.</h1>');
      } else {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          let queryParams = {};
          try {
            queryParams = JSON.parse(body);
          } catch (e) {}
          const response = updateVisibleProducts(queryParams);
          res.setHeader('Content-Type', 'text/html');
          res.end(response);
        });
      }
      break;
    }

    case pathname.startsWith('/product') && method === 'GET': {
      const product = pathname.replace('/product/','');
      const response = await getProductDataPage(product);
      res.setHeader('Content-Type', 'text/html');
      res.end(response);
      break;
    }

    case pathname === '/favicon.ico' && method === 'GET': {
      const iconPath = path.join(__dirname, 'ASSETS', 'favicon.ico');
      fs.readFile(iconPath, (err, icon) => {
        if (err) {
          res.writeHead(404);
          res.end();
        } else {
          res.writeHead(200, { 'Content-Type': 'image/x-icon' });
          res.end(icon);
        }
      });
      break;
    }

    default: {
      let filePath = '.' + pathname;
      if (filePath === './') filePath = './newdesign.html';

      const extname = path.extname(filePath);
      let contentType = 'text/html';
      switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': contentType = 'image/jpg'; break;
      }

      fs.readFile(filePath, (err, content) => {
        if (err) {
          if (err.code === 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>');
          } else {
            res.writeHead(500);
            res.end(`Server Error: ${err.code}`);
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      });
      break;
    }
  }
});


server.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}/`);
  await getMayor();
  await loadInitialData();
  db.connectToDb();
  if(updating) startPeriodicTasks();
  if(fetchAllProducts) writeAllProductsToJson();
  if(populatedb) populateBzDb();
});

async function loadInitialData() {
  bzData = await fileToJson(FILE_PATHS["BAZAAR"]);
  ahData = await fileToJson(FILE_PATHS["AUCTIONS"]);
  allBzDataToProduct();
}
function startPeriodicTasks() {

    setInterval(async () => {
        try {
           fetchAhData();
        } catch (error) {
          console.error("Error in fetching ah data", error);
        }
    }, callDelay);

    setInterval(async () => {//CALL HYPIXEL API AND WRITE TO FILE
        try {
           fetchBzData();
        } catch (error) {
          console.error("Error in fetching bz data", error);
        }
    }, callDelay);

    setInterval(async () => {//WRITE ALL BZ DATA TO PRODUCT CLASS FORMAT
      try {
        allBzDataToProduct();
      } catch (error) {
        console.error("Error in writing bz data", error);
      }
    }, callDelay * 2);

    setInterval(async () => {//UPDATE THE CACHED PAGE
      try {
    cachedFlippingPage =  HTMLSearchedPage({
    address: 'BAZAAR',
    product: "",
    treshholdsells: 0,
    treshholdbuys: 0,
    min_coins_per_hour: 0,
    maxbuyRange:Infinity,
    min_coins_per_hour: 0,
    show_only_profit: "true",//TODO WTF IS THIS OMG CHANGE THIS SO IT TAKES A BOOLEAN AND NOT A STRING
    sortby:"coinsPerHour",
    });
      } catch (error) {
        console.error("Error in caching Home Page", error);
      }
    }, callDelay * 3);

    setInterval(async () => {
      try {
        await getMayor();
      } catch (error) {
        console.error("Error in fetching mayor data", error);
      }
    }, 24 * 60 * 60 * 1000);
    if(populatedb){
      setInterval(async () => {
        try {
          const d = new Date();
          let hour = d.getHours();
          console.log('Added data to database at time:',hour)
          console.log('Next add should occur in 15 minutes, at:', (hour + 1) % 24, 'and', (d.getMinutes() + 15) % 60, 'minutes')
          writeallBzToDb();
        } catch (error) {
          console.error("Error in writing bz data to db", error);
        }
      },60 * 1000 * 15);
      }
    }
async function getMayor() {
  Mayor = await fetchApi("MAYOR");
  console.log(`The current Mayor is ${Mayor.mayor.name}`)
  tax = Mayor?.mayor?.name != "Derpy" ?  0.01125 : 0.01125 * 4;
  console.log('Taxes are at:',tax)
}
function bzDataToProduct(product){
   if (product in bzData.products){
    return new Product(bzData.products[product].product_id,bzData.products[product].buy_summary[0]?.pricePerUnit || 0,(bzData.products[product].quick_status.buyMovingWeek/7)/24,bzData.products[product].sell_summary[0]?.pricePerUnit || 0,(bzData.products[product].quick_status.sellMovingWeek/7)/24);
   } 
   return null;
}

function allBzDataToProduct() {
  const newProductData = {};
  for (const productId in bzData.products) {
    const productObj = bzDataToProduct(productId);
    if (productObj) {
      newProductData[productId] = productObj;
    }
  }

  allBzProductData = newProductData;
  bzDataReady = true;
}

async function fetchBzData() {
   // while (readingBzData); // Wait if someone is reading
    readingBzData = true;  // Lock for writing

    try {
        let buffer = await fetchApi("BAZAAR");
        if(buffer && buffer.products) bzData = buffer;
        await jsonToFile(FILE_PATHS["BAZAAR"], JSON.stringify(bzData));
    } catch (err) {
        console.error("Error writing BZ data", err);
    } finally {
        readingBzData = false; // Release lock
    }
}

async function fetchAhData(){
    ahData = await fetchApi("AUCTIONS");
    jsonToFile(FILE_PATHS["AUCTIONS"],JSON.stringify(ahData));
}

async function fetchApi(address) {
    let apiUrl = API_ADDRESSES[address];
    try {
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "API-Key": API_KEY, 
            },
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error during data fetch', error);
        return null;
    }
}


function jsonToFile(filepath,data){
    fs.writeFile(filepath, data, (error) => {
    if (error) {
        console.error(error);

        throw error;
    }
    });
}

async function fileToJson(filepath) {
  try {
    const data = await fs.promises.readFile(filepath, 'utf8');
    if(!data) console.error("No data in",filepath);
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading or parsing JSON file at ${filepath}:`, err);
    return null;
  }
}
  
function writeAllProductsToJson(){
    let allProducts = [];
    if(!bzData?.products || !bzData) return;
    for (product in bzData.products){
        allProducts.push(normalize(bzData.products[product].product_id));
    }
    jsonToFile(FILE_PATHS["ALL_PRODUCTS"],JSON.stringify(allProducts));
}

async function populateBzDb(){
  for(product in allBzProductData){
    if(!await db.productExists( allBzProductData[product].name)){
      db.addProduct(allBzProductData[product].name,allBzProductData[product].name);
    }
  }
}

function writeallBzToDb(){
for (const product of Object.values(allBzProductData)) {
  db.addHistoricData(
    product.name,
    product.sell_price,
    product.buy_price,
    new Date().toISOString().slice(0, 19).replace('T', ' '),
    product.one_hour_instasells,
    product.one_hour_instabuys,
    new Date().toISOString().slice(11, 19)
  );
}
}

function returnProductHtml(product){//profit and margin are the same thing i'm just very very dumb
    return `<img  loading="lazy" src="${product.img}" alt="img of ${product.name}">
          <p class="productName">${product.name.toLowerCase().replace(/_/g, ' ').replace(/enchantment/gi, '')}</p>
          <p>Buy Price: ${product.buy_price.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')} coins <br>
          One-Hour Instabuys: ${product.one_hour_instabuys.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')}<br>
          Sell Price: ${product.sell_price.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')} coins<br>
          One-Hour Instasells: ${product.one_hour_instasells.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')}<br>
          Profit: ${product.margin.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')} coins <br>
          Coins per Hour: ${product.coins_per_hour.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')} coins</p>
          ` 
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
function bzSearch(queryParams){//TODO ADD MORE FILTERING AND SORTING OPTIONS
  if (!allBzProductData) return [];

  // Convert queryParams to object if it's a string (for backward compatibility)
  let params = typeof queryParams === "string" ? { product: queryParams } : queryParams;
  let filteredProducts = Object.values(allBzProductData).filter(product => {
    if (!product) return false;
    if(product.one_hour_instabuys < params.treshholdbuys) return false;
    if(product.one_hour_instasells < params.treshholdsells) return false;
    if(product.coins_per_hour < params.min_coins_per_hour) return false;
    if(product.buy_price > params.maxbuyRange) return false;
    if(product.coins_per_hour <= 1 && params.show_only_profit == "true") return false

    if(!normalize(product.name).includes(normalize(params.product))) return false;
    return true;
  });

  return sortProducts(filteredProducts,queryParams.sortby);
}

function sortProducts(filteredProducts,sortby){
  switch(sortby){
    case 'coinsPerHour':
      return filteredProducts.sort((a, b) => b.coins_per_hour - a.coins_per_hour);
    case 'profit':
      return filteredProducts.sort((a, b) => b.margin - a.margin);
    case 'profit%':
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
  return `<div id="${product.name}" class="output" onclick="window.location.href='/product/${encodeURIComponent(product.name)}'">${returnProductHtml(product)}</div>`;
}

function createProductDivs(queryParams) {
  let productDivs = "";
  let products = bzSearch(queryParams);
  if (!products || products.length === 0) {
    return `<h1>No products found</h1>`;
  }
  for (let i = 0; i < products.length; i++) {
    productDivs += createProductDiv(products[i]);
  }
  return productDivs;
}

function HTMLSearchedPage(queryParams){//TODO SIMPLIFY THE BOOLEAN LOGIC
  if(cachedFlippingPage == null){
    return "<h1>Seems the server just woke up! Give it some time for coffe!<h1>"
  }
  return createProductDivs(queryParams);
}

function getFlippingPagge(){
  return cachedFlippingPage;
}

function updateVisibleProducts(queryParams) {
  let currentProducts = [];
  if (queryParams && Array.isArray(queryParams.products)) {
    for (const id of queryParams.products) {
      const product = allBzProductData[id]
      if (product) currentProducts.push(product);
    }
  }
  currentProducts = sortProducts(currentProducts,queryParams.sortby);
  const productDivs = currentProducts.map(product => createProductDiv(product)).join('');
  return productDivs;
}

function normalize(str) {
  if (!typeof str === 'string') return;
  return str
    ?.toLowerCase()
    .replace(/[_\s]+/g, ' ')  // convert underscores and multiple spaces to single space
    .trim().toString();
}

async function getProductDataPage(product_id) {
  let res = '';
  let chartScript = '';

  await db.getHistoricData(product_id)
    .then(data => {
      if (typeof data === 'string') {
        res = '<p>No data found</p>';
      } else {
        const datetimes = [];
        const buyPrices = [];
        const sellPrices = [];

        data.forEach(row => {
          const fullDateTime = formatDateTime(row.date, row.hour);
          datetimes.push(fullDateTime);
          buyPrices.push(row.buy);
          sellPrices.push(row.sell);
        });
const product = allBzProductData[product_id];
res += `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bazaar Flipper</title>
  <link rel="stylesheet" href="/newstyle.css">
</head>
<body>

  <h2>Price History for ${product.name}</h2>
  ${product ? `<img class="dataImg" loading="lazy" src="${product.img}" alt="img of ${product.name}">` : ''}
  <div id="chart" style="width:100%;max-width:800px;height:400px;"></div>
`;
chartScript = `
      <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
      <script>
const traceBuy = {
  x: ${JSON.stringify(datetimes)},
  y: ${JSON.stringify(buyPrices)},
  type: 'scatter',
  mode: 'lines',
  name: 'Buy Price',
  line: { color: '#1f77b4', width: 2 },
  marker: { size: 6 }
};

const traceSell = {
  x: ${JSON.stringify(datetimes)},
  y: ${JSON.stringify(sellPrices)},
  type: 'scatter',
  mode: 'lines',
  name: 'Sell Price',
  line: { color: '#ff7f0e', width: 2 },
  marker: { size: 6 }
};

      const layout = {
title: 'Buy/Sell Price History',
xaxis: {
  title: 'Date & Time',
  type: 'date',
  showgrid: true,
  tickangle: -45,
  tickformat: "%b %d<br>%H:%M",
  tickfont: { size: 12 }
},
yaxis: {
  title: 'Price',
  showgrid: true,
  zeroline: false,
  tickfont: { size: 12 }
},
legend: {
  x: 0,
  y: 1.15,
  orientation: 'h',
  font: { size: 14 }
},
margin: { t: 80, l: 50, r: 30, b: 80 },
plot_bgcolor: "#fafafa",
paper_bgcolor: "#ffffff",
hovermode: 'x unified',
dragmode: false // <--- disables drag zoom & pan
      };

      const config = {
responsive: true,
displayModeBar: true,
displaylogo: false,
modeBarButtonsToRemove: [
  'zoom2d',
  'pan2d',
  'select2d',
  'lasso2d',
  'zoomIn2d',
  'zoomOut2d',
  'autoScale2d',
  'resetScale2d'
],
scrollZoom: false
      };

      Plotly.newPlot('chart', [traceBuy, traceSell], layout, config);
      </script>
      <div id="volumeChart" style="width:100%;max-width:800px;height:400px;margin-top:40px;"></div>
      <script>
// Volume chart
const buyVolumes = ${JSON.stringify(data.map(row => row.buy_volume || 0))};
const sellVolumes = ${JSON.stringify(data.map(row => row.sell_volume || 0))};

const traceBuyVol = {
  x: ${JSON.stringify(datetimes)},
  y: buyVolumes,
  type: 'scatter',
  mode: 'lines',
  name: 'Buy Volume',
  line: { color: '#2ca02c', width: 2 },
  marker: { size: 6 }
};

const traceSellVol = {
  x: ${JSON.stringify(datetimes)},
  y: sellVolumes,
  type: 'scatter',
  mode: 'lines',
  name: 'Sell Volume',
  line: { color: '#d62728', width: 2 },
  marker: { size: 6 }
};

const layoutVol = {
  title: 'Buy/Sell Volume History',
  xaxis: {
    title: 'Date & Time',
    type: 'date',
    showgrid: true,
    tickangle: -45,
    tickformat: "%b %d<br>%H:%M",
    tickfont: { size: 12 }
  },
  yaxis: {
    title: 'Volume',
    showgrid: true,
    zeroline: false,
    tickfont: { size: 12 }
  },
  legend: {
    x: 0,
    y: 1.15,
    orientation: 'h',
    font: { size: 14 }
  },
  margin: { t: 80, l: 50, r: 30, b: 80 },
  plot_bgcolor: "#fafafa",
  paper_bgcolor: "#ffffff",
  hovermode: 'x unified',
  dragmode: false
};

Plotly.newPlot('volumeChart', [traceBuyVol, traceSellVol], layoutVol, config);
      </script>
      <a class="homeButton" href="/">🏠</a>
      </body>
      </html>
`;
      }
    })
    .catch(err => {
      console.error('Error fetching data:', err);``
      res = `<p>Error loading product data.</p>`;
    });

  return res + chartScript;
}
function formatDateTime(dateInput, timeStr) {
  const date = new Date(dateInput);

  if (isNaN(date.getTime())) {
    console.warn('Invalid date:', dateInput);
    return null;
  }

  if (typeof timeStr === 'string') {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    date.setHours(hours || 0, minutes || 0, seconds || 0, 0);
  } else {
    // Fallback: set to midnight
    date.setHours(0, 0, 0, 0);
  }

  return date.toISOString(); // ex: "2025-01-23T07:41:11.000Z"
}

//TODO FIX ITEMS WHO DON'T SELL ON THE BAZAAR AND FIX ITEMS WHO CRAFT INTO MORE THAN 1 PRODUCT

 function getCraftingItemDiv(productID){
  let product = allBzProductData[productID];
  let div = `<div id="${product.name}" class="output" onclick="window.location.href='/product/${encodeURIComponent(product.name)}'">${ returnCraftingProductHtml(productID,product)}</div>`;
  return div;
}

function getProductCraftingCost(recipe){
  let totalCost = 0;
  if (!recipe) return 0;
  for (const ingredient in recipe) {
    const quantity = recipe[ingredient];
    const product = allBzProductData[ingredient];
    if (product && !isNaN(product.buy_price)) {
      totalCost += product.sell_price * quantity;
    }
  }
  return totalCost;
}

function getCraftingProductVolume(recipe){
  let minVolume = Infinity;
  if (!recipe) return 0;
  for (const ingredient in recipe) {
    const quantity = recipe[ingredient];
    const product = allBzProductData[ingredient];
    if (product && !isNaN(product.one_hour_instasells)) {
      const possible = product.one_hour_instasells / quantity;
      console.log(`Ingredient: ${ingredient}, Quantity needed: ${quantity}, One-hour instasells: ${product.one_hour_instasells}, Possible crafts: ${possible}`);
      if (possible < minVolume) minVolume = possible;
    } else {
      console.log(`Ingredient: ${ingredient} is missing or has invalid instasell data.`);
      return 0;
    }
  }
  return Math.floor(minVolume);
}

 function returnCraftingProductHtml(productID,product){
      let recipe = crafting.getRecipeIngredients(productID);
      let craftingCost = getProductCraftingCost(recipe);
      let profit = product.buy_price - craftingCost;
      let oneHourCrafts = getCraftingProductVolume(recipe);
      oneHourCrafts = oneHourCrafts <= product.one_hour_instasells ? oneHourCrafts : product.one_hour_instabuys.toFixed(0);
      console.log(oneHourCrafts)
      // Apply tax the same way as in Product class: margin = (buy_price - craftingCost) - tax * buy_price
      let margin = (product.buy_price - craftingCost) - (typeof tax === 'number' ? tax : 0) * product.buy_price;
      let coinsPerHour = oneHourCrafts * margin;
      html= `<img  loading="lazy" src="${product.img}" alt="img of ${product.name}">
          <p class="productName">${product.name.toLowerCase().replace(/_/g, ' ').replace(/enchantment/gi, '')}</p>
          <p>Buy Price: ${product.buy_price.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')} coins<br>
          One-Hour Instabuys: ${product.one_hour_instabuys.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')}<br>
          Crafting Cost: ${craftingCost.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')}<br>
          One-Hour Crafts: ${oneHourCrafts}<br>
          Profit: ${profit.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')} coins <br>
          Coins per Hour: ${coinsPerHour.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')} coins</p>
          ` 
      return html;
}

function getAllCraftingItemDivs() {
  let html = "";
  for (const productID in allBzProductData) {
    const recipe = crafting.getRecipeIngredients(productID);
    if (recipe && Object.keys(recipe).length > 0) {
      html += getCraftingItemDiv(productID);
    }
  }
  return html;
}