// main.js - hub loader
const mainMenu = document.getElementById('mainMenu');
const backBtn   = document.getElementById('backToMenuBtn');
const restartBtn= document.getElementById('restartBtn');
const menuBtn   = document.getElementById('menuBtn');
const characterRows = document.querySelectorAll('.character-row');

let currentStop = null; // will hold stop() of active game

function setUI(show){
  document.querySelector('.game-header').style.display = show? 'block':'none';
  document.getElementById('gameCanvas').style.display = show? 'block':'none';
  document.querySelector('.game-controls').style.display = show? 'flex':'none';
  document.querySelector('.game-ui').style.display = show? 'block':'none';
  backBtn.style.display = show? 'inline-block':'none';
}

function showGame(show){
  if(window.showGameUI){ window.showGameUI(show);} else { setUI(show);} }

function clearSelection(){
  characterRows.forEach(r=>r.classList.remove('selected'));
}

// Helper function to switch game titles
function setGameTitle(game) {
  const dreamTitle = document.getElementById('dreamTitle');
  const bloomTitle = document.getElementById('bloomTitle'); 
  const glowTitle = document.getElementById('glowTitle');
  
  // Hide all titles first
  dreamTitle.style.display = 'none';
  bloomTitle.style.display = 'none';
  glowTitle.style.display = 'none';
  
  // Show the appropriate title
  switch(game) {
    case 'dream':
      dreamTitle.style.display = 'block';
      break;
    case 'bloom':
      bloomTitle.style.display = 'block';
      break;
    case 'glow':
      glowTitle.style.display = 'block';
      break;
  }
}

const defaultRestart= ()=>returnToMenu();
restartBtn.onclick= defaultRestart;
menuBtn.onclick = returnToMenu;

// Helper to change canvas background image
function setCanvasBG(src){
  const canvas = document.getElementById('gameCanvas');
  if(!canvas) return;
  console.log('Setting canvas background to:', src);
  // Force clear all background styles first
  canvas.style.removeProperty('background-image');
  canvas.style.removeProperty('background-position');
  canvas.style.removeProperty('background-size');
  canvas.style.removeProperty('background-repeat');
  canvas.style.removeProperty('background');
  if(src){
    canvas.style.setProperty('background-image', `url('${src}')`, 'important');
    canvas.style.setProperty('background-position', 'center', 'important');
    canvas.style.setProperty('background-size', 'cover', 'important');
    canvas.style.setProperty('background-repeat', 'no-repeat', 'important');
    console.log('Canvas background applied:', canvas.style.backgroundImage);
  } else {
    canvas.style.removeProperty('background-image');
    canvas.style.removeProperty('background-position');
    canvas.style.removeProperty('background-size');
    canvas.style.removeProperty('background-repeat');
    canvas.style.removeProperty('background');
    console.log('Canvas background cleared');
  }
}

// Helper to override game background drawing
function disableGameBG(){
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas?.getContext('2d');
  if(!ctx) return;
  
  // Override fillRect to prevent large background fills but allow small elements
  const originalFillRect = ctx.fillRect;
  
  ctx.fillRect = function(x, y, w, h) {
    // Block full-canvas background fills but allow smaller UI elements
    if (x === 0 && y === 0 && w === canvas.width && h === canvas.height) {
      console.log('Blocked background fillRect:', w, 'x', h);
      return; // Don't draw the background
    }
    // Allow all other fillRect calls (UI elements, sprites, etc.)
    originalFillRect.call(this, x, y, w, h);
  };
}

// ---------- Generic intro video helper ----------
async function playIntro(src){
  const overlay = document.getElementById('introOverlay');
  const video   = document.getElementById('introVideo');
  const skipBtn = document.getElementById('skipIntro');
  if(!overlay || !video){ return; }
  // update source if provided and different
  if(src){
    if(video.getAttribute('src') !== src){
      video.setAttribute('src', src);
    }
    // Always reload to ensure first-play works
    video.load();
  }
  return new Promise(resolve=>{
    const finish = ()=>{
      video.pause();
      overlay.classList.add('hidden');
      video.removeEventListener('ended', finish);
      skipBtn.removeEventListener('click', finish);
      video.removeEventListener('error', finish);
      resolve();
    };
    skipBtn.addEventListener('click', finish, {once:true});
    video.addEventListener('ended', finish, {once:true});
    video.addEventListener('error', finish, {once:true});
    // Position overlay to cover the canvas area (centre on canvas)
    const canvasRect = document.getElementById('gameCanvas').getBoundingClientRect();
    overlay.style.position = 'fixed';
    overlay.style.left = `${canvasRect.left}px`;
    overlay.style.top = `${canvasRect.top}px`;
    overlay.style.width = `${canvasRect.width}px`;
    overlay.style.height = `${canvasRect.height}px`;
    overlay.classList.remove('hidden');
    overlay.style.background='#000';
    video.style.width = '100%';
    video.style.height = '100%';
    video.muted = true; // ensure autoplay allowed on mobile
    video.currentTime = 0;
    const startPlayback = () => {
      video.play().catch(()=>finish());
    };
    if(video.readyState >= 2){
      startPlayback();
    } else {
      video.addEventListener('loadeddata', startPlayback, {once:true});
    }
  });
}

