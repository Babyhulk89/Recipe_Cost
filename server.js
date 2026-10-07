import http from 'node:http';

const upstreamOrigin = 'https://recipecost-studio-h0fb5u.v2.appdeploy.ai';
const port = Number(process.env.PORT || 3000);

function rewriteCookie(cookie) {
  return cookie
    .replace(/;\s*Domain=[^;]+/gi, '')
    .replace(/;\s*SameSite=None/gi, '; SameSite=Lax');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}

function pickBase(cuisine = 'Any cuisine') {
  const key = String(cuisine).toLowerCase();
  if (key.includes('creole')) return { starch: 'long-grain rice', veg: 'bell pepper, celery, and onion', flavor: 'Creole seasoning, garlic, thyme, and bay', sauce: 'tomato-forward pan sauce', garnish: 'scallions and parsley' };
  if (key.includes('cajun')) return { starch: 'rice', veg: 'onion, celery, and bell pepper', flavor: 'Cajun seasoning, garlic, paprika, and thyme', sauce: 'savory skillet juices', garnish: 'scallions' };
  if (key.includes('ethiopian')) return { starch: 'injera or rice', veg: 'onion, tomato, and greens', flavor: 'berbere-style spice blend, garlic, and ginger', sauce: 'slow-cooked spiced sauce', garnish: 'fresh herbs' };
  if (key.includes('filipino')) return { starch: 'steamed rice', veg: 'garlic, onion, and green vegetables', flavor: 'soy, vinegar, garlic, black pepper, and bay', sauce: 'savory-tangy adobo-style glaze', garnish: 'scallions' };
  if (key.includes('puerto')) return { starch: 'rice or plantains', veg: 'sofrito vegetables', flavor: 'sofrito, adobo-style seasoning, oregano, and garlic', sauce: 'savory sofrito pan sauce', garnish: 'cilantro or culantro' };
  if (key.includes('korean')) return { starch: 'short-grain rice', veg: 'cabbage, scallion, and carrot', flavor: 'gochujang, sesame, garlic, and ginger', sauce: 'sweet-spicy savory glaze', garnish: 'sesame seeds and scallions' };
  if (key.includes('japanese')) return { starch: 'rice or noodles', veg: 'mushrooms and seasonal vegetables', flavor: 'soy, mirin-style sweetness, ginger, and sesame', sauce: 'light umami glaze', garnish: 'scallions' };
  if (key.includes('mexican')) return { starch: 'rice, corn, or tortillas', veg: 'peppers, onion, tomato, and corn', flavor: 'cumin, chile, garlic, lime, and oregano', sauce: 'salsa-style sauce', garnish: 'cilantro and lime' };
  if (key.includes('italian')) return { starch: 'pasta, polenta, or bread', veg: 'tomato, garlic, onion, and greens', flavor: 'garlic, basil, oregano, and olive oil', sauce: 'tomato-herb sauce', garnish: 'fresh basil' };
  return { starch: 'rice, potatoes, grains, or bread', veg: 'seasonal vegetables', flavor: 'garlic, herbs, pepper, and balanced seasoning', sauce: 'pan sauce', garnish: 'fresh herbs' };
}

function proteinName(value = 'Open choice', dietary = []) {
  const diets = Array.isArray(dietary) ? dietary.map(v => String(v).toLowerCase()) : [];
  if (diets.some(v => v.includes('vegan'))) return 'chickpeas';
  if (diets.some(v => v.includes('vegetarian'))) return 'tofu';
  if (String(value).toLowerCase() === 'open choice') return 'chicken';
  return String(value);
}


function currentSeason(month = new Date().getMonth() + 1) {
  if ([12, 1, 2].includes(month)) return 'Winter';
  if ([3, 4, 5].includes(month)) return 'Spring';
  if ([6, 7, 8].includes(month)) return 'Summer';
  return 'Fall';
}

