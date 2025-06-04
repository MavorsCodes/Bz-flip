var instabuysRange = 0;
var instasellsRange = 0;
var maxbuyRange = 0;
var mincoinsRange = 0;
var show_only_profit = true;
var sortby = 'coinsPerHour';
var isAwaitingRefresh = false;
    const bindings = [
    { range: "instabuysRange", text: "instabuysText" },
    { range: "instasellsRange", text: "instasellsText" },
    { range: "maxbuyRange", text: "maxbuyText" },
    { range: "mincoinsRange", text: "mincoinsText" }
  ];

document.addEventListener('DOMContentLoaded', allPageSetup());


function allPageSetup(){
  getStartingData();
  startPeriodicUpdates(10 * 1000);
  setupUI();
}

function editOutputs(editedHtml){
  document.getElementById('outputs').innerHTML = editedHtml;
}
function getStartingData(){
  fetch(`/homepage`, {
    method: 'GET',
  })
  .then(response => response.text())
  .then(html => {
    editOutputs(html);
    console.log("Homepage HTML loaded successfully");
  })
  .catch(error => console.error('Error:', error));
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
  fetch(`/search?${params.toString()}`, {
    method: 'GET',
  })
  .then(response => response.text())
  .then(html => {
    editOutputs(html);
  })
  .catch(error => console.error('Error:', error));
});

function setupUI(){
  const outputsDiv = document.getElementById('outputs');
  const productAmountDiv = document.getElementById('productAmount');

  const updateProductAmount = () => {
    const productChildren = Array.from(outputsDiv.children).filter(child => child.tagName === 'DIV');
    productAmountDiv.innerHTML = `Showing ${productChildren.length} products`;
  };

  // Initial update
  updateProductAmount();

  //Observe changes to outputsDiv
  const observer = new MutationObserver(updateProductAmount); 
  observer.observe(outputsDiv, { childList: true, subtree: false });


bindings.forEach(({ range, text }) => {
  const rangeEl = document.getElementById(range);
  const textEl = document.getElementById(text);

  textEl.setAttribute("contenteditable", "true");

  // Initial value
  textEl.textContent = formatNumber(rangeEl.value);

  // Range -> Text
  rangeEl.addEventListener("input", () => {
    textEl.textContent = formatNumber(rangeEl.value);
  });

  // Text -> Range
  textEl.addEventListener("input", () => {
    const val = unformatNumber(textEl.textContent);
    const min = parseFloat(rangeEl.min || 0);
    const max = parseFloat(rangeEl.max || 1000000000); // customize this

    if (!isNaN(val) && val >= min && val <= max) {
      rangeEl.value = val;
    }
  });
  textEl.addEventListener("blur", () => {
  validateTextInput(textEl, rangeEl);
});

textEl.addEventListener("keydown", (e) => {
  // Optional: allow Enter to trigger validation
  if (e.key === "Enter") {
    e.preventDefault(); // prevent newlines
    textEl.blur();
  }
});

  // Optional: format text again after editing
  textEl.addEventListener("blur", () => {
    const val = unformatNumber(textEl.textContent);
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
    if (!idsArray.length ) return;
    console.log("Updating visible products");
    const params = {
      address: 'BAZAAR',
      products: idsArray,
      treshholdsells: instasellsRange,
      treshholdbuys: instabuysRange,
      min_coins_per_hour: mincoinsRange,
      maxbuyRange: maxbuyRange,
      min_coins_per_hour: mincoinsRange,
    };
    fetch('/update', {
      method: 'POST',
      headers: {
      'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then(response => response.text())
      .then(html => {
            if(isAwaitingRefresh){
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
    const idsArray = [];
    for (let i = 0; i < children.length; i++) {
      if (children[i].id) {
        idsArray.push(children[i].id);
      }
    }
    return idsArray;
  }

  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM is fully loaded');
      const searchInput = document.getElementById('search');
  const searchIcon = document.getElementById('searchIcon');
      searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault(); // optional: prevents form submission
      searchIcon.click(); // simulate click
    }
  });

  });

  function formatNumber(value) {
  if (isNaN(value)) return value;

  const num = parseFloat(value);
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toLocaleString(); // e.g. 1,234
}

function unformatNumber(formatted) {
  if (typeof formatted !== "string") return formatted;

  let str = formatted.replace(/,/g, "").toUpperCase().trim();

  if (str.endsWith("K")) return parseFloat(str) * 1e3;
  if (str.endsWith("M")) return parseFloat(str) * 1e6;
  if (str.endsWith("B")) return parseFloat(str) * 1e9;

  return parseFloat(str);
}

function validateTextInput(textEl, rangeEl) {
  const raw = textEl.textContent;
  const cleaned = raw.replace(/[^\d.,kKmMbB\-+]/g, '').trim(); // Keep numbers + suffixes

  const value = unformatNumber(cleaned);
  const min = parseFloat(rangeEl.min || 0);
  const max = parseFloat(rangeEl.max || 100);

  if (isNaN(value)) {
    // Optional feedback for invalid input
    textEl.textContent = "Invalid";
    return null;
  }

  // Clamp value within bounds
  const clamped = Math.min(Math.max(value, min), max);

  // Update both elements with validated value
  rangeEl.value = clamped;
  textEl.textContent = formatNumber(clamped);

  return clamped;
}