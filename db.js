const mysql = require('mysql2');

const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "admin",
  database: "bazaar"
});

function connectToDb(){
  con.connect(function(err) {
    if (err) throw err;
    console.log("Connected to database!");
  });
}

function addHistoricData(product,sell,buy,date,sell_volume,buy_volume,hour){
  let sql = `INSERT INTO h_data (product, sell, buy, date, sell_volume, buy_volume,hour) 
  VALUES (?, ?, ?, ?, ?, ?, ?)`;
  con.query(sql, [product, sell, buy, date, sell_volume, buy_volume, hour], (err, results) => {
    if (err){
      console.error("Data not added for:", product);
      throw err; 
    } 
  });
}

async function addProduct(id,name){
  if(await productExists(id)) return;
  let sql = `INSERT INTO product (id,name) VALUES (?,?)`;
  con.query(sql, [id, name], (err, results) => {
    if (err){
      console.error("Product not added for:", product);
      throw err; 
    } 
  });
}                             

function getHistoricData(product, minDate = null) {
  return new Promise((resolve, reject) => {
    let sql = `SELECT * 
               FROM h_data
               JOIN product ON product.id = h_data.product 
               WHERE product.id = ?`;
    let queryParams = [product];
    if (minDate) {
      sql += ` AND h_data.date >= ?`;
      queryParams.push(minDate); 
    }
    con.query(sql, queryParams, (err, results) => {
      if (err) {
        reject(err); 
        return;
      }
      if (results.length === 0) {
        resolve("No data found");
        return;
      }
      resolve(results);
    });
  });
}

function getProduct(id){
  let sql = `SELECT * FROM product WHERE id = ?`;
  return new Promise((resolve, reject) => { 
    con.query(sql, [id], (err, results) => {
    if (err) reject(err);
    resolve(results);
    return;
    });
  });

}

function productExists(id){
  const checkQuery =  `SELECT COUNT(*) AS count FROM product WHERE id = ? `
  return new Promise((resolve, reject) => {
    con.query(checkQuery, [id], (err, results) => {
      if (err) {
        console.log("Error in productExists:", err);
        reject(err); 
        return;
      }
      resolve(results[0].count > 0);
      return;
  });
  });
}

async function debuggingOnly() {
  try {
    const data = await getHistoricData("Enchanted_gold", "2023-10-01");
    console.log(data);
  } catch (err) {
    console.error('Error:', err);
  }
}

module.exports = { 
  connectToDb,
  addHistoricData, 
  addProduct, 
  getHistoricData, 
  getProduct, 
  productExists,
  debuggingOnly 
};