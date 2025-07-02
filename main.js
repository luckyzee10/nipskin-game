// main.js - hub loader
const mainMenu = document.getElementById('mainMenu');
const backBtn   = document.getElementById('backToMenuBtn');
const restartBtn= document.getElementById('restartBtn');
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

const defaultRestart= ()=>returnToMenu();
restartBtn.onclick= defaultRestart;

async function launchBloom(){
  if (currentStop){ try{currentStop();}catch(e){} currentStop=null; }
  const row=document.getElementById('rowBloom');
  clearSelection();
  row.classList.add('selected');

  const mod = await import('./games/bloom.js');
  if (typeof mod.start==='function'){
    mainMenu.style.display='none';
    showGame(true);
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('startBtn').classList.add('hidden');
    // Update header for Bloom Boss
    const header = document.querySelector('.game-header');
    header.style.display = 'block';
    header.querySelector('.game-title').textContent = '🌸 BLOOM BOSS 🌸';
    header.querySelector('.score').style.display = 'none';

    // Hide on-screen button controls; Bloom uses joystick
    document.querySelector('.game-controls').style.display = 'none';
    document.getElementById('jumpBtn').innerText = 'JUMP!';
    // reset canvas margin
    document.getElementById('gameCanvas').style.marginBottom = '0px';
    document.getElementById('gameCanvas').height = 500;

    currentStop = typeof mod.stop==='function'? mod.stop: null;
    mod.start();
    restartBtn.onclick = ()=>{ if(currentStop){currentStop();} launchBloom(); };
  }
}

document.getElementById('btnBloom').addEventListener('click', ()=>launchBloom());

// function to launch Dream Chaser (legacy game.js)
async function launchDream(){
  if (currentStop){ try{currentStop();}catch(e){} currentStop=null; }
  const row=document.getElementById('rowDream');
  clearSelection();
  row.classList.add('selected');

  const mod = await import('./games/dream_full.js');

  mainMenu.style.display='none';
  showGame(true);
  document.getElementById('gameOver').classList.add('hidden');

  // Update header for Dream Chaser
  const header = document.querySelector('.game-header');
  header.style.display = 'block';
  header.querySelector('.game-title').textContent = '⭐ DREAM CHASER! ⭐';
  header.querySelector('.score').style.display = 'inline-block';
  // show controls and reset canvas margin
  document.querySelector('.game-controls').style.display='flex';
  document.getElementById('gameCanvas').style.marginBottom = '0px';
  document.getElementById('gameCanvas').height = 500;

  // In launchDream within function launchDream before mod.start maybe restore JUMP
  document.getElementById('jumpBtn').innerText = 'JUMP!';

  if(typeof mod.start==='function') mod.start();
  currentStop = typeof mod.stop==='function'? mod.stop : null;

  restartBtn.onclick = ()=>{ if(currentStop){currentStop();} launchDream(); };
}

document.getElementById('rowDream').addEventListener('click', ()=>launchDream());

// ---- Glow Getter launcher ----
async function launchGlow(){
  if(currentStop){ try{currentStop();}catch(e){} currentStop=null; }
  const row=document.getElementById('rowGlow');
  clearSelection();
  row.classList.add('selected');

  const mod = await import('./games/glow.js');

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
  header.querySelector('.game-title').textContent = '✨ GLOW GETTER ✨';
  header.querySelector('.score').style.display = 'inline-block';

  // In launchGlow, change jumpBtn text
  document.getElementById('jumpBtn').innerText = 'SHOOT!';

  if(typeof mod.start==='function') mod.start();
  currentStop = typeof mod.stop==='function'? mod.stop:null;

  restartBtn.onclick = ()=>{ if(currentStop){currentStop();} launchGlow(); };
}

document.getElementById('btnGlow').addEventListener('click', ()=>launchGlow());

backBtn.addEventListener('click', returnToMenu);
restartBtn.addEventListener('click', returnToMenu);

function returnToMenu(){
  if (currentStop){ try{currentStop();}catch(e){} currentStop=null; }
  showGame(false);
  // reset title to default (Dream Chaser)
  const header = document.querySelector('.game-header');
  header.querySelector('.game-title').textContent = '⭐ DREAM CHASER! ⭐';
  header.querySelector('.score').style.display = 'inline-block';
  mainMenu.style.display='flex';
  clearSelection();
  restartBtn.onclick = defaultRestart;
  // reset canvas margin
  document.getElementById('gameCanvas').style.marginBottom = '0px';
  document.getElementById('gameCanvas').height = 500;

  // In returnToMenu restore JUMP text
  document.getElementById('jumpBtn').innerText = 'JUMP!';
}

// ensure menu visible on load
window.addEventListener('DOMContentLoaded', ()=>{
  showGame(false);
  mainMenu.style.display='flex';
}); 