var instabuysRange = 0;
var instasellsRange = 0;
var maxbuyRange = 0;
var mincoinsRange = 0;
var show_only_profit = true;
var sortby = "coinsPerHour";
var isAwaitingRefresh = false;
let remainingHTML = ""; // <-- NEW: stores leftover HTML for scroll
var updateType;
const ITEMS_PER_CHUNK = 24;

const bindings = [
  { range: "instabuysRange", text: "instabuysText" },
  { range: "instasellsRange", text: "instasellsText" },
  { range: "maxbuyRange", text: "maxbuyText" },
  { range: "mincoinsRange", text: "mincoinsText" },
];

document.addEventListener("DOMContentLoaded", () => {
  allPageSetup();
  setupScrollListener(); // <-- NEW
});

function allPageSetup() {
  startPeriodicUpdates(10 * 1000);
  setupUI();
  getNavData('/homepage')
}

function editOutputs(editedHtml) {
  document.getElementById("outputs").innerHTML = editedHtml;
}

document.getElementById("searchIcon").addEventListener("click", () => {
  isAwaitingRefresh = false;
  updateType = '/search';
  updateSearchParams();
  const params = new URLSearchParams({
    address: "BAZAAR",
    product: document.getElementById("search").value,
    treshholdsells: instasellsRange,
    treshholdbuys: instabuysRange,
    min_coins_per_hour: mincoinsRange,
    maxbuyRange: maxbuyRange,
    show_only_profit: show_only_profit,
    sortby: sortby,
  });
  fetch(`/search?${params.toString()}`, { method: "GET" })
    .then((response) => response.text())
    .then((html) => {
      const outputsDiv = document.getElementById("outputs");
      if (outputsDiv) outputsDiv.classList.remove("homeoutputs");
      document.querySelectorAll(".homeoutputs, .bestheader").forEach(el => {
        if (el !== outputsDiv) el.remove();
      });
        infinityScroll(html);
    })
    .catch((error) => console.error("Error:", error));
});

function getNavData(url) {
  updateType = url;
  remainingHTML = '';
  fetch(url, { method: "GET" })
    .then((response) => response.text())
    .then((html) => {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      if(url == '/homepage'){
        buildHomePage(html);
        const productAmountDiv = document.getElementById("productAmount");
        productAmountDiv.innerHTML = "Showing 9 products"
        return;
      }
      // Remove 'homeoutputs' class from outputs
      const outputsDiv = document.getElementById("outputs");
      if (outputsDiv) outputsDiv.classList.remove("homeoutputs");

      // Remove all other elements with 'homeoutputs' or 'bestheader' class
      document.querySelectorAll(".homeoutputs, .bestheader").forEach(el => {
        if (el !== outputsDiv) el.remove();
      });
      if (tempDiv.children.length === 0) {
        editOutputs(html);
      } else {
        infinityScroll(html);
      }
      console.log(url + " HTML loaded successfully");
    })
    .catch((error) => console.error("Error:", error));
  isAwaitingRefresh = false;
}

function infinityScroll(html) {
  remainingHTML = ""; // Reset scroll cache after search
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  const children = Array.from(tempDiv.children);
  let totalHeight = 0;
  let stackedDivs = 0;
  const productAmountDiv = document.getElementById("productAmount");
  productAmountDiv.innerHTML =
    children[0].nodeName == "DIV"
      ? `Showing ${children.length} products`
      : "Showing 0 products";

  // Count how many divs fit in 1.5x viewport height
  for (const child of children) {
    document.body.appendChild(child); // temp add to measure
    const height = child.getBoundingClientRect().height;
    totalHeight += height;
    if (totalHeight < window.innerHeight * 1.5) {
      stackedDivs++;
    } else {
      child.remove();
      break;
    }
    child.remove();
  }

  // Use 4x that amount for initial render
  const initialCount = Math.min(
    children.length,
    stackedDivs * 4 || ITEMS_PER_CHUNK
  );
  const visibleChildren = children
    .slice(0, initialCount)
    .map((c) => c.outerHTML);
  remainingHTML = children
    .slice(initialCount)
    .map((c) => c.outerHTML)
    .join("");

  editOutputs(visibleChildren.join(""));
}

