const fs = require("fs");
const path = require("path");

/**
 * Module for joining item and image data.
 * Exports: join, fileToJson, jsonToFile
 */

module.exports = {
    join,
    fileToJson,
    jsonToFile
};

// Modified join function to handle 'skin' property
async function join() {
    const itemsPath = path.join(__dirname, "items.json");
    const imgsPath = path.join(__dirname, "imgs.json");

    const items = await fileToJson(itemsPath);
    const imgs = await fileToJson(imgsPath);

    if (!items || !imgs) {
        console.error("Could not read one or both files.");
        return;
    }

    // Create a map: namespaceId => image
    const imgMap = new Map(imgs.map(entry => [entry.namespaceId, entry.image]));

    // Join logic with skin override
    const joined = {};
    items.forEach(item => {
        if (item.skin) {
            joined[item.id] = item.skin;
        } else if (imgMap.has(item.material)) {
            let imgUrl = imgMap.get(item.material);
            if (typeof imgUrl === "string" && imgUrl.startsWith("https://")) {
                imgUrl = "http://" + imgUrl.slice(8);
            }
            joined[item.id] = imgUrl;
        }
    });

    const outputPath = path.join(__dirname, "joined.json");
    jsonToFile(outputPath, JSON.stringify(joined, null, 2));
}

// --- Utilities (you already have) ---

async function fileToJson(filepath) {
    try {
        const data = await fs.promises.readFile(filepath, "utf8");
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading or parsing file at ${filepath}:`, err);
        return null;
    }
}

function jsonToFile(filepath, data) {
    fs.writeFile(filepath, data, (error) => {
        if (error) {
            console.error("Write error:", error);
            throw error;
        }
        console.log("Joined JSON written successfully to", filepath);
    });
}