function seasonalDefaults(season) {
  const map = {
    Spring: ['asparagus','peas','spinach','strawberries','radishes','fresh herbs','lemon'],
    Summer: ['tomatoes','corn','zucchini','peaches','berries','watermelon','fresh basil'],
    Fall: ['pumpkin','butternut squash','apples','sweet potatoes','mushrooms','cranberries','sage'],
    Winter: ['cabbage','kale','citrus','potatoes','carrots','parsnips','beans']
  };
  return map[season] || map.Fall;
}

function seasonalPage() {
  const season = currentSeason();
  const seasonalJson = JSON.stringify({
    Spring:['asparagus','peas','spinach','strawberries','radishes','fresh herbs','lemon'],
    Summer:['tomatoes','corn','zucchini','peaches','berries','watermelon','fresh basil'],
    Fall:['pumpkin','butternut squash','apples','sweet potatoes','mushrooms','cranberries','sage'],
    Winter:['cabbage','kale','citrus','potatoes','carrots','parsnips','beans']
  });
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Seasonal Kitchen | RecipeCost</title>' +
  '<style>:root{font-family:Inter,system-ui,sans-serif;color:#24123a;background:#faf7ff}*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#faf7ff,#fff)}header{padding:28px 20px;background:#24123a;color:white}header a{color:white;text-decoration:none}.wrap{max-width:1100px;margin:auto;padding:28px 20px}.hero{display:flex;justify-content:space-between;gap:20px;align-items:end;flex-wrap:wrap}.eyebrow{font-size:12px;font-weight:800;letter-spacing:.12em;color:#7c3aed}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin:22px 0}.card{background:white;border:1px solid #eadff7;border-radius:18px;padding:18px;box-shadow:0 8px 30px rgba(68,32,91,.08)}.card h3{margin:4px 0 8px}.chips{display:flex;flex-wrap:wrap;gap:8px}.chip{border:1px solid #d7c4ec;background:#fff;padding:8px 10px;border-radius:999px;cursor:pointer}.chip.active{background:#7c3aed;color:#fff;border-color:#7c3aed}label{display:grid;gap:6px;font-weight:700}select,input{padding:11px;border:1px solid #d7c4ec;border-radius:10px;background:white}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}button.primary{background:#7c3aed;color:white;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer}.result{margin-top:24px}.ingredients,.steps{display:grid;gap:8px}.row{padding:10px 12px;border-radius:10px;background:#f8f3fc}.muted{color:#695b74}.season{font-weight:800;color:#7c3aed}body[data-season="Spring"]{background:linear-gradient(135deg,#eefbf1,#fff7fb)}body[data-season="Summer"]{background:linear-gradient(135deg,#fff7d6,#e9f8ff)}body[data-season="Fall"]{background:linear-gradient(135deg,#fff0df,#f7e4d3)}body[data-season="Winter"]{background:linear-gradient(135deg,#edf5ff,#f9fcff)}body[data-season="Spring"] .eyebrow,body[data-season="Spring"] .season{color:#2f7d45}body[data-season="Summer"] .eyebrow,body[data-season="Summer"] .season{color:#d97706}body[data-season="Fall"] .eyebrow,body[data-season="Fall"] .season{color:#a14f16}body[data-season="Winter"] .eyebrow,body[data-season="Winter"] .season{color:#48658d}.media-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin:16px 0}.media-card{overflow:hidden;border-radius:16px;border:1px solid #eadff7;background:#fff}.media-card img{display:block;width:100%;height:auto}.media-label{padding:10px 12px;font-weight:800}</style></head><body data-season="' + season + '">' +
  '<header><div class="wrap"><a href="/">← RecipeCost Studio</a><h1>Seasonal Kitchen</h1><p>Seasonal meals, snacks, and soups in one place.</p></div></header><main class="wrap">' +
  '<div class="hero"><div><span class="eyebrow">SEASONAL EATERY</span><h2>Cook with the season</h2><p class="muted">Current seasonal focus: <span class="season">' + season + '</span></p></div></div>' +
  '<div class="grid"><section class="card"><span class="eyebrow">MEALS</span><h3>Seasonal Eats</h3><p>Breakfasts, lunches, dinners, bowls, casseroles, grilled meals, and comfort food around seasonal produce.</p></section><section class="card"><span class="eyebrow">SNACKS</span><h3>Seasonal Snacks</h3><p>Fruit snacks, baked bites, dips, bars, crunchy snacks, freezer snacks, and party snacks using seasonal ingredients.</p></section><section class="card"><span class="eyebrow">SOUPS</span><h3>Soup Kitchen</h3><p>Broth-based, creamy, chowder, bisque, stew, chili, noodle soup, bean soup, vegetable soup, gumbo, and more.</p></section></div>' +
  '<section class="card"><div class="grid">' +
  '<label>Category<select id="category"><option>Seasonal Meal</option><option>Seasonal Snack</option><option>Soup</option></select></label>' +
  '<label>Season<select id="season"><option>Spring</option><option>Summer</option><option>Fall</option><option>Winter</option></select></label>' +
  '<label>Style<select id="style"><option>Chef choice</option><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Sweet snack</option><option>Savory snack</option><option>High-protein snack</option><option>Fruit-based snack</option><option>Baked snack</option><option>No-cook snack</option><option>Party snack</option><option>Broth-based soup</option><option>Creamy soup</option><option>Vegetable soup</option><option>Bean soup</option><option>Noodle soup</option><option>Chicken soup</option><option>Seafood soup</option><option>Chowder</option><option>Bisque</option><option>Stew</option><option>Chili</option><option>Gumbo</option><option>Ramen-style</option><option>Pho-style</option><option>Tom yum-style</option><option>Lentil soup</option><option>Potato soup</option></select></label>' +
  '<label>Cuisine<select id="cuisine"><option>Global fusion</option><option>American</option><option>Southern</option><option>Creole</option><option>Cajun</option><option>Mexican</option><option>Italian</option><option>Caribbean</option><option>West African</option><option>Ethiopian</option><option>Indian</option><option>Japanese</option><option>Korean</option><option>Filipino</option><option>Vietnamese</option><option>Mediterranean</option></select></label>' +
  '<label>Servings<input id="servings" type="number" min="1" max="100000" value="4"/></label></div>' +
  '<p class="muted">Seasonal ingredient ideas</p><div id="seasonFoods" class="chips"></div><div class="actions"><button class="primary" id="generate">Generate seasonal recipe</button></div></section><section id="result" class="result"></section></main>' +
  '<script>const seasonFoods=' + seasonalJson + ';const selected=new Set();const seasonEl=document.getElementById("season");seasonEl.value=' + JSON.stringify(season) + ';function updateTheme(){document.body.dataset.season=seasonEl.value;document.querySelector(".season").textContent=seasonEl.value}function paintFoods(){const box=document.getElementById("seasonFoods");box.innerHTML="";(seasonFoods[seasonEl.value]||[]).forEach(food=>{const b=document.createElement("button");b.className="chip"+(selected.has(food)?" active":"");b.textContent=food;b.onclick=()=>{selected.has(food)?selected.delete(food):selected.add(food);paintFoods()};box.appendChild(b)})}seasonEl.onchange=()=>{selected.clear();updateTheme();paintFoods()};updateTheme();paintFoods();document.getElementById("generate").onclick=async()=>{const category=document.getElementById("category").value,style=document.getElementById("style").value,season=seasonEl.value;const recipeType=category==="Seasonal Snack"?"Snack":"Meal";const body={recipeType,subtype:category==="Soup"?"Soup / "+style:style,cuisine:document.getElementById("cuisine").value,servings:Number(document.getElementById("servings").value||4),foodSelections:[...selected],prompt:season+" "+category+" using seasonal ingredients",season,meal:category==="Soup"?"Soup / salad":style};const r=await fetch("/railway-api/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const data=await r.json();const x=data.recipe;const out=document.getElementById("result");out.innerHTML="<section class=\\"card\\"><span class=\\"eyebrow\\">"+season.toUpperCase()+" · "+category.toUpperCase()+"</span><h2>"+x.title+"</h2><p>"+x.summary+"</p><h3>Ingredients</h3><div class=\\"ingredients\\">"+x.ingredients.map(i=>"<div class=\\"row\\"><strong>"+i.amount+" "+i.unit+" "+i.name+"</strong><div class=\\"muted\\">"+i.notes+"</div></div>").join("")+"</div><h3>Instructions</h3><div class=\\"steps\\">"+x.instructions.map(s=>"<div class=\\"row\\"><strong>"+s.step+". "+s.title+"</strong><div>"+s.detail+"</div><div class=\\"muted\\">"+s.tip+"</div></div>").join("")+"</div></section>"};</script></body></html>';
}


