const fs = require("fs");
const path = require("path");
module.exports = {
    items,
    fileToJson,
    sanitizeItems,
    jsonToFile,
    fetchApi
};
 async function items() {
    let data = await fetchApi("https://api.hypixel.net/v2/resources/skyblock/items");
    if (data) {
        data = sanitizeItems(data);
        const filePath = path.join(__dirname, "items.json");
        jsonToFile(filePath, JSON.stringify(data));
    } else {
        console.error("Failed to fetch data, not writing file.");
    }
}

async function fetchApi(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error("Error during data fetch:", error);
        return null;
    }
}

function jsonToFile(filepath, data) {
    fs.writeFile(filepath, data, (error) => {
        if (error) {
            console.error("Write error:", error);
            throw error;
        }
        console.log("JSON file written successfully.");
    });
}

async function fileToJson(filepath) {
    try {
        const data = await fs.promises.readFile(filepath, "utf8");
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading or parsing file at ${filepath}:`, err);
        return null;
    }
}

function sanitizeItems(data) {
    if (!data || !Array.isArray(data.items)) {
        console.error("Invalid data format");
        return [];
    }

    return data.items
        .filter(item => item.id && item.material) // Ensure required fields exist
        .map(item => {
            const sanitized = {
                id: item.id,
                material: item.material
            };
            if (item.skin) {
                sanitized.skin = decodeSkinData(item.skin.value);
            }
            return sanitized;
        });
}

function decodeSkinData(data){
    if (typeof data !== "string") return null;
    // Replace \u003d with =
    let skinDataBase64 = data.replace(/\\u003d/g, "=").replace(/\u003d/g, "=");
    // Base64 decode
    let jsonString;
    try {
        jsonString = Buffer.from(skinDataBase64, "base64").toString("utf8");
    } catch (e) {
        console.error("Base64 decode error:", e);
        return null;
    }
    // Parse JSON
    let parsed;
    try {
        parsed = JSON.parse(jsonString);
    } catch (e) {
        console.error("JSON parse error:", e);
        return null;
    }
    // Get textures > SKIN > url
    const url = parsed?.textures?.SKIN?.url;
    if (!url) return null;
    // Get the hash from the URL
    const skinHash = url.substring(url.lastIndexOf("/") + 1);
    // Return the mc-heads.net URL
    return `https://mc-heads.net/head/${skinHash}`;
}