const fs = require("fs");
const path = require("path");

module.exports = {
    imgs,
    sanitizeImages,
    fetchApi,
    jsonToFile,
    fileToJson
};
 async function imgs() {
    let data = await fetchApi("https://minecraft-api.vercel.app/api/items");

    if (data) {
        data = sanitizeImages(data);
        const filePath = path.join(__dirname, "imgs.json");
        jsonToFile(filePath, JSON.stringify(data));
    } else {
        console.error("Failed to fetch image data, not writing file.");
    }
}

function sanitizeImages(data) {
    if (!data || !Array.isArray(data)) {
        console.error("Invalid data format");
        return [];
    }

    return data
        .filter(item => item.namespacedId && item.image) // Only keep items with both
        .map(item => ({
            namespaceId: item.namespacedId.toUpperCase(),
            image: item.image
        }));
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