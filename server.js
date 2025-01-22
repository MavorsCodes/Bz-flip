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

var bzData;
var ahData;
var allBzProductData;
var Mayor;
var updating = true;
var fetchAllProducts = true;
var populatedb = true;
var callDelay = 3 * 1000;



const server = http.createServer((req, res) => {
    if (req.url.startsWith('/data') && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(allBzProductData)); 
    }
    else if (req.url.startsWith('/search') && req.method === 'GET') {
      const parsedUrl = url.parse(req.url, true);
      const queryParams = parsedUrl.query;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(bzSearch(queryParams.product))); 
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

server.listen(port,() => {
  console.log(`Server running at http://localhost:${port}/`);
  getMayor();
  db.connectToDb();
  
  bzData = fileToJson(FILE_PATHS["BAZAAR"]);
  ahData = fileToJson(FILE_PATHS["AUCTIONS"]);
  allBzDataToProduct();
  if(updating) startPeriodicTasks();
  if(fetchAllProducts) getAllBzProducts();
  if(populatedb) populateBzDb();
  writeallBzToDb();
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
    }, callDelay);

    setInterval(async () => {
      try {
        await getMayor();
      } catch (error) {
        console.error("Error in fetching mayor data", error);
      }
    }, 24 * 60 * 60 * 1000);

    setInterval(async () => {
      try {
        writeallBzToDb();
      } catch (error) {
        console.error("Error in writing bz data to db", error);
      }
    },3600 * 1000);
}
async function getMayor() {
  Mayor = await fetchApi("MAYOR");
  console.log(`The current Mayor is ${Mayor.mayor.name}`)
}
function bzDataToProduct(product){
   if (product in bzData.products){
    return new Product(bzData.products[product].product_id,bzData.products[product].buy_summary[0]?.pricePerUnit || 0,(bzData.products[product].quick_status.buyMovingWeek/7)/24,bzData.products[product].sell_summary[0]?.pricePerUnit || 0,(bzData.products[product].quick_status.sellMovingWeek/7)/24);
   } 
   return "COULDN'T FIND THE PRODUCT YOU'RE LOOKING FOR";
}

function bzSearch(product){
  let product_ids = Object.keys(bzData.products).filter(product_id =>{
    const transformedElement = product.replace(/\s+/g, '_').toUpperCase();
    return product_id.includes(transformedElement);
  });
  let data = []
  for(product in product_ids){
    data.push(bzDataToProduct(product_ids[product]));
  }
  return data;
}

function allBzDataToProduct(){
  allBzProductData = [];
  for(product in bzData.products){
    allBzProductData.push(bzDataToProduct(product));
  }
}

async function fetchBzData(){
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

function fileToJson(filepath) {
    try {
      const data = fs.readFileSync(filepath, 'utf8'); 
      return JSON.parse(data); 
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