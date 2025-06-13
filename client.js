var instabuysRange = 0; 
var instasellsRange = 0;
var maxbuyRange = 0;
var mincoinsRange = 0;
var show_only_profit = true;
var sortby = 'coinsPerHour';
var isAwaitingRefresh = false;
let remainingHTML = ''; // <-- NEW: stores leftover HTML for scroll
const ITEMS_PER_CHUNK = 24;

const bindings = [
  { range: "instabuysRange", text: "instabuysText" },
  { range: "instasellsRange", text: "instasellsText" },
  { range: "maxbuyRange", text: "maxbuyText" },
  { range: "mincoinsRange", text: "mincoinsText" }
];

document.addEventListener('DOMContentLoaded', () => {
  allPageSetup();
  setupScrollListener(); // <-- NEW
});

function allPageSetup(){
  startPeriodicUpdates(10 * 1000);
  setupUI();
}

function editOutputs(editedHtml){
  document.getElementById('outputs').innerHTML = editedHtml;
}

document.getElementById('searchIcon').addEventListener('click', () => {
  isAwaitingRefresh = false;
  updateSearchParams();
  const params = new URLSearchParams({
    address: 'BAZAAR',
    product: document.getElementById('search').value,
    treshholdsells: instasellsRange,
    treshholdbuys: instabuysRange,
    min_coins_per_hour: mincoinsRange,
    maxbuyRange: maxbuyRange,
    min_coins_per_hour: mincoinsRange,
    show_only_profit: show_only_profit,
    sortby: sortby,
  });
  fetch(`/search?${params.toString()}`, { method: 'GET' })
    .then(response => response.text())
    .then(html => {
      infinityScroll(html);

    })
    .catch(error => console.error('Error:', error));
});

function getNavData(url) {
  fetch(url, { method: 'GET' })
    .then(response => response.text())
    .then(html => {
      if(!html.includes('div')) return;
      infinityScroll(html);
      console.log(url + " HTML loaded successfully");
    })
    .catch(error => console.error('Error:', error));
}

function infinityScroll(html){
      remainingHTML = ''; // Reset scroll cache after search
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      const children = Array.from(tempDiv.children);
      let totalHeight = 0;
      let stackedDivs = 0;
      const productAmountDiv = document.getElementById('productAmount');
      productAmountDiv.innerHTML = children[0].nodeName == 'DIV' ? `Showing ${children.length} products` : 'Showing 0 products';

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
      const initialCount = Math.min(children.length, stackedDivs * 4 || ITEMS_PER_CHUNK);
      const visibleChildren = children.slice(0, initialCount).map(c => c.outerHTML);
      remainingHTML = children.slice(initialCount).map(c => c.outerHTML).join('');

      editOutputs(visibleChildren.join(''));
}

function appendNextChunk() {
  
  if (!remainingHTML) {
    console.log(['bro reached the end'])
    return;
  }

  // Use a temp container to extract elements
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = remainingHTML;
  const children = Array.from(tempDiv.children);

  // Get a fixed number of items
  const chunk = children.slice(0, ITEMS_PER_CHUNK);

  // Append them to the outputs container
  document.getElementById('outputs').insertAdjacentHTML(
    'beforeend',
    chunk.map(child => child.outerHTML).join('')
  );

  // Update remainingHTML
  remainingHTML = children.slice(ITEMS_PER_CHUNK).map(child => child.outerHTML).join('');
}

function setupScrollListener() {
  window.addEventListener('scroll', () => {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
    if (nearBottom && remainingHTML) {
      appendNextChunk();
    }
  });
}

function startPeriodicUpdates(delay){
  setInterval(async () => {
    try {
      updateVisibleProducts();
    } catch (error) {
      console.error("Error in fetching ah data", error);
    }
  }, delay);
}

function setupUI(){
  const outputsDiv = document.getElementById('outputs');
  
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

function clearProducts(){
  document.getElementById("outputs").replaceChildren();
}

function updateVisibleProducts() {
  isAwaitingRefresh = true;
  const idsArray = getCurrentProducts();
  if (!idsArray.length) return;

  const params = {
    address: 'BAZAAR',
    products: idsArray,
    treshholdsells: instasellsRange,
    treshholdbuys: instabuysRange,
    min_coins_per_hour: mincoinsRange,
    maxbuyRange: maxbuyRange,
    min_coins_per_hour: mincoinsRange,
    sortby: sortby,
  };

  fetch('/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
    .then(response => response.text())
    .then(html => {
      if (isAwaitingRefresh) {
        editOutputs(html);
        isAwaitingRefresh = false;
      }
    })
    .catch(error => {
      isAwaitingRefresh = false;
      console.error('Error:', error);
    });
}

function getCurrentProducts(){
  const outputsDiv = document.getElementById('outputs');
  const children = Array.from(outputsDiv.children).filter(child => child.tagName === 'DIV');
  return children.map(child => child.id).filter(Boolean);
}

document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('search');
  const searchIcon = document.getElementById('searchIcon');
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchIcon.click();
    }
  });

  fetch('/mayorname')
    .then(response => response.text())
    .then(name => {
      document.getElementById('mayorName').textContent = name;
      document.getElementById('mayorImg').src = '/mayors/' + name + '.png';
    })
    .catch(error => {
      console.error('Error fetching name:', error);
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
  const cleaned = raw.replace(/[^\d.,kKmMbB\-+]/g, '').trim();
  const value = parseNumber(cleaned);
  const min = parseFloat(rangeEl.min || 0);
  const max = parseFloat(rangeEl.max || 100);
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
  const advancedSearch = document.getElementById('advancedSearch');
  const button = document.getElementById('toggleButton');
  advancedSearch.classList.toggle('collapsed');
  button.classList.toggle('rotated');
}
