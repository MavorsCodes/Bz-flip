const getImages = require('./getimages');
const hypixelItems = require('./gethypixelitems');
const join = require('./join');
const fs = require("fs");
const path = require("path");
const { http, https } = require('follow-redirects');

// Read joined.json, download each image, and save to /ASSETS/PRODUCTS
const joinedPath = path.join(__dirname, 'joined.json');
const productsDir = path.join('./ASSETS', 'PRODUCTS');

module.exports = {
  updateAndSave
};

// Ensure PRODUCTS directory exists
if (!fs.existsSync(productsDir)) {
    fs.mkdirSync(productsDir, { recursive: true });
}

function downloadImage(url, dest) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;

        mod.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
                return;
            }

            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', reject);
    });
}

async function saveAllImages() {
    const { default: pLimit } = await import('p-limit');
    const limit = pLimit(1);
    const data = JSON.parse(fs.readFileSync(joinedPath, 'utf8'));

    const tasks = Object.entries(data).map(([id, image]) => {
        if (!image) {
            console.warn(`Skipping ${id}: No image URL`);
            return;
        }

        const safeFileName = id.replace(/[^a-zA-Z0-9-_]/g, "_") + ".png";
        const dest = path.join(productsDir, safeFileName);

        return limit(async () => {
            if (fs.existsSync(dest)) {
                return;
            }
            try {
                await downloadImage(image, dest);
                console.log(`Saved: ${safeFileName}`);
            } catch (err) {
                console.error(`Error saving ${id} (${image}):`, err.message);
            }
        });
    });

    await Promise.allSettled(tasks);
    console.log("All images processed.");
}

async function saveAllSkins() {
    const { default: pLimit } = await import('p-limit');
    const limit = pLimit(1);
    const data = JSON.parse(fs.readFileSync(joinedPath, 'utf8'));

    if (!fs.existsSync(productsDir)) {
        fs.mkdirSync(productsDir, { recursive: true });
    }

    const tasks = Object.entries(data).map(([id, skinUrl]) => {
        if (!skinUrl) {
            console.warn(`Skipping ${id}: No skin URL`);
            return;
        }

        const safeFileName = id.replace(/[^a-zA-Z0-9-_]/g, "_") + ".png";
        const dest = path.join(productsDir, safeFileName);

        return limit(async () => {
            if (fs.existsSync(dest)) {
                return;
            }
            try {
                await downloadImage(skinUrl, dest);
                console.log(`Saved skin: ${safeFileName}`);
            } catch (err) {
                console.error(`Error saving skin for ${id} (${skinUrl}):`, err.message);
            }
        });
    });

    await Promise.allSettled(tasks);
    console.log("All skins processed.");
}

async function updateAndSave() {
    await updateJoined(); // updates JSON
    await Promise.all([
        saveAllSkins(),
        saveAllImages()
    ]);
}

async function updateJoined() {
    //await getImages.imgs();
    //await hypixelItems.items();
    await join.join();
}
updateAndSave();