// ---------- Generic start screen helper (image overlay) ----------
async function showStartScreen(src){
  const overlay = document.getElementById('startOverlay');
  const img     = document.getElementById('startImg');
  if(!overlay || !img){ return; }
  if(src && img.getAttribute('src') !== src){ img.setAttribute('src', src); }
  return new Promise(resolve=>{
    const click = ()=>{
      overlay.classList.add('hidden');
      overlay.removeEventListener('click', click);
      resolve();
    };
    overlay.addEventListener('click', click);
    // position overlay over canvas
    const rect = document.getElementById('gameCanvas').getBoundingClientRect();
    overlay.style.left = `${rect.left}px`;
    overlay.style.top  = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height= `${rect.height}px`;
    overlay.classList.remove('hidden');
  });
}

async function launchBloom(){
  // Remove Glow-specific class if coming from Glow Getter
  document.body.classList.remove('glow-mode');
  document.body.classList.remove('dream-mode');

  if (currentStop){ try{currentStop();}catch(e){} currentStop=null; }
  const row=document.getElementById('rowBloom');
  clearSelection();
  row.classList.add('selected');

  const mod = await import('./games/bloom.js?t=' + Date.now());
  if (typeof mod.start==='function'){
    mainMenu.style.display='none';
    showGame(true);
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('startBtn').classList.add('hidden');
    // Update header for Bloom Boss
    const header = document.querySelector('.game-header');
    header.style.display = 'block';
    setGameTitle('bloom');
    document.querySelector('.score').style.display = 'none';

    // Hide on-screen button controls; Bloom uses joystick
    document.querySelector('.game-controls').style.display = 'none';
    document.getElementById('jumpBtn').innerText = 'JUMP!';
    // reset canvas margin
    document.getElementById('gameCanvas').style.marginBottom = '0px';
    document.getElementById('gameCanvas').height = 500;

    // Play Bloom Boss intro video then start screen
    await playIntro('assets/videos/bloom%20boss%20video%202.mp4');
    await showStartScreen('assets/start screens/bloom_boss_pop_up_new.png');

    currentStop = typeof mod.stop==='function'? mod.stop: null;
    mod.start();
    
    // Set Bloom Boss background immediately
    disableGameBG();
    setCanvasBG('assets/Back%20grounds/Bloom%20boss%20BG.jpg?t=' + Date.now());
    restartBtn.onclick = ()=>{ if(currentStop){currentStop();} launchBloom(); };
  }
}

document.getElementById('btnBloom').addEventListener('click', ()=>launchBloom());

// function to launch Dream Chaser (legacy game.js)
async function launchDream(){
  // Apply Dream Chaser button colour scheme
  document.body.classList.add('dream-mode');
  // Remove Glow colour scheme if previously set
  document.body.classList.remove('glow-mode');
  if (currentStop){ try{currentStop();}catch(e){} currentStop=null; }
  const row=document.getElementById('rowDream');
  clearSelection();
  row.classList.add('selected');

  const modPromise = import('./games/dream_full.js?t=' + Date.now());

  // Show game UI (canvas visible) but delay game start until after intro
  mainMenu.style.display='none';
  showGame(true);
  document.getElementById('gameOver').classList.add('hidden');

  // Update header for Dream Chaser
  const header = document.querySelector('.game-header');
  header.style.display = 'block';
  setGameTitle('dream');
  document.querySelector('.score').style.display = 'inline-block';
  // show controls and reset canvas margin
  document.querySelector('.game-controls').style.display='flex';
  document.getElementById('gameCanvas').style.marginBottom = '0px';
  document.getElementById('gameCanvas').height = 500;

  // In launchDream within function launchDream before mod.start maybe restore JUMP
  document.getElementById('jumpBtn').innerText = 'JUMP!';

  // Play intro video, then show start screen for Dream Chaser
  await playIntro('assets/videos/dream_chaser_adjusted_video.mp4');
  await showStartScreen('assets/start screens/dream_catcher_pop_up_new.png');

  const mod = await modPromise;

  if(typeof mod.start==='function') mod.start();
  currentStop = typeof mod.stop==='function'? mod.stop : null;

  // Set Dream Chaser background immediately
  disableGameBG();
  setCanvasBG('assets/Back%20grounds/Dream%20Chaser%20BG.jpg?t=' + Date.now());
  restartBtn.onclick = ()=>{ if(currentStop){currentStop();} launchDream(); };
}