function escapeXml(value = '') {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[ch]));
}

function visualFrame(input = {}) {
  const title = escapeXml(input.title || 'RecipeCost Cookthrough');
  const cuisine = escapeXml(input.cuisine || 'RecipeCost');
  const stepTitle = escapeXml(input.stepTitle || 'Cooking step');
  const detail = escapeXml(input.stepDetail || 'Follow the recipe instructions for this stage.');
  const wrapped = String(detail).match(/.{1,58}(?:\s|$)/g)?.slice(0, 5) || [detail];
  const lines = wrapped.map((line, i) => '<text x="90" y="' + (360 + i * 42) + '" font-family="Inter,Arial,sans-serif" font-size="27" fill="#4b3f53">' + escapeXml(line.trim()) + '</text>').join('');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">' +
    '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7efff"/><stop offset="1" stop-color="#fff7ed"/></linearGradient></defs>' +
    '<rect width="1280" height="720" fill="url(#bg)"/>' +
    '<circle cx="1040" cy="170" r="120" fill="#7c3aed" opacity=".10"/>' +
    '<circle cx="1130" cy="560" r="180" fill="#f59e0b" opacity=".10"/>' +
    '<rect x="64" y="56" width="1152" height="608" rx="34" fill="#ffffff" stroke="#eadff7" stroke-width="3"/>' +
    '<text x="90" y="120" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="700" fill="#7c3aed">RECIPECOST VISUAL COOKTHROUGH · ' + cuisine + '</text>' +
    '<text x="90" y="188" font-family="Inter,Arial,sans-serif" font-size="46" font-weight="800" fill="#24123a">' + title + '</text>' +
    '<line x1="90" y1="225" x2="1190" y2="225" stroke="#eadff7" stroke-width="3"/>' +
    '<text x="90" y="298" font-family="Inter,Arial,sans-serif" font-size="38" font-weight="800" fill="#24123a">' + stepTitle + '</text>' +
    lines +
    '<rect x="90" y="590" width="330" height="46" rx="23" fill="#7c3aed"/>' +
    '<text x="255" y="621" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="700" fill="#fff">Step-by-step cooking frame</text>' +
    '</svg>';
  return { data: Buffer.from(svg, 'utf8').toString('base64'), mimeType: 'image/svg+xml' };
}