function appendNextChunk() {
  if (!remainingHTML) {
    console.log(["bro reached the end"]);
    return;
  }

  // Use a temp container to extract elements
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = remainingHTML;
  const children = Array.from(tempDiv.children);

  // Get a fixed number of items
  const chunk = children.slice(0, ITEMS_PER_CHUNK);

  // Append them to the outputs container
  document
    .getElementById("outputs")
    .insertAdjacentHTML(
      "beforeend",
      chunk.map((child) => child.outerHTML).join("")
    );

  // Update remainingHTML
  remainingHTML = children
    .slice(ITEMS_PER_CHUNK)
    .map((child) => child.outerHTML)
    .join("");
}

function setupScrollListener() {
  window.addEventListener("scroll", () => {
    const nearBottom =
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
    if (nearBottom && remainingHTML) {
      appendNextChunk();
    }
  });
}

function startPeriodicUpdates(delay) {
  setInterval(async () => {
    try {
      updateVisibleProducts();
    } catch (error) {
      console.error("Error in fetching ah data", error);
    }
  }, delay);
}

function setupUI() {
  const outputsDiv = document.getElementById("outputs");

  bindings.forEach(({ range, text }) => {
    const rangeEl = document.getElementById(range);
    const textEl = document.getElementById(text);

    textEl.setAttribute("contenteditable", "true");
    textEl.textContent = formatNumber(rangeEl.value);

    rangeEl.addEventListener("input", () => {
      textEl.textContent = formatNumber(rangeEl.value);
    });

    textEl.addEventListener("input", () => {
      const val = parseNumber(textEl.textContent);
      const min = parseFloat(rangeEl.min || 0);
      const max = parseFloat(rangeEl.max || 1000000000);
      if (!isNaN(val) && val >= min && val <= max) {
        rangeEl.value = val;
      }
    });

    textEl.addEventListener("blur", () => {
      validateTextInput(textEl, rangeEl);
    });

    textEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        textEl.blur();
      }
    });

    textEl.addEventListener("blur", () => {
      const val = parseNumber(textEl.textContent);
      textEl.textContent = isNaN(val) ? "Invalid" : formatNumber(val);
    });
  });
}

function updateSearchParams() {
  instabuysRange = document.getElementById(bindings[0].range).value;
  instasellsRange = document.getElementById(bindings[1].range).value;
  maxbuyRange = document.getElementById(bindings[2].range).value;
  mincoinsRange = document.getElementById(bindings[3].range).value;
  show_only_profit = document.getElementById("onlyshowprofit").checked;
  sortby = document.getElementById("sortby").value;
}

function clearProducts() {
  document.getElementById("outputs").replaceChildren();
}

function updateVisibleProducts() {
  isAwaitingRefresh = true;
  const idsArray = getCurrentProducts();
  if (!idsArray.length) return;
  if(updateType == "/search"){
    const params = {
      address: "BAZAAR",
      products: idsArray,
      treshholdsells: instasellsRange,
      treshholdbuys: instabuysRange,
      min_coins_per_hour: mincoinsRange,
      maxbuyRange: maxbuyRange,
      sortby: sortby,
    };
    fetch("/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
      .then((response) => response.text())
      .then((html) => {
        if (isAwaitingRefresh) {
          editOutputs(html);
          isAwaitingRefresh = false;
        }
      })
      .catch((error) => {
        isAwaitingRefresh = false;
        console.error("Error:", error);
      });
  }
  else getNavData(updateType);
}

function getCurrentProducts() {
  const outputsDiv = document.getElementById("outputs");
  const children = Array.from(outputsDiv.children).filter(
    (child) => child.tagName === "DIV"
  );
  return children.map((child) => child.id).filter(Boolean);
}

document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("search");
  const searchIcon = document.getElementById("searchIcon");
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      searchIcon.click();
    }
  });

  fetch("/mayorname")
    .then((response) => response.text())
    .then((name) => {
      document.getElementById("mayorName").textContent = name;
      document.getElementById("mayorImg").src = "/mayors/" + name + ".png";
    })
    .catch((error) => {
      console.error("Error fetching name:", error);
    });
});

