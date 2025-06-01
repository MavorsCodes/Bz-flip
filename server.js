const fs = require("fs");
const http = require('http');
const path = require('path');
const url = require('url');
const mysql = require('mysql');
const db = require ('./db.js');

const port = 3000;
const API_KEY = "LUKO E' UNA PUTTANA";


const API_ADDRESSES = {
    AUCTIONS: "https://api.hypixel.net/v2/skyblock/auctions",
    BAZAAR: "https://api.hypixel.net/v2/skyblock/bazaar",
    MAYOR: "https://api.hypixel.net/v2/resources/skyblock/election"
};

const FILE_PATHS = {
    AUCTIONS: "JSON/auctions.json",
    BAZAAR: "JSON/bazaar.json",
    ALL_PRODUCTS : "JSON/allproducts.json"
}

const IMG_PATHS = { 
  "RECOMBOBULATOR_3000": "ASSETS/PRODUCTS/recomb.png",

  "GOLD_INGOT" : "ASSETS/PRODUCTS/gold_ingot.png",
  "ENCHANTED_GOLD" : "ASSETS/PRODUCTS/gold_ingot.png",

  "BOOSTER_COOKIE": "ASSETS/PRODUCTS/cookie.png",

  "ENCHANTMENT_ULTIMATE_WISE_1": "ASSETS/PRODUCTS/enchanted_book.png",
  "ENCHANTMENT_ULTIMATE_WISE_2": "ASSETS/PRODUCTS/enchanted_book.png",
  "ENCHANTMENT_ULTIMATE_WISE_3": "ASSETS/PRODUCTS/enchanted_book.png",
  "ENCHANTMENT_ULTIMATE_WISE_4": "ASSETS/PRODUCTS/enchanted_book.png",
  "ENCHANTMENT_ULTIMATE_WISE_5": "ASSETS/PRODUCTS/enchanted_book.png",

  "KISMET_FEATHER": "ASSETS/PRODUCTS/feather.png",
}

class Product{
  constructor(name,buy_price,one_hour_instabuys,sell_price,one_hour_instasells){
    this.name = name;
    if (IMG_PATHS[name] != null) {
      this.img = `/images/${path.basename(IMG_PATHS[name])}`;
    } else {
      this.img = `/images/WIP.png`;
    }
    this.buy_price = buy_price;
    this.one_hour_instabuys = one_hour_instabuys;
    this.sell_price = sell_price;
    this.one_hour_instasells = one_hour_instasells;
    let tax = Mayor?.mayor?.name != "Derpy" ? (buy_price * 0.01125) : (buy_price * 0.01125 * 4);
    this.margin = (buy_price - sell_price) - tax ;
    if(one_hour_instabuys < one_hour_instasells)
      this.coins_per_hour = this.margin * one_hour_instabuys;
    else
      this.coins_per_hour = this.margin * one_hour_instasells;
  }
  loadImage(imgPath) {
    try {
      const data = fs.readFileSync(imgPath);
      return `data:image/jpeg;base64,${data.toString('base64')}`;
    } catch (err) {
      console.error('Error loading image:', err);
      return null; 
    }
  }
  getPlaceholderImage() {
    try {
      const placeholderPath = "ASSETS/PRODUCTS/WIP.png";
      const data = fs.readFileSync(placeholderPath);
      return `data:image/jpeg;base64,${data.toString('base64')}`;
    } catch (err) {
      console.error('Error loading placeholder image:', err);
      return null;
    }
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
var cachedResponse = null; // Cache for the homepage response
var isWritingBazaarJSON = false;


const server = http.createServer((req, res) => {
      if (req.url.startsWith('/images/')) {
      const imgPath = path.join(__dirname, 'ASSETS', 'PRODUCTS', req.url.replace('/images/', ''));
      fs.readFile(imgPath, (err, data) => {
        if (err) {
          res.writeHead(404);
          return res.end();
        }
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(data);
      });
      return;
    }
    else if (req.url.startsWith('/homepage') && req.method === 'GET') {
        if(cachedResponse != null) response = getHomeProductPage();
        else response = HTMLSearchedPage({ product: "" });
        res.setHeader('Content-Type', 'text/html');
        res.end(response);
    }
    
    else if (req.url.startsWith('/search') && req.method === 'GET') {
      if (!allBzProductData || !Array.isArray(allBzProductData) || allBzProductData.length === 0) {
        res.setHeader('Content-Type', 'text/html');
        res.end('<h1>Bazaar data is still loading. Please wait a bit before trying to search again.</h1>');
      } else {
        const parsedUrl = url.parse(req.url, true);
        const queryParams = parsedUrl.query;
        const response = HTMLSearchedPage(queryParams);
        res.setHeader('Content-Type', 'text/html');
        res.end(response);
      }
    }
    else if (req.url.startsWith('/update') && req.method === 'POST') {
        if (!allBzProductData || !Array.isArray(allBzProductData) || allBzProductData.length === 0) {
          res.setHeader('Content-Type', 'text/html');
          res.end('<h1>Bazaar data is still loading. Please wait a bit before trying to search again.</h1>');
        } else {
            let body = '';
            req.on('data', chunk => {
            body += chunk;
            });
            req.on('end', () => {
            let queryParams;
            try {
              queryParams = JSON.parse(body);
            } catch (e) {
              queryParams = {};
            }
            const response = updateVisibleProducts(queryParams);
            res.setHeader('Content-Type', 'text/html');
            res.end(response);
            });
            return;
        }
    }
      else if (req.url === '/favicon.ico' && req.method === 'GET') {
    const iconPath = path.join(__dirname, 'ASSETS', 'favicon.ico');
    fs.readFile(iconPath, (err, icon) => {
      if (err) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'image/x-icon' });
      res.end(icon);
    });
  }
    else {

    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';

    const extname = path.extname(filePath);
    let contentType = 'text/html';

    switch (extname) {
      case '.js':
        contentType = 'text/javascript';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
        contentType = 'image/jpg';
        break;
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code == 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end('<h1>404 Not Found</h1>', 'utf-8');
        } else {
          res.writeHead(500);
          res.end(`Server Error: ${err.code}`, 'utf-8');
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  }
});

server.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}/`);
  await getMayor();
  await loadInitialData();
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
    cachedResponse =  HTMLSearchedPage({
    address: 'BAZAAR',
    product: "",
    treshholdsells: 0,
    treshholdbuys: 0,
    min_coins_per_hour: 0,
    min_margin:0,
    min_coins_per_hour: 0,
    show_only_profit: "true",//TODO WTF IS THIS OMG CHANGE THIS SO IT TAKES A BOOLEAN AND NOT A STRING
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

    setInterval(async () => {
      try {
        //writeallBzToDb(); TODO implement this
      } catch (error) {
        console.error("Error in writing bz data to db", error);
      }
    },60 * 1000);
}
async function getMayor() {
  Mayor = await fetchApi("MAYOR");
  console.log(`The current Mayor is ${Mayor.mayor.name}`)
}
function bzDataToProduct(product){
   if (product in bzData.products){
    return new Product(bzData.products[product].product_id,bzData.products[product].buy_summary[0]?.pricePerUnit || 0,(bzData.products[product].quick_status.buyMovingWeek/7)/24,bzData.products[product].sell_summary[0]?.pricePerUnit || 0,(bzData.products[product].quick_status.sellMovingWeek/7)/24);
   } 
   return null;
}

function allBzDataToProduct(){
  readingBzData = true;
  allBzProductData = [];
  for(product in bzData.products){
    allBzProductData.push(bzDataToProduct(product));
  }
  readingBzData = false;
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
    console.log("json file written correctly");
    });
}

async function fileToJson(filepath) {
  try {
    const data = await fs.promises.readFile(filepath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading or parsing JSON file at ${filepath}:`, err);
    return null;
  }
}
  