document.getElementById('rowDream').addEventListener('click', ()=>launchDream());

// ---- Glow Getter launcher ----
async function launchGlow(){
  // Remove Dream scheme when entering Glow
  document.body.classList.remove('dream-mode');
  // Ensure glow-mode CSS applied
  document.body.classList.add('glow-mode');
  // Remove any other mode classes if present
  document.body.classList.remove('bloom-mode');

  if(currentStop){ try{currentStop();}catch(e){} currentStop=null; }
  const row=document.getElementById('rowGlow');
  clearSelection();
  row.classList.add('selected');

  const mod = await import('./games/glow.js?t=' + Date.now());

  mainMenu.style.display='none';
  showGame(true);
  document.getElementById('gameOver').classList.add('hidden');
  document.getElementById('startBtn').classList.add('hidden');
  // Show controls for Glow Getter (left/right/shoot)
  document.querySelector('.game-controls').style.display='flex';
  // ensure full height canvas for Glow
  document.getElementById('gameCanvas').style.marginBottom = '0px';
  document.getElementById('gameCanvas').height = 500;

  // Update header for Glow Getter
  const header = document.querySelector('.game-header');
  header.style.display='block';
  setGameTitle('glow');
  document.querySelector('.score').style.display = 'inline-block';

  // In launchGlow, change jumpBtn text
  document.getElementById('jumpBtn').innerText = 'SHOOT!';

  // Play Glow Getter intro video then start screen
  await playIntro('assets/videos/GLOW%20GETTER%20video%202.mp4');
  await showStartScreen('assets/start screens/glow_getter_pop_up_new.png');

  if(typeof mod.start==='function') mod.start();
  currentStop = typeof mod.stop==='function'? mod.stop:null;

  // Set Glow Getter background immediately
  disableGameBG();
  setCanvasBG('assets/Back%20grounds/glowgetter%20BG.jpg?t=' + Date.now());
  restartBtn.onclick = ()=>{ if(currentStop){currentStop();} launchGlow(); };
}

document.getElementById('btnGlow').addEventListener('click', ()=>launchGlow());

backBtn.addEventListener('click', returnToMenu);

function returnToMenu(){
  if (currentStop){ try{currentStop();}catch(e){} currentStop=null; }
  // remove glow-mode when leaving game
  document.body.classList.remove('glow-mode');
  document.body.classList.remove('dream-mode');
  showGame(false);
  // reset title to default (Dream Chaser)
  setGameTitle('dream');
  document.querySelector('.score').style.display = 'inline-block';
  mainMenu.style.display='flex';
  clearSelection();
  restartBtn.onclick = defaultRestart;
  // reset canvas margin
  document.getElementById('gameCanvas').style.marginBottom = '0px';
  document.getElementById('gameCanvas').height = 500;

  // In returnToMenu restore JUMP text
  document.getElementById('jumpBtn').innerText = 'JUMP!';

  // --- Stop intro video if it is still playing ---
  const overlay = document.getElementById('introOverlay');
  const video   = document.getElementById('introVideo');
  if(video){ video.pause(); }
  if(overlay){ overlay.classList.add('hidden'); }
  const startOverlay=document.getElementById('startOverlay'); if(startOverlay){ startOverlay.classList.add('hidden'); }
  const winOverlay = document.getElementById('winnerOverlay'); if(winOverlay){ winOverlay.classList.add('hidden'); }

  // reset canvas background to default
  setCanvasBG('');
}

// Attach to global for other game modules
window.returnToMenu = returnToMenu;

// -------- Global winner counter helper (Cloudflare Worker) --------
window.getGlobalWinnerNumber = async function () {
  const res = await fetch(
    "https://winner-counter.luckyzee.workers.dev/increment",
    { method: "POST" }
  );
  return await res.text();
};

// ensure menu visible on load
window.addEventListener('DOMContentLoaded', ()=>{
  showGame(false);
  mainMenu.style.display='flex';
}); 