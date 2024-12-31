var treshholdbuys = 0;
var treshholdsells = 0;
var min_margin = 0;
var min_coins_per_hour = 0;
const rangeInput = document.getElementById('min_buy');
const numberInput = document.getElementById('min_buy_box');

document.addEventListener('DOMContentLoaded', allPageSetup());


function allPageSetup(){
  getStartingData();
  startPeriodicUpdates(10 * 1000);
  setupSliders();
}
function getStartingData(){
  fetch(`/data`, {
    method: 'GET',
  })
  .then(response => response.json())
  .then(data => {
  data = data.filter(a => ( ( (a.one_hour_instabuys || 0) >= treshholdbuys) && ( (a.one_hour_instasells || 0) >= treshholdsells) && ((a.margin || 0) > min_margin && (a.coins_per_hour || 0) > min_coins_per_hour)));
  data.sort((a, b) =>  b.coins_per_hour - a.coins_per_hour);
    for(product in data)
      createProductDiv(data[product]);
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

document.getElementById('getData').addEventListener('click', () => {
    treshholdbuys = rangeInput.value;
    const params = new URLSearchParams({
      
        address : document.getElementById('address').value,
        product : document.getElementById('search').value
    });
  
    fetch(`/search?${params.toString()}`, {
      method: 'GET',
    })
      .then(response => response.json())
      .then(data => {
        data = data.filter(a => ( ( (a.one_hour_instabuys || 0) >= treshholdbuys) && ( (a.one_hour_instasells || 0) >= treshholdsells) ));
        data.sort((a, b) =>  b.coins_per_hour - a.coins_per_hour);
          clearProducts();
          for(product in data)
            createProductDiv(data[product])
      })
      .catch(error => console.error('Error:', error));
});

function setupSliders(){
      // Select the input elements
  // Function to sync the range input with the number input
  rangeInput.addEventListener('input', function () {
      numberInput.value = rangeInput.value;
  });

  // Function to sync the number input with the range input
  numberInput.addEventListener('input', function () {
      rangeInput.value = numberInput.value;
  });

}
  function createProductDiv(product){
    let searched = product.name;
    if(document.getElementById(searched) != null){
      document.getElementById(searched).remove();
      console.log("Updating data");
    }
    let output = document.createElement("div");
    output.innerHTML = createProductHtml(product);
    output.id = (searched);
    output.classList.add("output");
    document.getElementById("outputs").appendChild(output); 
  }

  function createProductHtml(product){
    return `<img src="${product.img}" alt="img of ${product.name}">
          <p><b>${product.name.toLowerCase().replace(/_/g, ' ').replace(/enchantment/gi, '')}</b> <br><br>
          Buy Price: ${product.buy_price.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')} coins <br>
          One-Hour Instabuys: ${product.one_hour_instabuys.toFixed(1)}<br>
          Sell Price: ${product.sell_price.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')} coins<br>
          One-Hour Instasells: ${product.one_hour_instasells.toFixed(1)}<br>
          Margin: ${product.margin.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')} coins <br>
          Coins per Hour ${product.coins_per_hour.toFixed(1).replace(/\d(?=(\d{3})+\.)/g, '$&,')} coins</p>
          ` 
  }
  
  function clearProducts(){
    document.getElementById("outputs").replaceChildren();
  }

  function updateVisibleProducts(){
    const outputsDiv = document.getElementById('outputs');  // Get the parent div
    const children = outputsDiv.children;  // Get the child elements of 'outputs'
    const idsArray = [];  // Array to store the IDs of the children

    // Loop through each child element
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.id) {  // Check if the child has an ID
            idsArray.push(child.id);  // Save the ID to the array
        }
    }
    fetch(`/data`, {
      method: 'GET',
    })
    .then(response => response.json())
    .then(data => {
    data = data.filter(a => ( ( (a.one_hour_instabuys || 0) >= treshholdbuys) && ( (a.one_hour_instasells || 0) >= treshholdsells) ));
    data.sort((a, b) =>  b.coins_per_hour - a.coins_per_hour);
      for(product in data)
          if(idsArray.includes(data[product].name))
            createProductDiv(data[product]);
    })
    .catch(error => console.error('Error:', error));
  }

  function autocomplete(inp, arr) {
    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
    var currentFocus;
    /*execute a function when someone writes in the text field:*/
    inp.addEventListener("input", function(e) {
        var a, b, i, val = this.value;
        /*close any already open lists of autocompleted values*/
        closeAllLists();
        if (!val) { return false;}
        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        /*for each item in the array...*/
        for (i = 0; i < arr.length; i++) {
          /*check if the item starts with the same letters as the text field value:*/
          if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
            /*create a DIV element for each matching element:*/
            b = document.createElement("DIV");
            b.classList.add("autocomplete-item")
            /*make the matching letters bold:*/
            b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
            b.innerHTML += arr[i].substr(val.length);
            /*insert a input field that will hold the current array item's value:*/
            b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
            /*execute a function when someone clicks on the item value (DIV element):*/
                b.addEventListener("click", function(e) {
                /*insert the value for the autocomplete text field:*/
                inp.value = this.getElementsByTagName("input")[0].value;
                /*close the list of autocompleted values,
                (or any other open lists of autocompleted values:*/
                closeAllLists();
            });
            a.appendChild(b);
          }
        }
    });
    /*execute a function presses a key on the keyboard:*/
    inp.addEventListener("keydown", function(e) {
        var x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode == 40) {
          /*If the arrow DOWN key is pressed,
          increase the currentFocus variable:*/
          currentFocus++;
          /*and and make the current item more visible:*/
          addActive(x);
        } else if (e.keyCode == 38) { //up
          /*If the arrow UP key is pressed,
          decrease the currentFocus variable:*/
          currentFocus--;
          /*and and make the current item more visible:*/
          addActive(x);
        } else if (e.keyCode == 13) {
          /*If the ENTER key is pressed, prevent the form from being submitted,*/
          e.preventDefault();
          if (currentFocus > -1) {
            /*and simulate a click on the "active" item:*/
            if (x) x[currentFocus].click();
          }
        }
    });
    function addActive(x) {
      /*a function to classify an item as "active":*/
      if (!x) return false;
      /*start by removing the "active" class on all items:*/
      removeActive(x);
      if (currentFocus >= x.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = (x.length - 1);
      /*add class "autocomplete-active":*/
      x[currentFocus].classList.add("autocomplete-active");
    }
    function removeActive(x) {
      /*a function to remove the "active" class from all autocomplete items:*/
      for (var i = 0; i < x.length; i++) {
        x[i].classList.remove("autocomplete-active");
      }
    }
    function closeAllLists(elmnt) {
      /*close all autocomplete lists in the document,
      except the one passed as an argument:*/
      var x = document.getElementsByClassName("autocomplete-items");
      for (var i = 0; i < x.length; i++) {
        if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }
  /*execute a function when someone clicks in the document:*/
  document.addEventListener("click", function (e) {
      closeAllLists(e.target);
  });
  }
  document.addEventListener('DOMContentLoaded', function() {
    autocomplete(document.getElementById("search"), products );
    console.log('DOM is fully loaded');
  });

let products = ["INK SACK:3","INK SACK:4","CORRUPTED BAIT","TARANTULA WEB"," ULTIMATE NO PAIN NO GAIN 2"," ULTIMATE NO PAIN NO GAIN 1","DUNGEON TRAP","DARK ORB","ARCHITECT FIRST DRAFT"," PROTECTION 7"," PROTECTION 6","RITUAL RESIDUE","ESSENCE DRAGON"," PROTECTION 1","GIANT FRAGMENT LASER"," PROTECTION 5","ENCHANTED MELON"," PROTECTION 4"," PROTECTION 3"," PROTECTION 2"," TURBO COCO 1"," TURBO COCO 5"," TURBO COCO 4"," TURBO COCO 3","ENCHANTED BLAZE ROD"," TURBO COCO 2","ENCHANTED BROWN MUSHROOM","FRESHLY MINTED COINS","GOBLIN EGG YELLOW","PARTY GIFT","ENCHANTED GLISTERING MELON"," CORRUPTION 5"," CORRUPTION 4","PROTECTOR FRAGMENT"," CORRUPTION 3"," CORRUPTION 2","MAGMAG"," CORRUPTION 1","ENCHANTED MELON BLOCK","ROCK GEMSTONE","CONDENSED FERMENTO","BEADY EYES","DIAMOND","COBBLESTONE","ENCHANTED PUFFERFISH","PERFECT RUBY GEM","MINION EXPANDER","HORN OF TAURUS","END STONE SHULKER","MAGMA LORD FRAGMENT"," CAYENNE 5","ENCHANTED HARD STONE"," CAYENNE 4","WINTER FRAGMENT","ENDER MONOCLE","KELVIN INVERTER","REFINED DIAMOND","X","Y","HAZMAT ENDERMAN","Z","LUXURIOUS SPOOL","FLAWED OPAL GEM"," CAYENNE 3","PORK"," CAYENNE 2"," CAYENNE 1","FLAMES"," ENDER SLAYER 1","PET CAKE","HONEY JAR","ULTIMATE CARROT CANDY","SOLAR PANEL"," LAPIDARY 4"," LAPIDARY 3"," LAPIDARY 2"," LAPIDARY 1"," FIRE ASPECT 1","LOG 2:1"," TURBO CACTUS 5","UNDEAD CATALYST","ENCHANTED SNOW BLOCK"," TURBO CACTUS 4"," TURBO CACTUS 3"," TURBO CACTUS 2"," FIRE ASPECT 2"," TURBO CACTUS 1"," LAPIDARY 5"," FIRE ASPECT 3"," ENDER SLAYER 5"," ENDER SLAYER 4"," ENDER SLAYER 3"," ENDER SLAYER 2"," ENDER SLAYER 7"," ENDER SLAYER 6"," SHARPNESS 1","DUNGEON DECOY","REFINED TUNGSTEN"," SHARPNESS 5","JERRY BOX GOLDEN"," SHARPNESS 4"," SHARPNESS 3"," SHARPNESS 2"," BIG BRAIN 4"," BIG BRAIN 5"," BIG BRAIN 3","MUTATED BLAZE ASHES","ENCHANTED CARROT ON A STICK"," THUNDERLORD 7"," THUNDERLORD 6"," TURBO MELON 5","DERELICT ASHE","FLY SWATTER"," THUNDERLORD 3"," THUNDERLORD 2"," SHARPNESS 7"," THUNDERLORD 5"," SHARPNESS 6"," THUNDERLORD 4","ENCHANTED ACACIA LOG"," MANA STEAL 1"," MANA STEAL 2"," THUNDERLORD 1"," MANA STEAL 3","SAND","PLASMA BUCKET","ANCIENT CLAW"," TURBO MELON 3"," STRONG MANA 7","ENCHANTED GHAST TEAR"," TURBO MELON 4"," STRONG MANA 6"," TURBO MELON 1"," STRONG MANA 5","ENCHANTED COCOA"," TURBO MELON 2"," STRONG MANA 4"," STRONG MANA 3","AMBER MATERIAL"," STRONG MANA 2"," STRONG MANA 1","FINE TOPAZ GEM","CARROT BAIT","FINE RUBY GEM","HYPERGOLIC IONIZED CERAMICS","THUNDER SHARDS","HAY BLOCK","ENCHANTED ROTTEN FLESH","ENCHANTED GRILLED PORK","WISHING COMPASS","ENCHANTED ANCIENT CLAW","DWARVEN OS ORE OATS"," HARDENED MANA 1","FULL CHUM BUCKET","OVERGROWN GRASS","PUMPKIN BOMB"," HARDENED MANA 3"," HARDENED MANA 2"," ULTIMATE COMBO 1","SOULFLOW ENGINE"," ULTIMATE COMBO 2"," ULTIMATE COMBO 5","PET ITEM TOY JERRY"," ULTIMATE COMBO 3","ENCHANTED LAVA BUCKET"," ULTIMATE COMBO 4","RAW FISH:3","BUBBA BLISTER","ENCHANTED UMBER"," STRONG MANA 9"," STRONG MANA 8","ROUGH AQUAMARINE GEM","DIAMOND ATOM","RAW FISH:2","RAW FISH:1","PRECURSOR GEAR","GOBLIN EGG RED"," TURBO WARTS 1"," TURBO WARTS 2"," TURBO WARTS 3"," TURBO WARTS 4"," TURBO WARTS 5","WHALE BAIT","SPONGE","ENCHANTED DARK OAK LOG","FLAWLESS TOPAZ GEM"," HARDENED MANA 5"," HARDENED MANA 4"," HARDENED MANA 7","CAPSAICIN EYEDROPS NO CHARGES"," HARDENED MANA 6"," HARDENED MANA 9"," ULTIMATE NO PAIN NO GAIN 4"," HARDENED MANA 8"," ULTIMATE NO PAIN NO GAIN 3"," ULTIMATE NO PAIN NO GAIN 5","ENCHANTED RAW CHICKEN","ENCHANTED WATER LILY","RED SCARF","LOG:1","TITANIUM ORE","ROBOTRON REFLECTOR","BLUE SHARK TOOTH","LOG:3","CHILI PEPPER","LOG:2","ENCHANTED HAY BALE","SIL EX","ENCHANTED CACTUS","SALT CUBE","ONYX","ENCHANTED SULPHUR","ENCHANTED COOKED SALMON","TITANIUM TESSERACT","ENCHANTED SEEDS","ENCHANTED BONE MEAL"," EXPERIENCE 5","ENCHANTED BONE BLOCK","OMEGA EGG","SMALL ENCHANTED CHEST","PURPLE CANDY"," EXPERIENCE 2","POLISHED PUMPKIN"," EXPERIENCE 1"," EXPERIENCE 4"," EXPERIENCE 3","ENCHANTED GOLD BLOCK","FINE OPAL GEM","ENCHANTED FLINT","FAKE SHURIKEN","SPOTLITE","SCORCHED POWER CRYSTAL","REHEATED GUMMY POLAR BEAR","SCARF FRAGMENT","FURBALL","ESSENCE SPIDER","ENCHANTED CLAY BALL","GLOWSTONE DUST","FLYCATCHER UPGRADE","PERFECT AMETHYST GEM","IMPLOSION SCROLL","CROPIE","FTX 3070","ENDSTONE GEODE","PET ITEM VAMPIRE FANG"," PALEONTOLOGIST 5","MILLENIA OLD BLAZE ASHES"," MANA VAMPIRE 10","GREAT CARROT CANDY","ENCHANTED BONE","OPTICAL LENS"," PALEONTOLOGIST 3","LAVA WATER ORB"," PALEONTOLOGIST 4","ENCHANTED DIAMOND BLOCK"," PALEONTOLOGIST 1"," PALEONTOLOGIST 2"," DELICATE 5","GOBLIN EGG GREEN"," PROSECUTE 6"," CASTER 1"," PROSECUTE 5"," CASTER 2","GIANT FRAGMENT BIGFOOT","LIGHT BAIT","HOT POTATO BOOK","CUP OF BLOOD","MAGIC MUSHROOM SOUP"," CASTER 3","CLAY BALL"," CASTER 4"," CASTER 5","OLD FRAGMENT"," CASTER 6","BEATING HEART","ROUGH AMBER GEM"," PROSECUTE 4"," PROSECUTE 3"," PROSECUTE 2"," PROSECUTE 1","AMALGAMATED CRIMSONITE","SUPER MAGIC MUSHROOM SOUP","FINE AMBER GEM","ENCHANTED QUARTZ","ENCHANTED COAL BLOCK","ENDER PEARL","LESSER SOULFLOW ENGINE","ENCHANTED GLACITE","LARGE WALNUT","FLAWED JADE GEM","TOIL LOG","SLUDGE JUICE","SPECTRE DUST","BONZO FRAGMENT","SUGAR CANE"," RESPITE 5"," RESPITE 3"," RESPITE 4"," RESPITE 1"," RESPITE 2","CORRUPTED FRAGMENT","TESSELLATED ENDER PEARL","ENCHANTED RAW BEEF","AOTE STONE","RABBIT HIDE","INFERNO FUEL BLOCK"," OVERLOAD 5"," OVERLOAD 4"," OVERLOAD 3"," OVERLOAD 2"," OVERLOAD 1","DARK BAIT","ENCHANTED PUMPKIN","ENCHANTED COOKED FISH","OBSIDIAN","PET ITEM EXP SHARE DROP","STARFALL","SECOND MASTER STAR"," FIRE PROTECTION 6"," FIRE PROTECTION 5","ROUGH ONYX GEM"," FIRE PROTECTION 7"," HARDENED MANA 10","FLAWLESS ONYX GEM"," ULTIMATE JERRY 2","ENTROPY SUPPRESSOR"," ULTIMATE REND 3"," ULTIMATE REND 2"," ULTIMATE JERRY 1"," ULTIMATE REND 1","ENCHANTED POPPY","GLOWSTONE DUST DISTILLATE"," ULTIMATE JERRY 5"," ULTIMATE REND 5"," ULTIMATE JERRY 4"," ULTIMATE JERRY 3","DWARVEN OS GEMSTONE GRAHAMS"," ULTIMATE REND 4"," FIRE PROTECTION 2"," FIRE PROTECTION 1","BAZAAR COOKIE"," FIRE PROTECTION 4"," FIRE PROTECTION 3","BROWN MUSHROOM","FLAWLESS PERIDOT GEM","DISPLACED LEECH"," HARVESTING 5"," HARVESTING 4"," HARVESTING 3","CARROT ITEM"," HARVESTING 2"," HARVESTING 1","UMBER","HEALING TISSUE","EXP BOTTLE","MOLTEN CUBE","ENCHANTED RABBIT HIDE"," HARVESTING 6","SQUEAKY TOY","WATER ORB","GLACITE JEWEL","INFERNO VERTEX","MATCH STICKS","RUSTY ANCHOR","WEAK WOLF CATALYST","FLAWED AMETHYST GEM","PERFECT JADE GEM","ENCHANTED BIRCH LOG","FOURTH MASTER STAR","ENCHANTED GUNPOWDER","REFINED AMBER","ENCHANTED SUGAR","CACTUS","DUNG","ENCHANTED RAW SALMON","BOBBIN SCRIPTURES","ENCHANTED EMERALD","RED MUSHROOM","GRAND EXP BOTTLE","MUTTON"," DEDICATION 2"," DEDICATION 1"," DEDICATION 4"," DEDICATION 3"," ULTIMATE WISE 2"," ULTIMATE WISE 1","SPIDER EYE"," ULTIMATE WISE 4"," ULTIMATE WISE 3","BEJEWELED HANDLE","LARGE ENCHANTED CHEST","ENCHANTED NETHERRACK","JADERALD"," TRUE PROTECTION 1","CORRUPT SOIL","RARE DIAMOND","PRISMARINE CRYSTALS","DWARVEN OS BLOCK BRAN","COMPACT OOZE","GLOSSY GEMSTONE","ICE","TIGER SHARK TOOTH"," LUCK OF THE SEA 4"," LUCK OF THE SEA 5"," LUCK OF THE SEA 6"," SMARTY PANTS 3"," ULTIMATE WISE 5"," SMARTY PANTS 2"," LUCK OF THE SEA 1"," SMARTY PANTS 5"," LUCK OF THE SEA 2"," SMARTY PANTS 4"," LUCK OF THE SEA 3","GOLDEN TOOTH","THE ART OF PEACE"," SMARTY PANTS 1","LUMP OF MAGMA","HYPER CATALYST","VOLTA","RABBIT FOOT","SUPERLITE MOTOR","REDSTONE","BRAIDED GRIFFIN FEATHER","SUSPICIOUS SCRAP","SPIRIT WING","PET ITEM CHOCOLATE SYRINGE","BLAZEN SPHERE","SPOOKY WATER ORB","THE ART OF WAR"," LURE 2"," LURE 1","SLIME BALL"," LURE 6"," LURE 5"," LURE 4"," LURE 3","HOLY FRAGMENT","SNOW BALL","ENCHANTED WOOL","GLEAMING CRYSTAL","ENCHANTED EGG","SUPERB CARROT CANDY"," FEROCIOUS MANA 8"," FEROCIOUS MANA 9","FINE JADE GEM"," FEROCIOUS MANA 4","FLAWED RUBY GEM"," MAGNET 2","RAW CHICKEN"," FEROCIOUS MANA 5"," MAGNET 1"," FEROCIOUS MANA 6","SORROW"," MAGNET 4"," FEROCIOUS MANA 7"," MAGNET 3"," MAGNET 6","FLAWLESS JASPER GEM"," FEROCIOUS MANA 1"," MAGNET 5"," FEROCIOUS MANA 2","LUSH BERBERIS"," FEROCIOUS MANA 3"," PESTERMINATOR 1"," PESTERMINATOR 2"," PROJECTILE PROTECTION 7"," CHAMPION 10"," PESTERMINATOR 3"," PROJECTILE PROTECTION 6"," PESTERMINATOR 4","ENCHANTED SHARK FIN"," PROJECTILE PROTECTION 5"," PESTERMINATOR 5"," PROJECTILE PROTECTION 4"," PROJECTILE PROTECTION 3"," PROJECTILE PROTECTION 2"," PROJECTILE PROTECTION 1","INK SACK","CRYSTAL FRAGMENT","ENCHANTED REDSTONE BLOCK","DIVAN POWDER COATING","INFERNO APEX","ENCHANTED REDSTONE LAMP","TREASURITE","PERFECT OPAL GEM","MELON","DIAMONITE","GLOWING MUSHROOM"," DRAGON HUNTER 4"," DRAGON HUNTER 3"," DRAGON HUNTER 5","ENCHANTED IRON BLOCK"," DRAGON HUNTER 2"," DRAGON HUNTER 1","BONE","POISONOUS POTATO","KISMET FEATHER","REVENANT FLESH","VOLCANIC ROCK","ENCHANTED GLOWSTONE","OBSIDIAN TABLET","ESSENCE WITHER"," CHARM 2"," CHARM 3"," CHARM 1","BLAZE ROD"," CHARM 4","YOUNG FRAGMENT"," CHARM 5","MITHRIL PLATE","BLOOD SOAKED COINS","REFINED MINERAL","GUARDIAN LUCKY BLOCK","CHYME","DIVAN FRAGMENT","ROUGH RUBY GEM"," IMPALING 3"," IMPALING 2","GOBLIN EGG BLUE"," IMPALING 1","DIGESTED MUSHROOMS","CATALYST","REFINED DARK CACAO TRUFFLE","JERRY STONE","ENCHANTED INK SACK","MOLTEN POWDER","FLAWLESS SAPPHIRE GEM","MAGMA URCHIN","PERFECT AQUAMARINE GEM","BAT FIREWORK","JACOBS TICKET"," QUANTUM 4"," QUANTUM 5","ABSOLUTE ENDER PEARL"," REPLENISH 1","ARACHNE FRAGMENT"," QUANTUM 3","ENCHANTED ENDER PEARL","ARROW BUNDLE MAGMA","SPIKED BAIT","ENCHANTED FERMENTED SPIDER EYE","FROZEN BAIT","BLESSED FRUIT"," ULTIMATE SWARM 5","VERY CRUDE GABAGOOL"," TURBO WHEAT 3"," TURBO WHEAT 4"," SILK TOUCH 1"," TURBO WHEAT 1"," TURBO WHEAT 2"," ULTIMATE SWARM 3"," ULTIMATE SWARM 4"," TURBO WHEAT 5"," ULTIMATE SWARM 1"," ULTIMATE SWARM 2","EXPORTABLE CARROTS","NULL OVOID","GOLD INGOT"," SUGAR RUSH 3"," SUGAR RUSH 2","FLAWLESS CITRINE GEM","ENCHANTED IRON"," SUGAR RUSH 1","BEZOS","ENCHANTED HAY BLOCK","HEMOVIBE","ENCHANTED TITANIUM","DWARVEN OS METALLIC MINIS","SPOOKY BAIT","HEAVY PEARL","EMERALD","TWILIGHT ARROW POISON","ENCHANTED RABBIT FOOT","POTATO SPREADING","ENCHANTED ICE","ARACHNE KEEPER FRAGMENT"," GROWTH 1"," GROWTH 2","GREEN GIFT"," GROWTH 3"," GROWTH 4","SKELETON KEY"," GROWTH 5"," GROWTH 6","RED NOSE","FLAWLESS AMETHYST GEM","NULL EDGE"," GROWTH 7","THORN FRAGMENT","PACKED ICE","YELLOW FLOWER","CLIPPED WINGS","REVENANT CATALYST","WITHER CATALYST","HAMSTER WHEEL","PESTHUNTING GUIDE","ENCHANTED COAL","MAGMA FISH SILVER","SULPHURIC COAL","FLAWLESS OPAL GEM","ESSENCE UNDEAD","DRAGON CLAW","DAEDALUS STICK"," ULTIMATE CHIMERA 1"," ULTIMATE LAST STAND 5"," ULTIMATE LAST STAND 4"," ULTIMATE CHIMERA 5"," ULTIMATE LAST STAND 3"," ULTIMATE LAST STAND 2"," ULTIMATE CHIMERA 4"," ULTIMATE LAST STAND 1","PET ITEM PURE MITHRIL GEM"," ULTIMATE CHIMERA 3","JUNGLE HEART"," ULTIMATE CHIMERA 2","LUCKY DICE","FOUL FLESH","RAW BEEF","ENCHANTED EYE OF ENDER","ECTOPLASM","ORB OF ENERGY","PRECIOUS PEARL","ENCHANTED MYCELIUM","RABBIT","MAGMA FISH DIAMOND","ENCHANTED HOPPER","FINE FLOUR","GRIFFIN FEATHER","POLARVOID BOOK","HEMOBOMB","FREE WILL","GIANT FRAGMENT DIAMOND","SOULFLOW","METAPHYSICAL SERUM","MINNOW BAIT","AVARICIOUS CHALICE","ENCHANTED MAGMA CREAM","ENCHANTED FIREWORK ROCKET","WITHER BLOOD","BLAZE WAX"," EFFICIENCY 5"," EFFICIENCY 4","CHOCOLATE CHIP"," EFFICIENCY 3"," EFFICIENCY 2","FLAWLESS JADE GEM","HARD STONE"," EFFICIENCY 1","SUPERBOOM TNT","ENCHANTED COOKED MUTTON"," EFFICIENCY 9"," EFFICIENCY 8","REFINED TITANIUM","FLAWED ONYX GEM"," EFFICIENCY 7"," FEATHER FALLING 10"," EFFICIENCY 6","SHINY PRISM"," SMOLDERING 5"," SMOLDERING 3"," SMOLDERING 4"," SMOLDERING 1","EGG","FIRST MASTER STAR"," SMOLDERING 2","UMBER KEY","FLOWERING BOUQUET","SPIRIT LEAP","FINE JASPER GEM","ENCHANTED CHARCOAL","BOOK OF STATS","SIMPLE CARROT CANDY","ENCHANTED DIAMOND"," FEATHER FALLING 20","OIL BARREL","GOLEM POPPY","CORRUPTED NETHER STAR","HORNS OF TORMENT"," CRITICAL 6","JERRY BOX GREEN","FARMING FOR DUMMIES"," CRITICAL 7","POCKET ICEBERG"," TOXOPHILITE 1"," CRITICAL 4"," CRITICAL 5"," CRITICAL 2","ENCHANTED GOLDEN CARROT","ENCHANTED TUNGSTEN"," CRITICAL 3"," CRITICAL 1","MANA DISINTEGRATOR"," AIMING 1"," AIMING 2"," AIMING 3"," AIMING 4"," AIMING 5","SHADOW WARP SCROLL","FLAWED PERIDOT GEM"," ULTIMATE HABANERO TACTICS 4"," FROST WALKER 2"," THUNDERBOLT 6"," BLAST PROTECTION 7","ENCHANTED MYCELIUM CUBE","FLAWED JASPER GEM"," ULTIMATE HABANERO TACTICS 5"," FROST WALKER 1","EXPIRED PUMPKIN"," ICE COLD 4"," ICE COLD 3"," THUNDERBOLT 1","GLACIAL FRAGMENT","ENCHANTED POISONOUS POTATO"," ICE COLD 5","FLAWED AMBER GEM","TUNGSTEN PLATE"," THUNDERBOLT 4"," THUNDERBOLT 5"," ICE COLD 2"," THUNDERBOLT 2"," ICE COLD 1"," THUNDERBOLT 3"," ULTIMATE REITERATE 1"," ULTIMATE REITERATE 4"," COMPACT 10"," ULTIMATE REITERATE 5"," ULTIMATE REITERATE 2","PRISMARINE SHARD"," ULTIMATE REITERATE 3","PRECURSOR APPARATUS","SYNTHETIC HEART","POWER CRYSTAL","WISE FRAGMENT","SHARK FIN","PERFECT PERIDOT GEM","XXLARGE ENCHANTED CHEST","REFINED MITHRIL","FUEL TANK","UMBER PLATE","JALAPENO BOOK"," VENOMOUS 3","POTATO ITEM"," VENOMOUS 4"," VENOMOUS 5","ENCHANTED HUGE MUSHROOM 1","SKYMART BROCHURE"," VENOMOUS 6","PRESUMED GALLON OF RED PAINT","HEMOGLASS"," VENOMOUS 1"," VENOMOUS 2","ELECTRON TRANSMITTER","ENCHANTED COBBLESTONE"," STRONG MANA 10","ENCHANTED HUGE MUSHROOM 2","MOOGMA PELT","GLOWY CHUM BAIT","GAZING PEARL","STUFFED CHILI PEPPER","BUDGET HOPPER","REKINDLED EMBER FRAGMENT","ICE BAIT","TERRY SNOWGLOBE","FINE ONYX GEM","CHEESE FUEL","KUUDRA MANDIBLE"," FEATHER FALLING 3"," FEATHER FALLING 2","PUMPKIN GUTS"," FEATHER FALLING 1"," FEATHER FALLING 7","BLAZE ROD DISTILLATE"," FEATHER FALLING 6","WITHER SHIELD SCROLL"," FEATHER FALLING 5"," FEATHER FALLING 4","ACACIA BIRDHOUSE"," FEATHER FALLING 9"," FEATHER FALLING 8","SPIDER CATALYST","ENCHANTED LAPIS LAZULI BLOCK","ENCHANTED ENDSTONE","ENCHANTED SAND","COLOSSAL EXP BOTTLE","ESSENCE ICE","ENCHANTED STRING","PERFECT ONYX GEM","MOIL LOG","MIMIC FRAGMENT","ENCHANTED DANDELION","MAGMA FISH GOLD","SOUL FRAGMENT","ENCHANTED LAPIS LAZULI","ENDERMAN CORTEX REWRITER","MELON BLOCK","CRUDE GABAGOOL DISTILLATE","SEEDS","ENCHANTED LEATHER","ENCHANTED SPONGE","WOLF TOOTH","ENCHANTED NETHER STALK"," CURSE OF VANISHING 0","ENCHANTED REDSTONE","METEOR SHARD"," COMPACT 2"," COMPACT 3","DWARVEN COMPACTOR"," COMPACT 1","GREAT WHITE SHARK TOOTH","ESSENCE GOLD","LEATHER CLOTH"," PRISTINE 1"," COMPACT 6"," BLAST PROTECTION 4"," PRISTINE 2"," COMPACT 7"," BLAST PROTECTION 3"," BLAST PROTECTION 6","RECOMBOBULATOR 3000"," COMPACT 4"," BLAST PROTECTION 5"," COMPACT 5"," PRISTINE 5"," PRISTINE 3"," COMPACT 8"," BLAST PROTECTION 2","ENCHANTED WHEAT"," PRISTINE 4"," COMPACT 9"," BLAST PROTECTION 1"," FEROCIOUS MANA 10","ENCHANTED PORK","NECROMANCER BROOCH","PET ITEM LUCKY CLOVER DROP","BURROWING SPORES","DEEP SEA ORB","ROUGH JASPER GEM","FEATHER","PETRIFIED STARFALL","MAGIC TOP HAT","ENCHANTED RED SAND","ENCHANTED CLOWNFISH","REFINED UMBER","PITCHIN KOI","ENCHANTED GOLD"," LIFE STEAL 1"," LIFE STEAL 2"," SMELTING TOUCH 1","ROUGH CITRINE GEM"," LIFE STEAL 5"," LIFE STEAL 3"," LIFE STEAL 4"," PISCARY 1"," TURBO MUSHROOMS 5","GOLDEN PLATE","SADAN BROOCH","FIFTH MASTER STAR"," PISCARY 3"," PISCARY 2","ENCHANTED GLOWSTONE DUST","BLUE ICE HUNK"," PISCARY 5"," PISCARY 4"," PISCARY 6"," TABASCO 1"," TABASCO 3"," PUNCH 1","ENCHANTED SUGAR CANE","TRANSMISSION TUNER"," TABASCO 2"," PUNCH 2"," TURBO MUSHROOMS 2"," TURBO MUSHROOMS 1"," TURBO MUSHROOMS 4","CONCENTRATED STONE"," TURBO MUSHROOMS 3"," MANA VAMPIRE 2"," MANA VAMPIRE 1"," MANA VAMPIRE 4"," MANA VAMPIRE 3"," MANA VAMPIRE 6"," MANA VAMPIRE 5","SHARK WATER ORB"," MANA VAMPIRE 8"," MANA VAMPIRE 7","GHAST TEAR"," MANA VAMPIRE 9","UNSTABLE FRAGMENT","KUUDRA TEETH","MAGMA CREAM DISTILLATE","CORLEONITE","ENCHANTED EMERALD BLOCK","SUBZERO INVERTER","GIANT TOOTH"," PIERCING 1"," ULTIMATE THE ONE 5"," TITAN KILLER 7","ENCHANTED MUTTON","SLEEPY HOLLOW"," TITAN KILLER 6","NULL SPHERE"," TITAN KILLER 5"," TITAN KILLER 4"," TITAN KILLER 3"," TITAN KILLER 2"," TITAN KILLER 1","STOCK OF STONKS","SUPERIOR FRAGMENT","MAGMA BUCKET"," ULTIMATE THE ONE 4"," POWER 1","HOT BAIT","NULL BLADE","WITHER SOUL"," POWER 7"," POWER 6"," ANGLER 1"," ANGLER 2","GLACITE SHARD","WORM MEMBRANE"," ANGLER 3"," POWER 3"," ANGLER 4","BLACK WOOLEN YARN"," ANGLER 5"," POWER 2"," ANGLER 6"," POWER 5"," POWER 4","WATER LILY"," THORNS 3","BOB OMB","LOG 2","MITHRIL INFUSION","COAL"," ULTIMATE BOBBIN TIME 3"," ULTIMATE BOBBIN TIME 4"," ULTIMATE BOBBIN TIME 5"," THORNS 1","GOLDEN BOUNTY"," THORNS 2"," VAMPIRISM 5","ENCHANTED PRISMARINE CRYSTALS","PERFECT TOPAZ GEM","GOBLIN EGG"," VAMPIRISM 6","LIVID FRAGMENT"," VAMPIRISM 3","PLASMA"," VAMPIRISM 4","ENCHANTED WET SPONGE"," CULTIVATING 9"," EXPERTISE 7"," EXPERTISE 6"," EXPERTISE 9"," CULTIVATING 7"," EXPERTISE 8"," CULTIVATING 8"," CULTIVATING 5","PERFECT PLATE","ESSENCE CRIMSON","ENDER STONE"," CULTIVATING 6"," CULTIVATING 3"," CULTIVATING 4"," CULTIVATING 1"," VAMPIRISM 1"," VAMPIRISM 2"," CULTIVATING 2","QUARTZ","JERRY BOX PURPLE","SALMON OPAL"," ULTIMATE SOUL EATER 1","CHUM"," ULTIMATE SOUL EATER 3","HALLOWED SKULL"," ULTIMATE SOUL EATER 2"," ULTIMATE SOUL EATER 5"," ULTIMATE SOUL EATER 4","MAGMA CREAM","ENCHANTED COMPOST"," CHANCE 2","ENCHANTED MITHRIL","RED GIFT"," CHANCE 1","ROUGH PERIDOT GEM","FEL PEARL"," CHANCE 5"," CHANCE 4","ENCHANTED FEATHER","ENCHANTED OAK LOG"," CHANCE 3"," GREEN THUMB 5"," KNOCKBACK 2","WHITE GIFT","FLAWLESS AQUAMARINE GEM"," KNOCKBACK 1"," GREEN THUMB 1"," ULTIMATE FLASH 2"," ULTIMATE FLASH 1"," GREEN THUMB 2","NETHER STALK"," GREEN THUMB 3"," ULTIMATE FLASH 4"," GREEN THUMB 4"," ULTIMATE FLASH 3"," FIRST STRIKE 1","HORSEMAN CANDLE","RED ROSE"," FIRST STRIKE 5"," ULTIMATE FLASH 5"," FIRST STRIKE 4"," FIRST STRIKE 3"," FIRST STRIKE 2","GOLDEN BALL","BURNING EYE","WRIGGLING LARVA"," TURBO PUMPKIN 1"," TURBO PUMPKIN 2"," TURBO PUMPKIN 3"," TURBO PUMPKIN 4"," TURBO PUMPKIN 5","EMPTY CHUM BUCKET","LEATHER","GIANT FRAGMENT BOULDER","MAGMA FISH","LAVA SHELL","SOUL STRING"," EXPERTISE 3"," EXPERTISE 2"," EXPERTISE 5"," EXPERTISE 4","ENCHANTED BREAD","FUMING POTATO BOOK"," EXPERTISE 1"," ULTIMATE FATAL TEMPO 5"," ULTIMATE FATAL TEMPO 3"," DEPTH STRIDER 2"," BLESSING 2","SULPHUR ORE"," ULTIMATE FATAL TEMPO 4","FLAWED SAPPHIRE GEM"," DEPTH STRIDER 3"," BLESSING 3"," ULTIMATE FATAL TEMPO 1"," ULTIMATE FATAL TEMPO 2"," BLESSING 1"," BLESSING 6","PERFECT SAPPHIRE GEM"," BLESSING 4","SNOW BLOCK"," BLESSING 5","ENCHANTED BAKED POTATO","AGARIMOO TONGUE","COMPACTOR","FROZEN BAUBLE","MANDRAA","PYROCLASTIC SCALE"," DEPTH STRIDER 1","SPOOKY SHARD"," CHAMPION 1"," CHAMPION 3"," CHAMPION 2"," CHAMPION 5","ENCHANTED POTATO","ENCHANTED LUSH BERBERIS"," CHAMPION 4","RADIOACTIVE VIAL"," CHAMPION 7","ENCHANTED SLIME BALL"," CHAMPION 6"," CHAMPION 9"," CHAMPION 8","BULKY STONE"," SNIPE 3","ENCHANTED RED MUSHROOM"," SNIPE 2"," SNIPE 1"," RESPIRATION 3"," ULTIMATE ONE FOR ALL 0"," ULTIMATE ONE FOR ALL 1"," SNIPE 4","TUNGSTEN KEY","FINE CITRINE GEM","GREAT WHITE TOOTH MEAL"," RESPIRATION 1"," RESPIRATION 2","BOOKWORM BOOK","FULL JAW FANGING KIT","ENCHANTED CAKE","PUMPKIN","WHEAT","NURSE SHARK TOOTH"," REFLECTION 5"," REFLECTION 4","TENTACLE MEAT"," ULTIMATE BANK 5"," ULTIMATE LEGION 1"," ULTIMATE BANK 2"," ULTIMATE BANK 1"," ULTIMATE LEGION 2"," ULTIMATE BANK 4","ENCHANTED SPIDER EYE"," ULTIMATE BANK 3"," REFLECTION 1"," ULTIMATE LEGION 5"," REFLECTION 3"," ULTIMATE LEGION 3"," ULTIMATE LEGION 4"," REFLECTION 2","RAW SOULFLOW"," TRIPLE STRIKE 1"," TRIPLE STRIKE 3"," TRIPLE STRIKE 2"," PROSPERITY 1","RAW FISH"," PROSPERITY 3","YOGGIE"," PROSPERITY 2","ICE HUNK","PERFECT JASPER GEM"," PROSPERITY 5"," HECATOMB 10"," PROSPERITY 4","CONTROL SWITCH"," COUNTER STRIKE 3","DIAMOND SPREADING"," COUNTER STRIKE 4"," COUNTER STRIKE 5","TIGHTLY TIED HAY BALE","NETHER STALK DISTILLATE","DIVER FRAGMENT","DARK CANDY"," WITHER HUNTER 0"," SPIKED HOOK 5","KADA LEAD"," SPIKED HOOK 6"," SPIKED HOOK 3"," SPIKED HOOK 4"," ULTIMATE FLOWSTATE 1","ESSENCE DIAMOND"," LETHALITY 1"," LETHALITY 2"," LETHALITY 3"," LETHALITY 4"," LETHALITY 5"," LETHALITY 6","GLACITE","PLANT MATTER"," CLEAVE 2","BLOOD STAINED COINS"," CLEAVE 1"," REJUVENATE 1","HUGE MUSHROOM 1"," CLEAVE 4","HUGE MUSHROOM 2"," CLEAVE 3"," CLEAVE 6"," CLEAVE 5"," VICIOUS 3"," REJUVENATE 5"," REJUVENATE 4"," VICIOUS 4"," REJUVENATE 3"," VICIOUS 5"," REJUVENATE 2","STRING"," ULTIMATE FLOWSTATE 3","CRUDE GABAGOOL"," ULTIMATE FLOWSTATE 2","DRAGON SCALE"," SPIKED HOOK 1"," SPIKED HOOK 2","ENCHANTED CACTUS GREEN","FRIGID HUSK","POISON SAMPLE","BOOSTER COOKIE","ENCHANTED COOKIE","AMALGAMATED CRIMSONITE NEW","BLAZE ASHES","STRONG FRAGMENT","MYCEL","AUTO SMELTER","WOOL"," TURBO CARROT 2"," TURBO CARROT 1","SPELL POWDER"," ULTIMATE REFRIGERATE 5"," GIANT KILLER 4","WHIPPED MAGMA CREAM"," GIANT KILLER 5"," GIANT KILLER 2","PERFECT AMBER GEM","DRAGON HORN"," GIANT KILLER 3"," GIANT KILLER 6","FLINT"," GIANT KILLER 7"," TRIPLE STRIKE 5","MAGMA CORE","DWARVEN TREASURE","TUNGSTEN","ENCHANTED SPRUCE LOG","HARDENED WOOD"," TRIPLE STRIKE 4"," ULTIMATE INFERNO 1","LUMINO FIBER"," ULTIMATE REFRIGERATE 1"," ULTIMATE INFERNO 3","ENCHANTED QUARTZ BLOCK"," ULTIMATE REFRIGERATE 2"," ULTIMATE INFERNO 2","HEAVY GABAGOOL"," ULTIMATE REFRIGERATE 3"," ULTIMATE INFERNO 5","MIXED MITE GEL"," ULTIMATE REFRIGERATE 4"," ULTIMATE INFERNO 4","GREEN CANDY","ECCENTRIC PAINTING","REAPER PEPPER"," AQUA AFFINITY 1","GRAVEL","ENCHANTED PACKED ICE","FLAMING HEART","ENCHANTED PRISMARINE SHARD","SPIRIT DECOY"," TURBO CARROT 4"," TURBO CARROT 3","HYPERGOLIC GABAGOOL","ENCHANTED CARROT STICK"," TURBO CARROT 5"," TURBO CANE 4"," TURBO CANE 3","DRILL ENGINE"," TURBO CANE 2"," TURBO CANE 1"," TURBO CANE 5","PERFECT CITRINE GEM","BOX OF SEEDS","VITAMIN DEATH","XLARGE ENCHANTED CHEST","THIRD MASTER STAR","PET ITEM TIER BOOST DROP","NETHERRACK","COMPOST","DARK QUEENS SOUL DROP","FERMENTO","CANDY CORN","MIDAS JEWEL","ASCENSION ROPE","PREMIUM FLESH","SQUASH","ROUGH AMETHYST GEM","FLAWLESS RUBY GEM","NULL ATOM","BLESSED BAIT","PURE MITHRIL","ROCK CANDY","GLACITE AMALGAMATION"," FORTUNE 1"," FORTUNE 2","LOG"," FORTUNE 3"," FORTUNE 4","SEARING STONE"," FLAME 2"," FLAME 1","ROUGH JADE GEM","ENCHANTED JUNGLE LOG","WOOD SINGULARITY","IRON INGOT","GEMSTONE MIXTURE"," DIVINE GIFT 3"," DIVINE GIFT 2"," DIVINE GIFT 1","SPIRIT BONE","ROUGH SAPPHIRE GEM","REVENANT VISCERA","MITE GEL"," GIANT KILLER 1","TARANTULA SILK","TITANIC EXP BOTTLE"," FRAIL 2"," FRAIL 1"," FRAIL 4","SUPER COMPACTOR 3000","SUPER EGG"," FRAIL 3"," FRAIL 6"," FRAIL 5","MITHRIL ORE","ENCHANTED PAPER","HOT STUFF","FLAWED AQUAMARINE GEM","WORM BAIT","SUSPICIOUS VIAL","HIGHLITE","DIRT BOTTLE","ARACHNE FANG","ROUGH TOPAZ GEM","ENCHANTED OBSIDIAN","ROUGH OPAL GEM"," EFFICIENCY 10","WEREWOLF SKIN"," SYPHON 3"," SYPHON 2"," SYPHON 5"," SYPHON 4","ENCHANTED RED SAND CUBE","ENCHANTED RAW FISH","BERBERIS FUEL INJECTOR"," EXECUTE 6"," INFINITE QUIVER 10"," EXECUTE 3","MAGMA CHUNK"," EXECUTE 2"," EXECUTE 5"," SYPHON 1"," EXECUTE 4"," LOOTING 4"," SMITE 7"," SCAVENGER 3"," SCAVENGER 4"," LOOTING 3"," SCAVENGER 1"," LOOTING 2"," EXECUTE 1","FUEL GABAGOOL"," SCAVENGER 2"," LOOTING 1"," CUBISM 2"," CUBISM 3"," SCAVENGER 5"," CUBISM 1","SHARK BAIT","JUNGLE KEY","FLAWED CITRINE GEM"," LOOTING 5","JERRY BOX BLUE","ENCHANTED SLIME BLOCK","SCORCHED BOOKS"," CUBISM 6","FINE SAPPHIRE GEM","SULPHUR"," CUBISM 4"," SMITE 1"," CUBISM 5"," SMITE 2","GOLDEN POWDER"," EXPERTISE 10"," SMITE 3"," SMITE 4","ENCHANTED CARROT"," SMITE 5"," SMITE 6","FINE AQUAMARINE GEM","ROTTEN FLESH","FINE PERIDOT GEM"," HECATOMB 2"," HECATOMB 3"," HECATOMB 1"," HECATOMB 6"," HECATOMB 7"," HECATOMB 4","DUNGEON CHEST KEY"," HECATOMB 5"," HECATOMB 8"," HECATOMB 9","GOLDEN FRAGMENT","INFLATABLE JERRY","FLAWED TOPAZ GEM"," SUNDER 1","LAPIS CRYSTAL","FINE AMETHYST GEM"," TRANSYLVANIAN 5","SAND:1","ENCHANTED RABBIT","MEDIUM ENCHANTED CHEST","SUPREME CHOCOLATE BAR","TOXIC ARROW POISON"," TRANSYLVANIAN 4"," SUNDER 4"," SUNDER 5"," SUNDER 2","MUTANT NETHER STALK"," SUNDER 3"," LUCK 6"," LUCK 7"," SUNDER 6"," LUCK 2","REFINED BOTTLE OF JYRRE","FLAWLESS AMBER GEM"," LUCK 3","ENCHANTED BLAZE POWDER"," LUCK 4"," LUCK 5","SUMMONING EYE","ENCHANTED SULPHUR CUBE"," INFINITE QUIVER 8"," INFINITE QUIVER 9","FISH BAIT"," INFINITE QUIVER 6"," INFINITE QUIVER 7"," LUCK 1"," ULTIMATE WISDOM 4"," TURBO POTATO 3"," INFINITE QUIVER 4"," BANE OF ARTHROPODS 2"," ULTIMATE WISDOM 5"," TURBO POTATO 4"," INFINITE QUIVER 5"," BANE OF ARTHROPODS 3"," TURBO POTATO 5"," INFINITE QUIVER 2"," INFINITE QUIVER 3"," BANE OF ARTHROPODS 1"," BANE OF ARTHROPODS 6"," ULTIMATE WISDOM 1"," BANE OF ARTHROPODS 7","WINTER WATER ORB"," INFINITE QUIVER 1"," ULTIMATE WISDOM 2"," TURBO POTATO 1"," BANE OF ARTHROPODS 4"," ULTIMATE WISDOM 3"," TURBO POTATO 2"," BANE OF ARTHROPODS 5"]