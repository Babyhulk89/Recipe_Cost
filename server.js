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

function buildRecipe(input = {}) {
  const servings = clamp(input.servings, 1, 100000);
  const cuisine = input.cuisine || 'Global fusion';
  const base = pickBase(cuisine);
  const protein = proteinName(input.protein, input.dietary);
  const recipeType = input.recipeType || 'Meal';
  const subtype = input.subtype || input.meal || recipeType;
  const prep = input.prepStyle || 'Not meal prep';
  const selectedFoods = Array.isArray(input.foodSelections) ? input.foodSelections.slice(0, 8) : [];
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
  const title = `${cuisine} ${protein} ${isSnack ? 'Snack' : subtype}`;
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
      { name: base.starch, amount: amount(isSnack ? 1 : 2), unit: 'cups', notes: 'adjust to recipe format' },
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
      { step: 3, title: 'Cook the centerpiece', detail: `Add ${protein} and cook with the selected method until safely done.`, tip: 'Use a food thermometer for animal proteins.' },
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
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    if (req.method === 'POST' && (req.url || '').split('?')[0] === '/api/generate') {
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
