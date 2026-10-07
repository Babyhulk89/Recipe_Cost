import http from 'node:http';

const upstreamOrigin = 'https://recipecost-studio-h0fb5u.v2.appdeploy.ai';
const port = Number(process.env.PORT || 3000);


const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const railwayAccountUrl = 'https://recipecost-studio-production.up.railway.app/account';

function jwtPayload(token = '') {
  try {
    const part = String(token).split('.')[1];
    if (!part) return null;
    const normalized = part.replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
  } catch { return null; }
}

function bearerToken(req) {
  const header = String(req.headers.authorization || '');
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

function sendJson(res, data, status = 200) {
  res.statusCode = status;
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('cache-control','no-store');
  res.end(JSON.stringify(data));
}

async function supabaseRequest(path, { method='GET', token='', body, prefer='', extraHeaders={} } = {}) {
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase is not configured.');
  const headers = new Headers(extraHeaders);
  headers.set('apikey', supabaseKey);
  if (token) headers.set('authorization','Bearer ' + token);
  if (body !== undefined) headers.set('content-type','application/json');
  if (prefer) headers.set('prefer', prefer);
  return fetch(supabaseUrl + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function supabaseJson(path, options = {}) {
  const r = await supabaseRequest(path, options);
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) {
    const message = data?.message || data?.msg || data?.error_description || data?.error || ('Supabase request failed (' + r.status + ')');
    const err = new Error(message);
    err.status = r.status;
    throw err;
  }
  return data;
}

function accountPage() {
  const key = JSON.stringify(supabaseKey);
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>RecipeCost Account</title>' +
  '<style>:root{font-family:Inter,system-ui,sans-serif;color:#352535;background:#fff6ed}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at top right,#ffe6d6 0,#fff6ed 34%,#fbefe8 100%)}.wrap{max-width:760px;margin:auto;padding:42px 18px}.card{background:#fff;border:1px solid #ead9df;border-radius:22px;padding:26px;box-shadow:0 18px 50px rgba(70,35,55,.12)}.brand{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.brand h1{margin:0 0 7px;font-size:34px}.brand a{color:#63364f;font-weight:850;text-decoration:none}.muted{color:#766570}.tabs{display:flex;gap:8px;margin:22px 0}.tabs button,.linkbtn{border:1px solid #dcc7d2;background:#fff;border-radius:11px;padding:10px 14px;font-weight:850;cursor:pointer}.tabs button.active{background:#63364f;color:#fff;border-color:#63364f}label{display:grid;gap:7px;font-weight:800;margin:13px 0}input{padding:12px;border:1px solid #d9cbd2;border-radius:11px;background:#fffaf7}.primary{width:100%;border:0;border-radius:12px;background:#63364f;color:#fff;padding:13px;font-weight:900;cursor:pointer}.notice{margin:14px 0;padding:12px 14px;border-radius:11px;background:#f4edf1}.error{background:#fff0ed;color:#96392e}.signed,.reset{display:none}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.actions button{width:auto}.small{font-size:12px}</style></head><body><main class="wrap"><section class="card"><div class="brand"><div><h1>RecipeCost Account</h1><p class="muted">Your personal email account for saved recipes, meal plans, pantry, family and spending.</p></div><a href="/">Back to RecipeCost</a></div>' +
  '<div id="signed" class="signed"><div class="notice">Signed in as <strong id="signedEmail"></strong></div><div class="actions"><button id="continueBtn" class="primary">Continue to RecipeCost</button><button id="logout" class="linkbtn">Sign out</button></div></div>' +
  '<div id="reset" class="reset"><h2>Choose a new password</h2><form id="resetForm"><label>New password<input id="newPassword" type="password" minlength="6" required autocomplete="new-password"/></label><button class="primary">Update password</button></form></div>' +
  '<div id="authBox"><div class="tabs"><button id="loginTab" class="active" type="button">Sign in</button><button id="signupTab" type="button">Create account</button></div><form id="form"><label>Email<input id="email" type="email" autocomplete="email" required/></label><label>Password<input id="password" type="password" minlength="6" autocomplete="current-password" required/></label><button id="submit" class="primary" type="submit">Sign in</button></form><div class="actions"><button id="forgot" class="linkbtn" type="button">Forgot password</button></div><div id="msg"></div><p class="muted small">New accounts may require email confirmation. RecipeCost never sends your password to AppDeploy.</p></div></section></main>' +
  '<script>const SB_KEY=' + key + ';let mode="login";const sessionKey="rc_supabase_session",msg=document.getElementById("msg"),authBox=document.getElementById("authBox"),signed=document.getElementById("signed"),reset=document.getElementById("reset");function esc(v){return String(v||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",\'"\':"&quot;"}[c]))}function saveSession(v){localStorage.setItem(sessionKey,JSON.stringify(v))}function readSession(){try{return JSON.parse(localStorage.getItem(sessionKey)||"null")}catch{return null}}function showUser(s){authBox.style.display="none";reset.style.display="none";signed.style.display="block";document.getElementById("signedEmail").textContent=(s&&s.user&&s.user.email)||"your account"}function setMode(v){mode=v;loginTab.classList.toggle("active",v==="login");signupTab.classList.toggle("active",v==="signup");submit.textContent=v==="login"?"Sign in":"Create account";password.autocomplete=v==="login"?"current-password":"new-password";msg.innerHTML=""}loginTab.onclick=()=>setMode("login");signupTab.onclick=()=>setMode("signup");continueBtn.onclick=()=>location.href="/";logout.onclick=()=>{localStorage.removeItem(sessionKey);location.href="/"};const hash=new URLSearchParams(location.hash.replace(/^#/,""));if(hash.get("access_token")){const recovered={access_token:hash.get("access_token"),refresh_token:hash.get("refresh_token"),expires_in:Number(hash.get("expires_in")||3600),token_type:"bearer",user:null};saveSession(recovered);history.replaceState(null,"",location.pathname);if(hash.get("type")==="recovery"){authBox.style.display="none";signed.style.display="none";reset.style.display="block"}else location.href="/"}else{const existing=readSession();if(existing&&existing.access_token)showUser(existing)}form.onsubmit=async(e)=>{e.preventDefault();msg.innerHTML="";const r=await fetch(mode==="login"?"/railway-auth/login":"/railway-auth/signup",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:email.value.trim(),password:password.value})});const d=await r.json().catch(()=>({error:"Request failed"}));if(!r.ok){msg.innerHTML="<div class=\\"notice error\\">"+esc(d.error||"Authentication failed")+"</div>";return}if(d.session&&d.session.access_token){saveSession(d.session);location.href="/";return}msg.innerHTML="<div class=\\"notice\\">Account created. Check your email to confirm it, then return here and sign in.</div>"};forgot.onclick=async()=>{if(!email.value.trim()){msg.innerHTML="<div class=\\"notice error\\">Enter your email address first.</div>";return}const r=await fetch("/railway-auth/recover",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:email.value.trim()})});const d=await r.json().catch(()=>({}));msg.innerHTML=r.ok?"<div class=\\"notice\\">Password reset email sent. Use the link in that email to return here.</div>":"<div class=\\"notice error\\">"+esc(d.error||"Reset email could not be sent.")+"</div>"};resetForm.onsubmit=async(e)=>{e.preventDefault();const s=readSession();const r=await fetch("/railway-auth/reset",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({accessToken:s&&s.access_token,password:newPassword.value})});const d=await r.json().catch(()=>({}));if(!r.ok){msg.innerHTML="<div class=\\"notice error\\">"+esc(d.error||"Password could not be updated.")+"</div>";return}location.href="/account"};</script></body></html>';
}

function rewriteAuthBundle(js) {
  const sbUrl = JSON.stringify(supabaseUrl);
  const sbKey = JSON.stringify(supabaseKey);
  js = js.replace(
    'async signIn(p){var z=',
    'async signIn(p){location.href="/account";return new Promise(()=>{});var z='
  );
  js = js.replace(
    'async getUser(){const p=await this.getAccessToken();return p?ie(p):null}',
    'async getUser(){try{const p=await this.getAccessToken();if(!p)return null;const z=rn(p);return z?{userId:z.sub,email:z.email,name:z.name||z.user_metadata?.full_name||z.email?.split("@")[0],picture:z.picture||z.user_metadata?.avatar_url,scope:z.scope||""}:null}catch{return null}}'
  );
  js = js.replace(
    'async getAccessToken(){const p=fn();return!p||!p.accessToken?null:se(p.accessToken)?await ze():p.accessToken}',
    'async getAccessToken(){try{let p=JSON.parse(localStorage.getItem("rc_supabase_session")||"null");if(!p||!p.access_token)return null;if(!se(p.access_token))return p.access_token;if(!p.refresh_token)return null;const z=await fetch(' + sbUrl + '+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"apikey":' + sbKey + ',"Content-Type":"application/json"},body:JSON.stringify({refresh_token:p.refresh_token})});if(!z.ok){localStorage.removeItem("rc_supabase_session");return null}p=await z.json();localStorage.setItem("rc_supabase_session",JSON.stringify(p));return p.access_token}catch{return null}}'
  );
  js = js.replace(
    'async signOut(){try{',
    'async signOut(){localStorage.removeItem("rc_supabase_session");location.reload();return;try{'
  );
  js = js.replace(
    'isSignedIn(){const p=fn();return p?!se(p.accessToken)||!!p.refreshToken:!1}',
    'isSignedIn(){try{const p=JSON.parse(localStorage.getItem("rc_supabase_session")||"null");return!!(p&&p.access_token&&(!se(p.access_token)||p.refresh_token))}catch{return!1}}'
  );
  js = js.replaceAll('https://recipecost-studio-h0fb5u.v2.appdeploy.ai/','https://recipecost-studio-production.up.railway.app/');
  return js;
}

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


function seasonalMediaSvg(title, season, animated = false) {
  const themes = {
    Spring:{bg1:'#eefbf1',bg2:'#fff7fb',accent:'#2f7d45',glow:'#f2c7dc'},
    Summer:{bg1:'#fff7d6',bg2:'#e9f8ff',accent:'#d97706',glow:'#8fd3ff'},
    Fall:{bg1:'#fff0df',bg2:'#f7e4d3',accent:'#a14f16',glow:'#d69b62'},
    Winter:{bg1:'#edf5ff',bg2:'#f9fcff',accent:'#48658d',glow:'#b9d8f5'}
  };
  const t=themes[season] || themes.Fall;
  const safe=escapeXml(title || 'Seasonal Recipe');
  const motion=animated
    ? '<animate attributeName="cy" values="330;292;330" dur="2s" repeatCount="indefinite"/>'
    : '';
  const motion2=animated
    ? '<animate attributeName="cx" values="675;720;675" dur="2.6s" repeatCount="indefinite"/>'
    : '';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="' + t.bg1 + '"/><stop offset="1" stop-color="' + t.bg2 + '"/></linearGradient></defs>' +
    '<rect width="1200" height="720" fill="url(#g)"/><circle cx="950" cy="130" r="170" fill="' + t.glow + '" opacity=".55"/>' +
    '<circle cx="600" cy="390" r="245" fill="#fff" stroke="#e7dfd7" stroke-width="12"/><circle cx="600" cy="390" r="150" fill="' + t.accent + '" opacity=".14"/>' +
    '<circle cx="520" cy="330" r="48" fill="#d98c4f">' + motion + '</circle><circle cx="675" cy="410" r="58" fill="#7fa85e">' + motion2 + '</circle><circle cx="665" cy="315" r="40" fill="#e8b25c"/><circle cx="535" cy="450" r="38" fill="#b76e5f"/>' +
    '<text x="70" y="95" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="800" fill="' + t.accent + '">' + (animated ? 'RECIPECOST COOKING CLIP' : 'RECIPECOST DISH VISUAL') + '</text>' +
    '<text x="70" y="160" font-family="Inter,Arial,sans-serif" font-size="52" font-weight="900" fill="#24123a">' + safe + '</text>' +
    (animated ? '<text x="600" y="650" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="25" fill="#5d5364">Prep → cook → finish → serve</text>' : '') +
    '</svg>';
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
  '<div class="grid"><section class="card"><span class="eyebrow">MEALS</span><h3>Seasonal Eats</h3><p>Breakfasts, lunches, dinners, bowls, casseroles, grilled meals, and comfort food around seasonal produce.</p></section><section class="card"><span class="eyebrow">SNACKS</span><h3>Seasonal Snacks</h3><p>Cookies, brownies, cakes, cupcakes, pies, cobblers, pastries, puddings, cheesecakes, frozen treats, candy-style sweets, dessert bars, and fruit desserts using seasonal flavors.</p></section><section class="card"><span class="eyebrow">SOUPS</span><h3>Soup Kitchen</h3><p>Broth-based, creamy, chowder, bisque, stew, chili, noodle soup, bean soup, vegetable soup, gumbo, and more.</p></section></div>' +
  '<section class="card"><div class="grid">' +
  '<label>Category<select id="category"><option>Seasonal Meal</option><option>Seasonal Snack</option><option>Soup</option></select></label>' +
  '<label>Season<select id="season"><option>Spring</option><option>Summer</option><option>Fall</option><option>Winter</option></select></label>' +
  '<label>Style<select id="style"><option>Chef choice</option><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Chef choice dessert</option><option>Cookies</option><option>Brownies / blondies</option><option>Cake</option><option>Cupcakes</option><option>Cheesecake</option><option>Pie / tart</option><option>Cobbler / crisp</option><option>Pastry</option><option>Donuts / fried sweets</option><option>Pudding / custard</option><option>Ice cream / frozen dessert</option><option>Candy / confection</option><option>Dessert bars</option><option>Fruit dessert</option><option>Chocolate dessert</option><option>Caramel dessert</option><option>No-bake dessert</option><option>Broth-based soup</option><option>Creamy soup</option><option>Vegetable soup</option><option>Bean soup</option><option>Noodle soup</option><option>Chicken soup</option><option>Seafood soup</option><option>Chowder</option><option>Bisque</option><option>Stew</option><option>Chili</option><option>Gumbo</option><option>Ramen-style</option><option>Pho-style</option><option>Tom yum-style</option><option>Lentil soup</option><option>Potato soup</option></select></label>' +
  '<label>Cuisine<select id="cuisine"><option>Global fusion</option><option>American</option><option>Southern</option><option>Creole</option><option>Cajun</option><option>Mexican</option><option>Italian</option><option>Caribbean</option><option>West African</option><option>Ethiopian</option><option>Indian</option><option>Japanese</option><option>Korean</option><option>Filipino</option><option>Vietnamese</option><option>Mediterranean</option></select></label>' +
  '<label>Servings<input id="servings" type="number" min="1" max="100000" value="4"/></label></div>' +
  '<p class="muted">Seasonal ingredient ideas</p><div id="seasonFoods" class="chips"></div><div class="actions"><button class="primary" id="generate">Generate seasonal recipe</button></div></section><section id="result" class="result"></section></main>' +
  '<script>const seasonFoods=' + seasonalJson + ';const selected=new Set();const seasonEl=document.getElementById("season");seasonEl.value=' + JSON.stringify(season) + ';function updateTheme(){document.body.dataset.season=seasonEl.value;document.querySelector(".season").textContent=seasonEl.value}function paintFoods(){const box=document.getElementById("seasonFoods");box.innerHTML="";(seasonFoods[seasonEl.value]||[]).forEach(food=>{const b=document.createElement("button");b.className="chip"+(selected.has(food)?" active":"");b.textContent=food;b.onclick=()=>{selected.has(food)?selected.delete(food):selected.add(food);paintFoods()};box.appendChild(b)})}seasonEl.onchange=()=>{selected.clear();updateTheme();paintFoods()};updateTheme();paintFoods();document.getElementById("generate").onclick=async()=>{const category=document.getElementById("category").value,style=document.getElementById("style").value,season=seasonEl.value;const recipeType=category==="Seasonal Snack"?"Snack":"Meal";const body={recipeType,subtype:category==="Soup"?"Soup / "+style:style,cuisine:document.getElementById("cuisine").value,servings:Number(document.getElementById("servings").value||4),foodSelections:[...selected],prompt:season+" "+category+" using seasonal ingredients",season,meal:category==="Soup"?"Soup / salad":style};const r=await fetch("/railway-api/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const data=await r.json();const x=data.recipe;const out=document.getElementById("result");out.innerHTML="<section class=\\"card\\"><span class=\\"eyebrow\\">"+season.toUpperCase()+" · "+category.toUpperCase()+"</span><h2>"+x.title+"</h2><div class=\"media-grid\"><div class=\"media-card\"><img src=\"/media/image.svg?title="+encodeURIComponent(x.title)+"&season="+encodeURIComponent(season)+"\" alt=\""+x.title+"\"/><div class=\"media-label\">Dish image</div></div><div class=\"media-card\"><img src=\"/media/clip.svg?title="+encodeURIComponent(x.title)+"&season="+encodeURIComponent(season)+"\" alt=\"Animated cooking clip for "+x.title+"\"/><div class=\"media-label\">Cooking clip</div></div></div><p>"+x.summary+"</p><h3>Ingredients</h3><div class=\\"ingredients\\">"+x.ingredients.map(i=>"<div class=\\"row\\"><strong>"+i.amount+" "+i.unit+" "+i.name+"</strong><div class=\\"muted\\">"+i.notes+"</div></div>").join("")+"</div><h3>Instructions</h3><div class=\\"steps\\">"+x.instructions.map(s=>"<div class=\\"row\\"><strong>"+s.step+". "+s.title+"</strong><div>"+s.detail+"</div><div class=\\"muted\\">"+s.tip+"</div></div>").join("")+"</div></section>"};</script></body></html>';
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
  if (isSnack) {
    const style = String(subtype || 'Chef choice dessert');
    const key = style.toLowerCase();
    const seasonalSweet = selectedFoods.find((food) => /strawber|berry|berries|peach|apple|pumpkin|cranber|citrus|lemon|pear|cherry|mango|banana|coconut|sweet potato/.test(String(food).toLowerCase())) || ({ Spring:'strawberries', Summer:'peaches', Fall:'apples', Winter:'citrus' }[season] || 'berries');
    const dessertName = key.includes('cookie') ? seasonalSweet + ' Cookies' : key.includes('brown') || key.includes('blond') ? seasonalSweet + ' Brownies' : key.includes('cupcake') ? seasonalSweet + ' Cupcakes' : key.includes('cheesecake') ? seasonalSweet + ' Cheesecake' : key.includes('pie') || key.includes('tart') ? seasonalSweet + ' Pie' : key.includes('cobbler') || key.includes('crisp') ? seasonalSweet + ' Cobbler' : key.includes('pastry') ? seasonalSweet + ' Pastries' : key.includes('donut') || key.includes('fried') ? seasonalSweet + ' Donuts' : key.includes('pudding') || key.includes('custard') ? seasonalSweet + ' Pudding' : key.includes('ice cream') || key.includes('frozen') ? seasonalSweet + ' Ice Cream' : key.includes('candy') || key.includes('confection') ? seasonalSweet + ' Candy Bites' : key.includes('bar') ? seasonalSweet + ' Dessert Bars' : key.includes('chocolate') ? 'Chocolate ' + seasonalSweet + ' Squares' : key.includes('caramel') ? 'Caramel ' + seasonalSweet + ' Bars' : key.includes('no-bake') ? 'No-Bake ' + seasonalSweet + ' Cheesecake Cups' : key.includes('fruit') ? seasonalSweet + ' Dessert Cups' : key.includes('cake') ? seasonalSweet + ' Cake' : seasonalSweet + ' Dessert Bars';
    const cleanCuisine = /^any\b/i.test(String(cuisine).trim()) || /any cuisine/i.test(String(cuisine)) ? '' : String(cuisine).trim();
    const title = (cleanCuisine ? cleanCuisine + ' ' : '') + dessertName;
    const diets = Array.isArray(input.dietary) ? input.dietary.map(v => String(v).toLowerCase()) : [];
    const flourName = diets.some(v => v.includes('gluten')) ? 'gluten-free baking flour' : 'all-purpose flour';
    const milkName = diets.some(v => v.includes('dairy') || v.includes('vegan')) ? 'plant milk' : 'milk';
    const butterName = diets.some(v => v.includes('dairy') || v.includes('vegan')) ? 'plant-based butter' : 'butter';
    const eggName = diets.some(v => v.includes('vegan')) ? 'egg replacer' : 'eggs';
    return {
      title,
      summary: 'A true sweet dessert built around ' + seasonalSweet + ', with a rich bakery-style finish. Scaled for ' + servings + ' serving' + (servings === 1 ? '' : 's') + '.',
      cuisine, servings, prepMinutes: 15, cookMinutes: key.includes('no-bake') || key.includes('ice cream') ? 0 : 25, difficulty: input.skill || 'Beginner friendly',
      tasteSummary: 'Sweet, dessert-forward, rich, and balanced with seasonal flavor.',
      portionGuide: servings >= 50 ? 'Prepare in multiple dessert batches and portion individually for service.' : 'Serve one dessert portion per person.',
      ingredients: [
        { name: seasonalSweet, amount: amount(2), unit: 'cups', notes: 'fresh, frozen, pureed, or cooked depending on dessert style' },
        { name: flourName, amount: amount(2), unit: 'cups', notes: 'adjust for dessert style' },
        { name: 'sugar', amount: amount(1.25), unit: 'cups', notes: 'brown, white, or a combination' },
        { name: butterName, amount: amount(0.75), unit: 'cups', notes: 'softened or melted as appropriate' },
        { name: eggName, amount: amount(2), unit: 'count', notes: 'use a dietary-safe equivalent when needed' },
        { name: milkName, amount: amount(0.75), unit: 'cups', notes: 'adjust for desired consistency' },
        { name: 'vanilla extract', amount: amount(2), unit: 'tsp', notes: 'or a cuisine-compatible sweet aromatic' },
        { name: 'salt', amount: amount(0.5), unit: 'tsp', notes: 'balances sweetness' },
        { name: 'chocolate, caramel, glaze, or powdered sugar', amount: amount(0.75), unit: 'cups', notes: 'choose a finish that fits the dessert' }
      ],
      seasoningSuggestions: [
        { name: 'vanilla and warm spice', use: 'Use cinnamon, nutmeg, cardamom, or vanilla as appropriate.', why: 'Builds dessert aroma without making the sweet taste flat.' },
        { name: 'pinch of salt', use: 'Add to the batter or filling.', why: 'Balances sugar and intensifies chocolate, caramel, and fruit flavors.' }
      ],
      foodSuggestions: [
        { item: seasonalSweet, role: 'main dessert flavor', why: 'Keeps the snack clearly dessert-focused and seasonal.' },
        { item: 'whipped topping, glaze, chocolate, or ice cream', role: 'finish', why: 'Makes it feel like a complete sweet treat.' }
      ],
      tasteAdjustments: ['Add chocolate for deeper richness.','Add caramel for a buttery sweet finish.','Add citrus zest to brighten fruit desserts.','Dust with powdered sugar or add glaze for a bakery-style finish.'],
      drinkPairings: input.drinkPreference === 'Off' ? [] : [{ name: 'Cold milk or vanilla oat milk', type: 'non-alcoholic', audience: 'Family', why: 'Classic pairing for sweets and baked desserts.' }],
      snackPairings: [],
      instructions: [
        { step: 1, title: 'Prep the dessert base', detail: 'Measure the ingredients and prepare ' + seasonalSweet + ' for the selected dessert style.', tip: 'Avoid allergens: ' + allergyText + '.' },
        { step: 2, title: 'Mix', detail: 'Combine ' + flourName + ', sugar, ' + butterName + ', ' + eggName + ', ' + milkName + ', vanilla, and salt until the correct batter or dough texture forms.', tip: 'Do not overmix baked desserts.' },
        { step: 3, title: key.includes('no-bake') || key.includes('ice cream') ? 'Chill and set' : 'Bake', detail: key.includes('no-bake') || key.includes('ice cream') ? 'Fold in ' + seasonalSweet + ', portion, and chill or freeze until set.' : 'Fold in ' + seasonalSweet + ', portion into the correct pan or molds, and bake until set and lightly browned.', tip: 'Use visual doneness cues and cool before finishing.' },
        { step: 4, title: 'Finish', detail: 'Top with chocolate, caramel, glaze, powdered sugar, whipped topping, or another dessert-appropriate finish.', tip: 'Add the final topping after cooling unless the recipe calls for a warm glaze.' },
        { step: 5, title: 'Serve', detail: 'Cut or portion into dessert-size servings and serve as a sweet snack.', tip: servings >= 50 ? 'Use pre-portioned trays or cups for faster service.' : 'Serve slightly warm, chilled, or room temperature depending on the dessert.' }
      ],
      howTo: [
        { title: 'Dessert batching', detail: servings >= 50 ? 'Bake or chill in multiple batches based on pan, freezer, and refrigerator capacity.' : 'Use standard household pan sizes and cool fully before storing.' },
        { title: 'Storage', detail: 'Store baked sweets airtight; refrigerate custard, cheesecake, cream, and dairy-based desserts promptly.' }
      ],
      equipment: ['mixing bowls','measuring tools','whisk or mixer'].concat(key.includes('no-bake') ? ['refrigerator'] : ['baking pan or sheet','oven']).concat(servings >= 50 ? ['sheet pans','cooling racks','portion containers'] : []),
      tags: ['Snack','Dessert','Sweet',style,cuisine,season].concat(Array.isArray(input.dietary) ? input.dietary : [])
    };
  }
  const isSoup = String(subtype).toLowerCase().includes('soup') || String(input.meal || '').toLowerCase().includes('soup') || String(input.prompt || '').toLowerCase().includes('soup');
  const cleanProtein = String(protein).replace(/\s*\/.*$/,'').trim();
  const title = isSoup ? `${cuisine} ${cleanProtein} Soup` : isSnack ? `${cuisine} ${cleanProtein} Bites` : `${cuisine} ${cleanProtein} ${String(subtype).toLowerCase().includes('breakfast') ? 'Breakfast' : String(subtype).toLowerCase().includes('brunch') ? 'Brunch' : 'Skillet'}`;
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



function milesBetween(lat1, lon1, lat2, lon2) {
  const r=3958.7613, d=Math.PI/180;
  const a=Math.sin((lat2-lat1)*d/2)**2 + Math.cos(lat1*d)*Math.cos(lat2*d)*Math.sin((lon2-lon1)*d/2)**2;
  return 2*r*Math.asin(Math.sqrt(a));
}

async function uploadCommunityPhoto(token, userId, photoData, photoMime) {
  const mime=photoMime==='image/png'?'image/png':'image/jpeg';
  const ext=mime==='image/png'?'png':'jpg';
  const path=userId+'/'+Date.now()+'.'+ext;
  const r=await fetch(supabaseUrl+'/storage/v1/object/community/'+path,{
    method:'POST',
    headers:{apikey:supabaseKey,authorization:'Bearer '+token,'content-type':mime,'x-upsert':'false'},
    body:Buffer.from(String(photoData||''),'base64')
  });
  if(!r.ok) throw new Error('Community photo upload failed.');
  return path;
}

async function handleCommunityApi(req,res,path,body) {
  if(path !== '/api/community') return false;
  if(req.method === 'GET') {
    let legacy=[];
    try {
      const r=await fetch(upstreamOrigin+'/api/community',{headers:{accept:'application/json'}});
      if(r.ok) legacy=(await r.json())?.items || [];
    } catch {}
    let local=[];
    try {
      const rows=await supabaseJson('/rest/v1/community_posts?select=id,author_name,recipe_title,note,social_url,photo_path,created_at&order=created_at.desc&limit=40');
      local=(rows||[]).map(r=>({id:r.id,authorName:r.author_name,recipeTitle:r.recipe_title,note:r.note,socialUrl:r.social_url,photoUrl:r.photo_path?(supabaseUrl+'/storage/v1/object/public/community/'+r.photo_path):'',createdAt:r.created_at}));
    } catch {}
    const merged=[...local,...legacy].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,60);
    sendJson(res,{items:merged}); return true;
  }
  if(req.method === 'POST') {
    const auth=authContext(req);
    if(!auth){sendJson(res,{error:'Please sign in to post to Community.'},401);return true;}
    const input=readBody(body);
    if(!String(input.note||'').trim() && !input.photoData){sendJson(res,{error:'Add a note or photo before posting.'},400);return true;}
    let socialUrl='';
    if(String(input.socialUrl||'').trim()){
      try{const u=new URL(String(input.socialUrl).trim());if(!['http:','https:'].includes(u.protocol))throw new Error();socialUrl=u.toString();}
      catch{sendJson(res,{error:'Social recipe URL is invalid.'},400);return true;}
    }
    try{
      const photoPath=input.photoData?await uploadCommunityPhoto(auth.token,auth.userId,input.photoData,input.photoMime):'';
      const rows=await supabaseJson('/rest/v1/community_posts',{method:'POST',token:auth.token,prefer:'return=representation',body:{user_id:auth.userId,author_name:auth.name||'RecipeCost cook',recipe_title:String(input.recipeTitle||'Community recipe').trim()||'Community recipe',note:String(input.note||'').trim(),social_url:socialUrl,photo_path:photoPath}});
      sendJson(res,{id:rows?.[0]?.id||null},201);
    }catch(e){sendJson(res,{error:e.message||'Community post could not be saved.'},e.status||500);}
    return true;
  }
  return false;
}

function readBody(body) {
  try { return body ? JSON.parse(body.toString('utf8')) : {}; } catch { return {}; }
}

function authContext(req) {
  const token = bearerToken(req);
  const claims = jwtPayload(token);
  return token && claims?.sub ? { token, userId:claims.sub, email:claims.email || '', name:claims.name || claims.user_metadata?.full_name || String(claims.email || '').split('@')[0] || 'RecipeCost user' } : null;
}

async function handleAccountAuth(req, res, path, body) {
  const input = readBody(body);
  if (req.method === 'POST' && path === '/railway-auth/login') {
    const email = String(input.email || '').trim();
    const password = String(input.password || '');
    if (!email || !password) { sendJson(res,{error:'Email and password are required.'},400); return true; }
    try {
      const session = await supabaseJson('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
      sendJson(res,{session});
    } catch (e) { sendJson(res,{error:e.message},e.status || 400); }
    return true;
  }
  if (req.method === 'POST' && path === '/railway-auth/signup') {
    const email = String(input.email || '').trim();
    const password = String(input.password || '');
    if (!email || !password) { sendJson(res,{error:'Email and password are required.'},400); return true; }
    try {
      const session = await supabaseJson('/auth/v1/signup?redirect_to=' + encodeURIComponent(railwayAccountUrl),{method:'POST',body:{email,password}});
      sendJson(res,{session:session?.access_token ? session : null,user:session?.user || null});
    } catch (e) { sendJson(res,{error:e.message},e.status || 400); }
    return true;
  }
  if (req.method === 'POST' && path === '/railway-auth/recover') {
    const email = String(input.email || '').trim();
    if (!email) { sendJson(res,{error:'Enter your email address.'},400); return true; }
    try {
      await supabaseJson('/auth/v1/recover?redirect_to=' + encodeURIComponent(railwayAccountUrl),{method:'POST',body:{email}});
      sendJson(res,{ok:true});
    } catch (e) { sendJson(res,{error:e.message},e.status || 400); }
    return true;
  }
  if (req.method === 'POST' && path === '/railway-auth/reset') {
    const accessToken = String(input.accessToken || '');
    const password = String(input.password || '');
    if (!accessToken || password.length < 6) { sendJson(res,{error:'A valid reset session and a password of at least 6 characters are required.'},400); return true; }
    try {
      const user = await supabaseJson('/auth/v1/user',{method:'PUT',token:accessToken,body:{password}});
      sendJson(res,{ok:true,user});
    } catch (e) { sendJson(res,{error:e.message},e.status || 400); }
    return true;
  }
  return false;
}

async function handlePrivateApi(req, res, path, body) {
  if (path === '/api/grocery-stores' && req.method === 'POST') {
    const auth=authContext(req); if(!auth){sendJson(res,{error:'Please sign in to find grocery stores.'},401);return true;}
    const input=readBody(body), location=String(input.location||'').trim(), items=(Array.isArray(input.items)?input.items:[]).map(v=>String(v).trim()).filter(Boolean).slice(0,60);
    if(!location){sendJson(res,{error:'A city, ZIP code, or location is required.'},400);return true;}
    if(!items.length){sendJson(res,{error:'At least one grocery item is required.'},400);return true;}
    try{
      const geoR=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q='+encodeURIComponent(location),{headers:{'User-Agent':'RecipeCost-Studio/1.0'}});
      if(!geoR.ok) throw new Error('Location lookup failed.');
      const geo=await geoR.json(); if(!geo.length){sendJson(res,{error:'Location was not found.'},404);return true;}
      const lat=Number(geo[0].lat),lon=Number(geo[0].lon);
      const q='[out:json][timeout:20];(nwr["shop"~"^(supermarket|grocery|convenience|greengrocer|butcher|seafood|bakery|deli)$"](around:12000,'+lat+','+lon+'););out center tags 80;';
      const pR=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'RecipeCost-Studio/1.0'},body:'data='+encodeURIComponent(q)});
      if(!pR.ok) throw new Error('Grocery store lookup failed.');
      const data=await pR.json(), keywords={butcher:['beef','steak','chicken','turkey','pork','ham','sausage','lamb','goat','meat'],seafood:['fish','salmon','tuna','shrimp','crab','lobster','shellfish','seafood','scallop'],greengrocer:['apple','banana','berry','orange','lemon','lime','fruit','lettuce','spinach','kale','tomato','pepper','onion','garlic','potato','carrot','vegetable','produce'],bakery:['bread','bun','roll','bagel','cake','pastry','tortilla','flour'],deli:['cheese','ham','turkey','salami','deli','sandwich']};
      const rows=(data.elements||[]).map(place=>{const t=place.tags||{},plat=place.lat??place.center?.lat,plon=place.lon??place.center?.lon;if(!t.name||plat==null||plon==null)return null;const shopType=t.shop||'grocery',broad=['supermarket','grocery','convenience'].includes(shopType),keys=keywords[shopType]||[],likelyItems=broad?items:items.filter(item=>keys.some(k=>item.toLowerCase().includes(k)));return{id:place.type+'-'+place.id,name:t.name,shopType,address:[t['addr:housenumber'],t['addr:street'],t['addr:city']].filter(Boolean).join(' '),website:t.website||t['contact:website']||'',distanceMiles:milesBetween(lat,lon,plat,plon),likelyItems,availabilityNote:'Store-type/category match only; item-level availability is not verified.',mapUrl:'https://www.openstreetmap.org/?mlat='+plat+'&mlon='+plon+'#map=18/'+plat+'/'+plon};}).filter(Boolean).sort((a,b)=>b.likelyItems.length-a.likelyItems.length||a.distanceMiles-b.distanceMiles||a.name.localeCompare(b.name)).slice(0,12);
      sendJson(res,{location:geo[0].display_name||location,source:'OpenStreetMap',items:rows});
    }catch(e){sendJson(res,{error:e.message||'Grocery store search failed.'},500);}
    return true;
  }

  if (path === '/api/event-vendors' && req.method === 'POST') {
    const auth=authContext(req); if(!auth){sendJson(res,{error:'Please sign in to search event vendors.'},401);return true;}
    const input=readBody(body), location=String(input.location||'').trim(), category=String(input.category||'all').trim()||'all';
    if(!location){sendJson(res,{error:'An event location is required.'},400);return true;}
    try{
      const geoR=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q='+encodeURIComponent(location),{headers:{'User-Agent':'RecipeCost-Studio/1.0'}});
      if(!geoR.ok) throw new Error('Location lookup failed.');
      const geo=await geoR.json(); if(!geo.length){sendJson(res,{error:'Location was not found.'},404);return true;}
      const lat=Number(geo[0].lat),lon=Number(geo[0].lon);
      const clauses={venue:['nwr["amenity"~"^(events_venue|conference_centre)$"]'],winery:['nwr["craft"="winery"]'],hotel:['nwr["tourism"~"^(hotel|motel|guest_house)$"]'],florist:['nwr["shop"="florist"]'],caterer:['nwr["craft"="caterer"]']};
      const chosen=category==='all'?Object.values(clauses).flat():(clauses[category]||clauses.venue);
      const q='[out:json][timeout:20];('+chosen.map(c=>c+'(around:30000,'+lat+','+lon+');').join('')+');out center tags 120;';
      const oR=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'RecipeCost-Studio/1.0'},body:'data='+encodeURIComponent(q)});
      if(!oR.ok) throw new Error('Event vendor lookup failed.');
      const data=await oR.json();
      const rows=(data.elements||[]).map(place=>{const t=place.tags||{},plat=place.lat??place.center?.lat,plon=place.lon??place.center?.lon;if(!t.name||plat==null||plon==null)return null;const found=t.craft==='winery'?'winery':t.shop==='florist'?'florist':['hotel','motel','guest_house'].includes(t.tourism||'')?'hotel':t.craft==='caterer'?'caterer':'venue';return{id:place.type+'-'+place.id,name:t.name,category:found,address:[t['addr:housenumber'],t['addr:street'],t['addr:city'],t['addr:state']].filter(Boolean).join(' '),website:t.website||t['contact:website']||'',phone:t.phone||t['contact:phone']||'',hours:t.opening_hours||'',mapUrl:'https://www.openstreetmap.org/?mlat='+plat+'&mlon='+plon+'#map=17/'+plat+'/'+plon,distanceMiles:milesBetween(lat,lon,plat,plon),sourceNote:'OpenStreetMap listing; event pricing, packages and availability are not verified.'};}).filter(Boolean).sort((a,b)=>a.distanceMiles-b.distanceMiles||a.name.localeCompare(b.name)).slice(0,24);
      sendJson(res,{location:geo[0].display_name||location,source:'OpenStreetMap',items:rows});
    }catch(e){sendJson(res,{error:e.message||'Event vendor search failed.'},500);}
    return true;
  }

  const privatePath =
    path.startsWith('/api/recipes') ||
    path.startsWith('/api/profile/dietary') ||
    path.startsWith('/api/grocery') ||
    path.startsWith('/api/plans') ||
    path.startsWith('/api/inventory') ||
    path.startsWith('/api/purchases') ||
    path.startsWith('/api/nutrition-log') ||
    path.startsWith('/api/spending') ||
    path.startsWith('/api/events') ||
    path.startsWith('/api/family');
  if (!privatePath) return false;

  const auth = authContext(req);
  if (!auth) { sendJson(res,{error:'Please sign in to your RecipeCost account.'},401); return true; }
  const input = readBody(body);
  const uid = auth.userId;
  const token = auth.token;
  const esc = encodeURIComponent;

  try {
    if (path === '/api/recipes' && req.method === 'GET') {
      const rows = await supabaseJson('/rest/v1/saved_recipes?select=id,recipe,created_at&user_id=eq.'+esc(uid)+'&order=created_at.desc',{token});
      sendJson(res,{items:(rows||[]).map(r=>({id:r.id,recipe:r.recipe,savedAt:r.created_at}))});
      return true;
    }
    if (path === '/api/recipes' && req.method === 'POST') {
      const recipe = input.recipe || {};
      const rows = await supabaseJson('/rest/v1/saved_recipes',{method:'POST',token,prefer:'return=representation',body:{user_id:uid,title:String(recipe.title||'Untitled recipe'),recipe}});
      sendJson(res,{item:rows?.[0] || null},201); return true;
    }
    if (path.startsWith('/api/recipes/') && req.method === 'DELETE') {
      const id = path.split('/').pop();
      await supabaseJson('/rest/v1/saved_recipes?id=eq.'+esc(id)+'&user_id=eq.'+esc(uid),{method:'DELETE',token});
      sendJson(res,{ok:true}); return true;
    }

    if (path === '/api/profile/dietary' && req.method === 'GET') {
      const rows = await supabaseJson('/rest/v1/dietary_profiles?select=dietary,allergies,avoid_foods,updated_at&user_id=eq.'+esc(uid)+'&limit=1',{token});
      const p=rows?.[0];
      sendJson(res,{profile:p?{dietary:p.dietary||[],allergies:p.allergies||[],avoidFoods:p.avoid_foods||'',updatedAt:p.updated_at}:null});
      return true;
    }
    if (path === '/api/profile/dietary' && req.method === 'PUT') {
      const rows = await supabaseJson('/rest/v1/dietary_profiles?on_conflict=user_id',{method:'POST',token,prefer:'resolution=merge-duplicates,return=representation',body:{user_id:uid,dietary:Array.isArray(input.dietary)?input.dietary:[],allergies:Array.isArray(input.allergies)?input.allergies:[],avoid_foods:String(input.avoidFoods||''),updated_at:new Date().toISOString()}});
      sendJson(res,{profile:rows?.[0] || null}); return true;
    }

    if (path === '/api/grocery' && req.method === 'GET') {
      const rows = await supabaseJson('/rest/v1/grocery_items?select=id,name,amount,unit,checked,recipe_title,created_at&user_id=eq.'+esc(uid)+'&order=created_at.desc',{token});
      const purchases = await supabaseJson('/rest/v1/purchase_history?select=name,purchased_at,source&user_id=eq.'+esc(uid)+'&order=purchased_at.desc&limit=100',{token});
      const latest=new Map();
      for(const p of purchases||[]) if(!latest.has(String(p.name).toLowerCase())) latest.set(String(p.name).toLowerCase(),p);
      const now=Date.now();
      sendJson(res,{items:(rows||[]).map(r=>{const p=latest.get(String(r.name).toLowerCase());return{id:r.id,name:r.name,amount:Number(r.amount),unit:r.unit,sourceTitle:r.recipe_title||'Manual',checked:Boolean(r.checked),recentPurchase:p?{purchaseDate:String(p.purchased_at).slice(0,10),daysAgo:Math.max(0,Math.floor((now-new Date(p.purchased_at).getTime())/86400000)),source:p.source}:null}})});
      return true;
    }
    if (path === '/api/grocery' && req.method === 'POST') {
      const rows=await supabaseJson('/rest/v1/grocery_items',{method:'POST',token,prefer:'return=representation',body:{user_id:uid,name:String(input.name||'').trim(),amount:Number(input.amount||1),unit:String(input.unit||'item'),checked:false,recipe_title:'Manual'}});
      sendJson(res,{item:rows?.[0]||null},201); return true;
    }
    if (path === '/api/grocery/bulk' && req.method === 'POST') {
      let added=0,merged=0;
      for(const item of Array.isArray(input.items)?input.items:[]) {
        const existing=await supabaseJson('/rest/v1/grocery_items?select=id,amount&user_id=eq.'+esc(uid)+'&checked=eq.false&name=ilike.'+esc(String(item.name||''))+'&limit=1',{token});
        if(existing?.[0]){
          await supabaseJson('/rest/v1/grocery_items?id=eq.'+esc(existing[0].id),{method:'PATCH',token,body:{amount:Number(existing[0].amount||0)+Number(item.amount||1),unit:String(item.unit||'item'),updated_at:new Date().toISOString()}});
          merged++;
        }else{
          await supabaseJson('/rest/v1/grocery_items',{method:'POST',token,body:{user_id:uid,name:String(item.name||'').trim(),amount:Number(item.amount||1),unit:String(item.unit||'item'),checked:false,recipe_title:String(input.recipeTitle||'Recipe')}});
          added++;
        }
      }
      sendJson(res,{added,merged}); return true;
    }
    if (path.startsWith('/api/grocery/') && req.method === 'PUT') {
      const id=path.split('/').pop();
      const current=(await supabaseJson('/rest/v1/grocery_items?select=*&id=eq.'+esc(id)+'&user_id=eq.'+esc(uid)+'&limit=1',{token}))?.[0];
      if(!current){sendJson(res,{error:'Grocery item not found.'},404);return true;}
      const checked=Boolean(input.checked);
      await supabaseJson('/rest/v1/grocery_items?id=eq.'+esc(id)+'&user_id=eq.'+esc(uid),{method:'PATCH',token,body:{checked,updated_at:new Date().toISOString()}});
      let purchaseRecorded=false;
      if(checked && !current.checked){
        const stamp=new Date().toISOString();
        await supabaseJson('/rest/v1/purchase_history',{method:'POST',token,body:{user_id:uid,name:current.name,quantity:Number(current.amount||1),unit:current.unit||'item',source:'Grocery',purchased_at:stamp}});
        await supabaseJson('/rest/v1/inventory_items',{method:'POST',token,body:{user_id:uid,name:current.name,quantity:Number(current.amount||1),unit:current.unit||'item',purchased_at:stamp,metadata:{source:'Grocery',price:0}}});
        purchaseRecorded=true;
      }
      sendJson(res,{ok:true,purchaseRecorded}); return true;
    }
    if (path.startsWith('/api/grocery/') && req.method === 'DELETE') {
      const id=path.split('/').pop();
      await supabaseJson('/rest/v1/grocery_items?id=eq.'+esc(id)+'&user_id=eq.'+esc(uid),{method:'DELETE',token});
      sendJson(res,{ok:true}); return true;
    }

    if (path === '/api/plans' && req.method === 'GET') {
      const rows=await supabaseJson('/rest/v1/meal_plans?select=id,title,plan_date,plan_time,servings,notes&user_id=eq.'+esc(uid)+'&order=plan_date.asc',{token});
      sendJson(res,{items:(rows||[]).map(r=>({id:r.id,title:r.title,date:r.plan_date,time:r.plan_time||'18:30',servings:Number(r.servings||1),notes:r.notes||''}))}); return true;
    }
    if (path === '/api/plans' && req.method === 'POST') {
      const rows=await supabaseJson('/rest/v1/meal_plans',{method:'POST',token,prefer:'return=representation',body:{user_id:uid,title:String(input.title||'Meal'),plan_date:String(input.date||new Date().toISOString().slice(0,10)),plan_time:String(input.time||'18:30'),servings:Number(input.servings||1),notes:String(input.notes||'')}});
      sendJson(res,{item:rows?.[0]||null},201); return true;
    }
    if (path.startsWith('/api/plans/') && req.method === 'DELETE') {
      const id=path.split('/').pop(); await supabaseJson('/rest/v1/meal_plans?id=eq.'+esc(id)+'&user_id=eq.'+esc(uid),{method:'DELETE',token}); sendJson(res,{ok:true}); return true;
    }

    if (path === '/api/inventory' && req.method === 'GET') {
      const rows=await supabaseJson('/rest/v1/inventory_items?select=id,name,quantity,unit,expires_at,purchased_at,metadata,created_at&user_id=eq.'+esc(uid)+'&order=created_at.desc',{token});
      sendJson(res,{items:(rows||[]).map(r=>({id:r.id,name:r.name,quantity:Number(r.quantity||0),unit:r.unit||'item',purchaseDate:r.purchased_at?String(r.purchased_at).slice(0,10):'',expirationDate:r.expires_at||'',source:r.metadata?.source||'Manual',price:Number(r.metadata?.price||0)}))}); return true;
    }
    if (path === '/api/inventory' && req.method === 'POST') {
      const purchased=input.purchaseDate?new Date(String(input.purchaseDate)+'T12:00:00Z').toISOString():new Date().toISOString();
      const rows=await supabaseJson('/rest/v1/inventory_items',{method:'POST',token,prefer:'return=representation',body:{user_id:uid,name:String(input.name||'').trim(),quantity:Number(input.quantity||1),unit:String(input.unit||'item'),expires_at:input.expirationDate||null,purchased_at:purchased,metadata:{source:String(input.source||'Manual'),price:Number(input.price||0)}}});
      sendJson(res,{item:rows?.[0]||null},201); return true;
    }
    if (path.startsWith('/api/inventory/') && req.method === 'PUT') {
      const id=path.split('/').pop(); const patch={};
      if(input.name!==undefined)patch.name=String(input.name);
      if(input.quantity!==undefined)patch.quantity=Number(input.quantity);
      if(input.unit!==undefined)patch.unit=String(input.unit);
      if(input.expirationDate!==undefined)patch.expires_at=input.expirationDate||null;
      patch.updated_at=new Date().toISOString();
      await supabaseJson('/rest/v1/inventory_items?id=eq.'+esc(id)+'&user_id=eq.'+esc(uid),{method:'PATCH',token,body:patch}); sendJson(res,{ok:true}); return true;
    }
    if (path.startsWith('/api/inventory/') && req.method === 'DELETE') {
      const id=path.split('/').pop(); await supabaseJson('/rest/v1/inventory_items?id=eq.'+esc(id)+'&user_id=eq.'+esc(uid),{method:'DELETE',token}); sendJson(res,{ok:true}); return true;
    }
    if (path === '/api/inventory/receipt' && req.method === 'POST') {
      sendJson(res,{added:0,warning:'Receipt OCR is not yet migrated to the Railway/Supabase account backend.'}); return true;
    }

    if (path === '/api/purchases' && req.method === 'GET') {
      const rows=await supabaseJson('/rest/v1/purchase_history?select=id,name,quantity,unit,purchased_at,source&user_id=eq.'+esc(uid)+'&order=purchased_at.desc',{token});
      sendJson(res,{items:(rows||[]).map(r=>({id:r.id,name:r.name,quantity:Number(r.quantity||0),unit:r.unit||'item',purchaseDate:String(r.purchased_at).slice(0,10),recordedAt:r.purchased_at,source:r.source||'Grocery'}))}); return true;
    }

    if (path === '/api/nutrition-log' && req.method === 'GET') {
      const rows=await supabaseJson('/rest/v1/nutrition_log?select=id,name,log_date,meal,calories,carbs_g,source,created_at&user_id=eq.'+esc(uid)+'&order=created_at.desc',{token});
      sendJson(res,{items:(rows||[]).map(r=>({id:r.id,name:r.name,date:r.log_date,meal:r.meal,calories:Number(r.calories||0),carbsG:Number(r.carbs_g||0),source:r.source,createdAt:r.created_at}))}); return true;
    }
    if (path === '/api/nutrition-log' && req.method === 'POST') {
      const rows=await supabaseJson('/rest/v1/nutrition_log',{method:'POST',token,prefer:'return=representation',body:{user_id:uid,name:String(input.name||'').trim(),log_date:String(input.date||new Date().toISOString().slice(0,10)),meal:String(input.meal||'Meal'),calories:Number(input.calories||0),carbs_g:Number(input.carbsG||0),source:String(input.source||'Manual')}});
      sendJson(res,{item:rows?.[0]||null},201); return true;
    }
    if (path.startsWith('/api/nutrition-log/') && req.method === 'DELETE') {
      const id=path.split('/').pop(); await supabaseJson('/rest/v1/nutrition_log?id=eq.'+esc(id)+'&user_id=eq.'+esc(uid),{method:'DELETE',token}); sendJson(res,{ok:true}); return true;
    }

    if (path === '/api/spending' && req.method === 'GET') {
      const rows=await supabaseJson('/rest/v1/spending_entries?select=id,name,category,amount,spend_date,kind,source,note,created_at&user_id=eq.'+esc(uid)+'&order=spend_date.desc',{token});
      sendJson(res,{items:(rows||[]).map(r=>({id:r.id,name:r.name,category:r.category,amount:Number(r.amount||0),date:r.spend_date,kind:r.kind,source:r.source,note:r.note,createdAt:r.created_at}))}); return true;
    }
    if (path === '/api/spending' && req.method === 'POST') {
      const rows=await supabaseJson('/rest/v1/spending_entries',{method:'POST',token,prefer:'return=representation',body:{user_id:uid,name:String(input.name||'').trim(),category:String(input.category||'Other'),amount:Number(input.amount||0),spend_date:String(input.date||new Date().toISOString().slice(0,10)),kind:input.kind==='planned'?'planned':'actual',source:String(input.source||'Manual'),note:String(input.note||'')}});
      sendJson(res,{item:rows?.[0]||null},201); return true;
    }
    if (path.startsWith('/api/spending/') && req.method === 'DELETE') {
      const id=path.split('/').pop(); await supabaseJson('/rest/v1/spending_entries?id=eq.'+esc(id)+'&user_id=eq.'+esc(uid),{method:'DELETE',token}); sendJson(res,{ok:true}); return true;
    }

    if (path === '/api/events' && req.method === 'GET') {
      const rows=await supabaseJson('/rest/v1/event_plans?select=*&user_id=eq.'+esc(uid)+'&order=created_at.desc',{token});
      sendJson(res,{items:(rows||[]).map(r=>({id:r.id,title:r.title,eventType:r.event_type,guests:r.guests,date:r.event_date||'',location:r.location,serviceStyle:r.service_style,cateringTier:r.catering_tier,budget:Number(r.budget||0),notes:r.notes,createdAt:r.created_at}))}); return true;
    }
    if (path === '/api/events' && req.method === 'POST') {
      const rows=await supabaseJson('/rest/v1/event_plans',{method:'POST',token,prefer:'return=representation',body:{user_id:uid,title:String(input.title||'Event'),event_type:String(input.eventType||'Other'),guests:Number(input.guests||1),event_date:input.date||null,location:String(input.location||''),service_style:String(input.serviceStyle||'Buffet'),catering_tier:String(input.cateringTier||''),budget:Number(input.budget||0),notes:String(input.notes||'')}});
      sendJson(res,{item:rows?.[0]||null},201); return true;
    }
    if (path.startsWith('/api/events/') && req.method === 'DELETE') {
      const id=path.split('/').pop(); await supabaseJson('/rest/v1/event_plans?id=eq.'+esc(id)+'&user_id=eq.'+esc(uid),{method:'DELETE',token}); sendJson(res,{ok:true}); return true;
    }

    if (path === '/api/family/profile' && req.method === 'POST') {
      const age=Math.max(1,Math.min(120,Number(input.age||18)));
      await supabaseJson('/rest/v1/profiles?on_conflict=user_id',{method:'POST',token,prefer:'resolution=merge-duplicates',body:{user_id:uid,display_name:auth.name,age,updated_at:new Date().toISOString()}});
      sendJson(res,{ok:true}); return true;
    }
    if (path === '/api/family/create' && req.method === 'POST') {
      const age=Math.max(18,Math.min(120,Number(input.age||18)));
      const code=Math.random().toString(36).slice(2,10).toUpperCase();
      const familyRows=await supabaseJson('/rest/v1/families',{method:'POST',token,prefer:'return=representation',body:{owner_user_id:uid,name:String(input.name||'Family').trim(),join_code:code}});
      const family=familyRows?.[0];
      if(family) await supabaseJson('/rest/v1/household_members',{method:'POST',token,body:{family_id:family.id,user_id:uid,name:auth.name,age,role:'parent',event_approved:true,approval_requested:false}});
      await supabaseJson('/rest/v1/profiles?on_conflict=user_id',{method:'POST',token,prefer:'resolution=merge-duplicates',body:{user_id:uid,display_name:auth.name,age,updated_at:new Date().toISOString()}});
      sendJson(res,{ok:true,joinCode:code}); return true;
    }
    if (path === '/api/family/join' && req.method === 'POST') {
      const age=Math.max(1,Math.min(120,Number(input.age||18)));
      await supabaseJson('/rest/v1/rpc/join_family_by_code',{method:'POST',token,body:{p_code:String(input.code||''),p_age:age,p_name:auth.name}});
      await supabaseJson('/rest/v1/profiles?on_conflict=user_id',{method:'POST',token,prefer:'resolution=merge-duplicates',body:{user_id:uid,display_name:auth.name,age,updated_at:new Date().toISOString()}});
      sendJson(res,{ok:true}); return true;
    }
    if (path === '/api/family/request-event' && req.method === 'POST') {
      await supabaseJson('/rest/v1/rpc/request_family_event_approval',{method:'POST',token,body:{}});
      sendJson(res,{ok:true}); return true;
    }
    if (path.startsWith('/api/family/members/') && path.endsWith('/approval') && req.method === 'PUT') {
      const parts=path.split('/'); const id=parts[4];
      await supabaseJson('/rest/v1/household_members?id=eq.'+esc(id),{method:'PATCH',token,body:{event_approved:Boolean(input.approved),approval_requested:false}});
      sendJson(res,{ok:true}); return true;
    }
    if (path === '/api/family' && req.method === 'GET') {
      const profile=(await supabaseJson('/rest/v1/profiles?select=age&user_id=eq.'+esc(uid)+'&limit=1',{token}))?.[0] || null;
      const current=(await supabaseJson('/rest/v1/household_members?select=*&user_id=eq.'+esc(uid)+'&limit=1',{token}))?.[0] || null;
      if(!current){
        const age=Number(profile?.age||18);
        sendJson(res,{profile:profile?{age}:null,family:null,currentMember:null,members:[],canEventPlan:age>=16,eventReason:age>=16?'Your account is old enough for Event Planning.':'Join a family and request parent or guardian approval.'});
        return true;
      }
      const family=(await supabaseJson('/rest/v1/families?select=id,name,join_code,owner_user_id&id=eq.'+esc(current.family_id)+'&limit=1',{token}))?.[0] || null;
      const members=await supabaseJson('/rest/v1/household_members?select=*&family_id=eq.'+esc(current.family_id)+'&order=joined_at.asc',{token});
      const mapMember=m=>({id:m.id,userId:m.user_id,name:m.name,age:Number(m.age||18),role:m.role,eventApproved:Boolean(m.event_approved),approvalRequested:Boolean(m.approval_requested),joinedAt:m.joined_at});
      const me=mapMember(current); const can=me.age>=16 || me.eventApproved;
      sendJson(res,{profile:profile?{age:Number(profile.age)}:{age:me.age},family:family?{id:family.id,name:family.name,...(['parent','guardian'].includes(me.role)?{joinCode:family.join_code}:{})}:null,currentMember:me,members:(members||[]).map(mapMember),canEventPlan:can,eventReason:can?'Event Planning access is available.':'A parent or guardian must approve Event Planning for this account.'});
      return true;
    }
  } catch (e) {
    console.error('RecipeCost private API error',path,e);
    sendJson(res,{error:e.message || 'Private account request failed.'},e.status || 500);
    return true;
  }
  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const path = (req.url || '').split('?')[0];
    if (req.method === 'GET' && path === '/account') { res.statusCode=200; res.setHeader('content-type','text/html; charset=utf-8'); res.setHeader('cache-control','no-store'); res.end(accountPage()); return; }
    if (req.method === 'GET' && path === '/seasonal') { res.statusCode = 200; res.setHeader('content-type','text/html; charset=utf-8'); res.end(seasonalPage()); return; }
    if (req.method === 'GET' && (path === '/media/image.svg' || path === '/media/clip.svg')) {
      const u = new URL(req.url || '/', 'https://recipecost.local');
      const svg = seasonalMediaSvg(u.searchParams.get('title') || 'Seasonal Recipe', u.searchParams.get('season') || currentSeason(), path === '/media/clip.svg');
      res.statusCode = 200;
      res.setHeader('content-type','image/svg+xml; charset=utf-8');
      res.setHeader('cache-control','no-store');
      res.end(svg);
      return;
    }
    if (req.method === 'GET' && path === '/sw.js') { res.statusCode = 200; res.setHeader('content-type','application/javascript; charset=utf-8'); res.setHeader('cache-control','no-store, max-age=0'); res.end("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister().then(()=>self.clients.matchAll()).then(cs=>Promise.all(cs.map(c=>c.navigate(c.url))))));"); return; }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    if (await handleAccountAuth(req,res,path,body)) return;
    if (await handleCommunityApi(req,res,path,body)) return;
    if (await handlePrivateApi(req,res,path,body)) return;

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
    if (path.includes('/assets/') && path.endsWith('.js')) { headers.delete('if-none-match'); headers.delete('if-modified-since'); headers.set('cache-control','no-cache'); }

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
    if ((contentType.includes('javascript') || path.endsWith('.js')) && path.includes('/assets/')) { let js=await upstream.text(); js=rewriteAuthBundle(js); res.setHeader('cache-control','no-store'); res.end(js); return; }
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
