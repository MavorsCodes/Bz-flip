const fs = require("fs");
const path = require("path");
const allItems = JSON.parse(
    fs.readFileSync(
        path.join("InternalNameMappings.json"),
        "utf8"
    )
);

function getForgeItems(){
    let forgeItems = {};
    for (const itemKey in allItems) {
        const item = allItems[itemKey];
        if (item?.forge) {
            forgeItems[itemKey] = item;
        }
    }
    return forgeItems;
}

function writeForgeItemsToJson() {
    const forgeItems = getForgeItems();
    fs.writeFileSync(
        path.join("ForgeItems.json"),
        JSON.stringify(forgeItems, null, 2),
        "utf8"
    );
}

writeForgeItemsToJson()