function buildRecipe(input = {}) {
  const servings = clamp(input.servings, 1, 100000);
  const cuisine = input.cuisine || 'Global fusion';
  const base = pickBase(cuisine);
  const protein = proteinName(input.protein, input.dietary);
  const recipeType = input.recipeType || 'Meal';
  const subtype = input.subtype || input.meal || recipeType;
  const prep = input.prepStyle || 'Not meal prep';
  const season = input.season || currentSeason();
  let selectedFoods = Array.isArray(input.foodSelections) ? input.foodSelections.slice(0, 8) : [];
  if (!selectedFoods.length && String(input.prompt || '').toLowerCase().includes('seasonal')) selectedFoods = seasonalDefaults(season).slice(0, 5);
  const allergyText = Array.isArray(input.allergies) && input.allergies.length ? input.allergies.join(', ') : 'none';
  const scale = Math.max(servings / 4, 0.25);
  const amount = (n) => Math.round(n * scale * 100) / 100;

  if (recipeType === 'Drink') {
    return {
      title: `${cuisine} ${subtype}`,
      summary: `A ${subtype.toLowerCase()} built around ${cuisine} flavors and scaled for ${servings} serving${servings === 1 ? '' : 's'}.`,
      cuisine, servings, prepMinutes: 10, cookMinutes: 0, difficulty: 'Beginner friendly',
      tasteSummary: 'Balanced, refreshing, and customizable.',
      portionGuide: `Plan about 12-16 oz per serving. For ${servings} servings, prepare in batches that fit the blender or beverage container.`,
      ingredients: [
        { name: 'liquid base', amount: amount(6), unit: 'cups', notes: 'water, milk, or plant milk as appropriate' },
        { name: 'fruit or flavor base', amount: amount(4), unit: 'cups', notes: selectedFoods.join(', ') || 'choose a compatible fruit or flavor' },
        { name: 'ice', amount: amount(4), unit: 'cups', notes: 'adjust for desired texture' },
        { name: 'sweetener', amount: amount(4), unit: 'tbsp', notes: 'optional, adjust to taste' }
      ],
      seasoningSuggestions: [{ name: base.flavor, use: 'Use lightly and adjust to taste.', why: 'Keeps the drink aligned with the selected cuisine.' }],
      foodSuggestions: [{ item: 'fresh fruit', role: 'garnish', why: 'Adds freshness and visual appeal.' }],
      tasteAdjustments: ['Add acidity for brightness.', 'Add sweetness gradually.', 'Thin with more liquid if needed.'],
      drinkPairings: [], snackPairings: [],
      instructions: [
        { step: 1, title: 'Prep', detail: 'Measure all ingredients and chill them if possible.', tip: 'Cold ingredients reduce the need for excess ice.' },
        { step: 2, title: 'Blend or mix', detail: 'Blend or whisk until smooth and evenly combined.', tip: 'Work in batches for large serving counts.' },
        { step: 3, title: 'Taste', detail: 'Adjust sweetness, acidity, and thickness before serving.', tip: 'Record the final batch ratio for consistency.' }
      ],
      howTo: [{ title: 'Batch scaling', detail: 'Scale the formula by batch size rather than overfilling equipment.' }, { title: 'Holding', detail: 'Keep cold beverages refrigerated or over ice until service.' }],
      equipment: ['measuring cups', 'blender or pitcher', 'serving cups'], tags: [recipeType, subtype, cuisine]
    };
  }

  const isSnack = recipeType === 'Snack';
  const isSoup = String(subtype).toLowerCase().includes('soup') || String(input.meal || '').toLowerCase().includes('soup') || String(input.prompt || '').toLowerCase().includes('soup');
  const title = isSoup ? `${cuisine} ${season} ${protein} Soup` : `${cuisine} ${protein} ${isSnack ? 'Snack' : subtype}`;
  const chosen = selectedFoods.length ? selectedFoods.join(', ') : base.veg;
  return {
    title,
    summary: `A practical ${cuisine} ${recipeType.toLowerCase()} featuring ${protein}, ${chosen}, and ${base.flavor}. Designed for ${servings} serving${servings === 1 ? '' : 's'}.`,
    cuisine, servings, prepMinutes: isSnack ? 10 : 20, cookMinutes: isSnack ? 15 : 30, difficulty: input.skill || 'Beginner friendly',
    tasteSummary: `${base.flavor}; balanced with ${base.sauce}.`,
    portionGuide: servings >= 50
      ? `Produce in multiple batches. Portion one serving per guest, hold hot food safely, and verify equipment capacity before service.`
      : `Serve one balanced portion per person with ${base.starch} and vegetables. Store leftovers promptly.`,
    ingredients: [
      { name: protein, amount: amount(isSnack ? 1 : 2), unit: 'lb', notes: 'or an equivalent dietary-safe substitute' },
      { name: base.starch, amount: amount(isSnack ? 1 : isSoup ? 1 : 2), unit: 'cups', notes: isSoup ? 'use as a soup grain, noodle, or hearty starch if appropriate' : 'adjust to recipe format' },
      ...(isSoup ? [{ name: 'broth or stock', amount: amount(6), unit: 'cups', notes: 'use vegetable, chicken, seafood, or other diet-appropriate broth' }] : []),
      { name: chosen, amount: amount(3), unit: 'cups', notes: 'use a coherent subset of selected foods' },
      { name: 'cooking oil', amount: amount(2), unit: 'tbsp', notes: 'use an allergy-safe oil' },
      { name: base.flavor, amount: amount(2), unit: 'tbsp', notes: 'season gradually' },
      { name: base.sauce, amount: amount(1), unit: 'cups', notes: 'adjust consistency as needed' },
      { name: base.garnish, amount: amount(0.5), unit: 'cups', notes: 'optional' }
    ],
    seasoningSuggestions: [
      { name: base.flavor, use: 'Season the main ingredients in layers.', why: `Supports a ${cuisine} flavor direction.` },
      { name: 'salt and acidity', use: 'Adjust at the end.', why: 'Balances the final dish.' }
    ],
    foodSuggestions: [
      { item: base.starch, role: 'base or side', why: 'Provides a culturally compatible serving foundation.' },
      { item: chosen, role: 'vegetable component', why: 'Adds variety, color, and texture.' }
    ],
    tasteAdjustments: ['Add acidity for brightness.', 'Add spice gradually.', 'Use more sauce for a richer finish.'],
    drinkPairings: input.drinkPreference === 'Off' ? [] : [{ name: 'Citrus sparkling water', type: 'non-alcoholic', audience: 'Adults', why: 'Refreshes the palate.' }],
    snackPairings: input.snackPreference === 'Off' ? [] : [{ name: 'Fresh fruit', type: 'light snack', audience: 'Kids', why: 'Adds a simple fresh option.' }],
    instructions: [
      { step: 1, title: 'Prep ingredients', detail: `Cut and measure ${protein}, ${chosen}, and the remaining ingredients.`, tip: `Avoid allergens: ${allergyText}.` },
      { step: 2, title: 'Build flavor', detail: `Heat oil and cook the aromatic vegetables with ${base.flavor} until fragrant.`, tip: 'Season in layers instead of all at once.' },
      { step: 3, title: isSoup ? 'Build the soup' : 'Cook the centerpiece', detail: isSoup ? `Add broth, ${protein}, ${chosen}, and ${base.starch}; simmer until tender and the flavors come together.` : `Add ${protein} and cook with the selected method until safely done.`, tip: isSoup ? 'Simmer gently so vegetables and proteins stay tender.' : 'Use a food thermometer for animal proteins.' },
      { step: 4, title: 'Add sauce and vegetables', detail: `Fold in ${chosen} and ${base.sauce}; cook until the vegetables reach the desired texture.`, tip: 'Keep textures distinct rather than overcooking.' },
      { step: 5, title: 'Finish and serve', detail: `Taste, adjust seasoning, add ${base.garnish}, and serve with ${base.starch}.`, tip: servings >= 50 ? 'Hold hot food at safe service temperature and replenish in batches.' : 'Rest briefly before serving.' }
    ],
    howTo: [
      { title: 'Meal-prep workflow', detail: prep === 'Not meal prep' ? 'Cool leftovers promptly and refrigerate in shallow containers.' : `For ${prep}, portion into labeled containers, cool quickly, refrigerate or freeze as appropriate, and reheat thoroughly.` },
      { title: 'Large-batch scaling', detail: servings >= 50 ? 'Divide total quantities by actual pan, grill, smoker, or pot capacity; schedule multiple production waves.' : 'Use normal household batch sizes.' }
    ],
    equipment: ['chef knife', 'cutting board', 'large skillet or pot', 'measuring tools', ...(servings >= 50 ? ['hotel pans or batch containers', 'food-safe holding equipment'] : [])],
    tags: [recipeType, subtype, cuisine, prep, ...(Array.isArray(input.dietary) ? input.dietary : [])]
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const path = (req.url || '').split('?')[0];
    if (req.method === 'GET' && path === '/seasonal') { res.statusCode = 200; res.setHeader('content-type','text/html; charset=utf-8'); res.end(seasonalPage()); return; }
    if (req.method === 'GET' && path === '/sw.js') { res.statusCode = 200; res.setHeader('content-type','application/javascript; charset=utf-8'); res.setHeader('cache-control','no-store, max-age=0'); res.end("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister().then(()=>self.clients.matchAll()).then(cs=>Promise.all(cs.map(c=>c.navigate(c.url))))));"); return; }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    if (req.method === 'POST' && (path === '/api/visual' || path === '/railway-api/visual')) {
      let input = {};
      try { input = body ? JSON.parse(body.toString('utf8')) : {}; } catch {}
      const image = visualFrame(input);
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ image }));
      return;
    }

    if (req.method === 'POST' && (path === '/api/generate' || path === '/railway-api/generate')) {
      let input = {};
      try { input = body ? JSON.parse(body.toString('utf8')) : {}; } catch {}
      const recipe = buildRecipe(input);
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ recipe }));
      return;
    }

    const target = new URL(req.url || '/', upstreamOrigin);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) continue;
      if (['host','content-length','connection'].includes(key.toLowerCase())) continue;
      headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }
    headers.set('x-forwarded-host', req.headers.host || '');
    headers.set('x-forwarded-proto', 'https');

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET','HEAD'].includes(req.method || 'GET') ? undefined : body,
      redirect: 'manual'
    });

    res.statusCode = upstream.status;
    for (const [key, value] of upstream.headers) {
      const lower = key.toLowerCase();
      if (['content-length','content-encoding','transfer-encoding','connection','set-cookie','location'].includes(lower)) continue;
      res.setHeader(key, value);
    }

    const cookies = typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];
    if (cookies.length) res.setHeader('set-cookie', cookies.map(rewriteCookie));

    const location = upstream.headers.get('location');
    if (location) {
      try {
        const loc = new URL(location, upstreamOrigin);
        if (loc.origin === upstreamOrigin) res.setHeader('location', loc.pathname + loc.search + loc.hash);
        else res.setHeader('location', location);
      } catch {
        res.setHeader('location', location);
      }
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let text = await upstream.text();
      text = text.replaceAll(upstreamOrigin, '');
      const railwayGuard = `<script>(function(){try{if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{})}const nativeFetch=window.fetch.bind(window);window.fetch=function(input,init){try{const url=typeof input==='string'?input:(input&&input.url)||'';const body=init&&typeof init.body==='string'?init.body:'';if(String(url).includes('/api/generate')||String(url).includes('api/generate')||body.includes('\\"/api/generate\\"')||body.includes('\\"path\\":\\"/api/generate\\"')){return nativeFetch('/railway-api/generate',{...(init||{}),method:'POST',headers:{'content-type':'application/json',...((init&&init.headers)||{})},body:init&&init.body?init.body:body})}}catch(e){}return nativeFetch(input,init)};const NativeXHR=window.XMLHttpRequest;window.XMLHttpRequest=function(){const xhr=new NativeXHR();let method='GET',url='';const open=xhr.open;xhr.open=function(m,u,...rest){method=m;url=String(u||'');if(url.includes('/api/generate')||url.includes('api/generate'))u='/railway-api/generate';return open.call(xhr,m,u,...rest)};const send=xhr.send;xhr.send=function(body){try{if((url.includes('/api/generate')||url.includes('api/generate'))&&method.toUpperCase()!=='POST')method='POST'}catch(e){}return send.call(xhr,body)};return xhr};window.XMLHttpRequest.prototype=NativeXHR.prototype}catch(e){console.error('RecipeCost Railway bridge init failed',e)}})();</script>`;
      text = text.replace('</head>', railwayGuard + '</head>');
      const seasonalLink = '<a href="/seasonal" style="position:fixed;right:18px;bottom:18px;z-index:99999;background:#7c3aed;color:#fff;padding:12px 16px;border-radius:999px;text-decoration:none;font:700 14px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.2)">Seasonal Kitchen · Soups</a>';
      text = text.replace('</body>', seasonalLink + '</body>');
      res.end(text);
    } else {
      res.end(Buffer.from(await upstream.arrayBuffer()));
    }
  } catch (error) {
    console.error('RecipeCost proxy error', error);
    res.statusCode = 502;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('RecipeCost is temporarily unavailable.');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log('RecipeCost Railway deployment listening on port', port);
});
