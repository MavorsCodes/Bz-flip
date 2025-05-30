const fs = require("fs");
const http = require('http');
const path = require('path');
const url = require('url');
const mysql = require('mysql');
const db = require ('./db.js');
const { create } = require("domain");

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
      this.img = this.loadImage(IMG_PATHS[name]);
    } else {
      this.img = this.getPlaceholderImage();
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
var updating = true;
var fetchAllProducts = true;
var populatedb = false;
var callDelay = 3 * 1000;
var readingBzData = false;//binary semaphore to avoid reading bz data while it is being written



const server = http.createServer((req, res) => {
    if (req.url.startsWith('/homepage') && req.method === 'GET') {
      response = HomeProductPage();
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

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  getMayor();
  //db.connectToDb(); TODO fix this
  
  bzData = fileToJson(FILE_PATHS["BAZAAR"]);
  ahData = fileToJson(FILE_PATHS["AUCTIONS"]);
  allBzDataToProduct();
  if(updating) startPeriodicTasks();
  if(fetchAllProducts) getAllBzProducts();
  if(populatedb) populateBzDb();
  //writeallBzToDb(); TODO fix this
});

function startPeriodicTasks() {

    setInterval(async () => {
        try {
          await fetchAhData();
        } catch (error) {
          console.error("Error in fetching ah data", error);
        }
    }, callDelay);

    setInterval(async () => {
        try {
          await fetchBzData();
        } catch (error) {
          console.error("Error in fetching bz data", error);
        }
    }, callDelay);

    setInterval(async () => {
      try {
        allBzDataToProduct();
      } catch (error) {
        console.error("Error in writing bz data", error);
      }
    }, callDelay * 2);

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

async function fetchBzData(){
    while(readingBzData);
    bzData = await fetchApi("BAZAAR");
    jsonToFile(FILE_PATHS["BAZAAR"],JSON.stringify(bzData));
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
      const data =  fs.readFileSync(filepath, 'utf8'); 
      return await JSON.parse(data); 
    } catch (err) {
      console.error(`Error reading or parsing JSON file at ${filepath}:`, err);
      return null; 
    }
  }
  
function getAllBzProducts(){
    let allProducts = [];
    for (product in bzData.products){
        allProducts.push(bzData.products[product].product_id);
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

function bzSearch(queryParams){//TODO FIX FILTERING
  if (!queryParams) return sortProducts([...allBzProductData]);
  if (!allBzProductData || !Array.isArray(allBzProductData)) return [];

  // Convert queryParams to object if it's a string (for backward compatibility)
  let params = typeof queryParams === "string" ? { product: queryParams } : queryParams;

  let filteredProducts = allBzProductData.filter(product => {
    if (!product || !product.name || !product.name.toLowerCase().includes(params.product?.toLowerCase() || "")) return false;

    // Filter by product name (partial match, case-insensitive)
    if (params.product && !product.name.toLowerCase().includes(params.product.toLowerCase())) {
      return false;
    }

    // Filter by minCoinsPerHour if provided
    if (params.minCoinsPerHour && product.coins_per_hour < Number(params.minCoinsPerHour)) {
      return false;
    }

    // Filter by maxCoinsPerHour if provided
    if (params.maxCoinsPerHour && product.coins_per_hour > Number(params.maxCoinsPerHour)) {
      return false;
    }

    // Add more filters as needed (e.g., minMargin, maxMargin, etc.)
    if (params.minMargin && product.margin < Number(params.minMargin)) {
      return false;
    }
    if (product.one_hour_instabuys < Number(params.treshholdbuys)) {
      return false;
    }

    return true;
  });

  return  sortProducts(filteredProducts);
}
function sortProducts(filteredProducts){
  return filteredProducts.sort((a, b) => b.coins_per_hour - a.coins_per_hour);
}
function createProductDiv(product) {
  return `<div id="${ product.name}" class="output">${returnProductHtml(product)}</div>`;
}

function createProductDivs(queryParams) {
  let productDivs = "";
  let products = bzSearch(queryParams.product);
  if (!products || products.length === 0) {
    return `<h1>No products found</h1>`;
  }
  for (let i = 0; i < products.length; i++) {
    productDivs += createProductDiv(products[i]);
  }
  return productDivs;
}

function HTMLSearchedPage(queryParams){
  return createProductDivs(queryParams);
}

function HomeProductPage(){
  return HTMLSearchedPage({ product: "" });
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