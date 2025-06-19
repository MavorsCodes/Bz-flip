const path = require("path");

//port the server listens to
const port = 49116;


//api key, doesn't need one in current state. bazaar API calls don't need keys
const API_KEY = "LUKO E' UNA PUTTANA";


//all Hypixel API addresses
const API_ADDRESSES = {
  AUCTIONS: "https://api.hypixel.net/v2/skyblock/auctions",
  BAZAAR: "https://api.hypixel.net/v2/skyblock/bazaar",
  MAYOR: "https://api.hypixel.net/v2/resources/skyblock/election",
};

//Paths for different things in the program
const FILE_PATHS = {
  AUCTIONS: path.join(__dirname, "JSON", "auctions.json"),//path to save auctions Hypixel API respoonse json
  BAZAAR: path.join(__dirname, "JSON", "bazaar.json"),//path for bazaar json Hypixel API respoonse json
  ALL_PRODUCTS: path.join(__dirname, "JSON", "allproducts.json"),//path for all products as a Product class objects
};

//do Update the data from the auction and bazaar Hypixel API, auction currently is not tracked by the app
const updating = true;

//do write all Products to the json files of Product class objects
const fetchAllProducts = true;

//do send data to the DB when updating it
const populatedb = false;

//call delay for different periodic functions inside the server TODO divide this into different call times
const callDelay = 3 * 1000;


//image directory path
const imageDir = path.join(__dirname, "ASSETS", "PRODUCTS");

//maximum amount of workers allowed in the workerPool
const maxWorkers = 2;

module.exports = {
    port,
    API_KEY,
    API_ADDRESSES,
    FILE_PATHS,
    updating,
    fetchAllProducts,
    populatedb,
    callDelay,
    imageDir,
    maxWorkers
};