function formatNumber(value) {
  if (isNaN(value)) return value;
  const num = parseFloat(value);
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toLocaleString();
}

function parseNumber(formatted) {
  if (typeof formatted !== "string") return formatted;
  let str = formatted.replace(/,/g, "").toUpperCase().trim();
  if (str.endsWith("K")) return parseFloat(str) * 1e3;
  if (str.endsWith("M")) return parseFloat(str) * 1e6;
  if (str.endsWith("B")) return parseFloat(str) * 1e9;
  return parseFloat(str);
}

function validateTextInput(textEl, rangeEl) {
  const raw = textEl.textContent;
  const cleaned = raw.replace(/[^\d.,kKmMbB\-+]/g, "").trim();
  const value = parseNumber(cleaned);
  const min = parseFloat(rangeEl.min || 0);
  const max = parseFloat(rangeEl.max || 1000000000);
  if (isNaN(value)) {
    textEl.textContent = "Invalid";
    return null;
  }
  const clamped = Math.min(Math.max(value, min), max);
  rangeEl.value = clamped;
  textEl.textContent = formatNumber(clamped);
  return clamped;
}

function toggleAdvancedSearch() {
  const advancedSearch = document.getElementById("advancedSearch");
  const button = document.getElementById("toggleButton");
  advancedSearch.classList.toggle("collapsed");
  button.classList.toggle("rotated");
}

function buildHomePage(html) {
  // Create two new divs inside main content
  const mainContent = document.getElementById("mainContent");
  if (!mainContent) return;

  // Remove existing outputs1/outputs2 if present
  ["outputs1", "outputs2"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  // Remove existing headers if present
  ["bestFlipsHeader", "bestCraftingHeader", "bestForgingHeader"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  // Create headers with bestheader class
  const bestFlipsHeader = document.createElement("h2");
  bestFlipsHeader.id = "bestFlipsHeader";
  bestFlipsHeader.className = "bestheader";
  bestFlipsHeader.textContent = "TOP FLIPS";

  const bestCraftingHeader = document.createElement("h2");
  bestCraftingHeader.id = "bestCraftingHeader";
  bestCraftingHeader.className = "bestheader";
  bestCraftingHeader.textContent = "TOP CRAFTING FLIPS";

  const bestForgingHeader = document.createElement("h2");
  bestForgingHeader.id = "bestForgingHeader";
  bestForgingHeader.className = "bestheader";
  bestForgingHeader.textContent = "TOP FORGING FLIPS";

  // Create outputs1 and outputs2
  const outputs1 = document.createElement("div");
  outputs1.id = "outputs1";
  outputs1.className = "outputs";
  const outputs2 = document.createElement("div");
  outputs2.id = "outputs2";
  outputs2.className = "outputs";

  // Parse html into divs
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  const divs = Array.from(tempDiv.children).filter(el => el.tagName === "DIV");

  // First 3 divs to editOutputs (outputs)
  editOutputs(divs.slice(0, 3).map(d => d.outerHTML).join(""));

  // Next 3 to outputs1
  outputs1.innerHTML = divs.slice(3, 6).map(d => d.outerHTML).join("");

  // Next 3 to outputs2
  outputs2.innerHTML = divs.slice(6, 9).map(d => d.outerHTML).join("");
  // Add class to the outputs containers, not their children
  [outputs1, outputs2, document.getElementById("outputs")].forEach(container => {
    if (container) {
      container.classList.add("homeoutputs");
    }
  });
  // Insert headers and outputs in order
  mainContent.appendChild(bestFlipsHeader);
  mainContent.appendChild(document.getElementById("outputs")); // outputs already exists
  mainContent.appendChild(bestCraftingHeader);
  mainContent.appendChild(outputs1);
  mainContent.appendChild(bestForgingHeader);
  mainContent.appendChild(outputs2);
}