function writeAllProductsToJson(){
    let allProducts = [];
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
 for(let i = 0; i < allBzProductData.length; i++){
    db.addHistoricData(allBzProductData[i].name,allBzProductData[i].sell_price,allBzProductData[i].buy_price,new Date().toISOString().slice(0, 19).replace('T', ' '),allBzProductData[i].one_hour_instasells,allBzProductData[i].one_hour_instabuys,new Date().toISOString().slice(11, 19));
  }
}

function returnProductHtml(product){
    return `<img src="${product.img}" alt="img of ${product.name}">
          <p><b>${product.name.toLowerCase().replace(/_/g, ' ').replace(/enchantment/gi, '')}</b> <br><br>
          Buy Price: ${product.buy_price.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')} coins <br>
          One-Hour Instabuys: ${product.one_hour_instabuys.toFixed(1)}<br>
          Sell Price: ${product.sell_price.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')} coins<br>
          One-Hour Instasells: ${product.one_hour_instasells.toFixed(1)}<br>
          Margin: ${product.margin.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')} coins <br>
          Coins per Hour ${product.coins_per_hour.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')} coins</p>
          ` 
}
    /* STRUCTURE OF QUERY PARAMS
    address ='BAZAAR'
    min_coins_per_hour ='0'
    min_margin ='0'
    product ='ANCIENT CLAW'
    treshholdbuys ='0'
    treshholdsells ='0'
    show_only_profit = "true"*/
function bzSearch(queryParams){//TODO ADD MORE FILTERING AND SORTING OPTIONS
  if (!allBzProductData || !Array.isArray(allBzProductData)) return [];

  // Convert queryParams to object if it's a string (for backward compatibility)
  let params = typeof queryParams === "string" ? { product: queryParams } : queryParams;
  let filteredProducts = allBzProductData.filter(product => {
    if (!product) return false;
    if(product.one_hour_instabuys < params.treshholdbuys) return false;
    if(product.one_hour_instasells < params.treshholdsells) return false;
    if(product.coins_per_hour < params.min_coins_per_hour) return false;
    if(product.coins_per_hour <= 1 && params.show_only_profit == "true") return false

    if(!normalize(product.name).includes(normalize(params.product))) return false;
    return true;
  });

  return sortProducts(filteredProducts);
}

function sortProducts(filteredProducts){
  return filteredProducts.sort((a, b) => b.coins_per_hour - a.coins_per_hour);
}
function createProductDiv(product) {
  return `<div id="${ product.name}" class="output">${returnProductHtml(product)}</div>`;
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
  if(cachedResponse == null){
    return "<h1>Seems the server just woke up! Give it some time for coffe!<h1>"
  }
  return createProductDivs(queryParams);
}

function getHomeProductPage(){
  return cachedResponse;
}

function updateVisibleProducts(queryParams) {
  let currentProducts = [];
  if (queryParams && Array.isArray(queryParams.products)) {
    for (const id of queryParams.products) {
      const product = allBzProductData.find(p => p && p.name === id);
      if (product) currentProducts.push(product);
    }
  }
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