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

// Helper to show the winner overlay centered over the canvas
function showWinnerFrame(){
  const frame = document.getElementById('winnerFrame');
  const canvas = document.getElementById('gameCanvas');
  if(!frame || !canvas) return;
  const rect = canvas.getBoundingClientRect();
  frame.style.position = 'fixed';
  frame.style.left = `${rect.left}px`;
  frame.style.top = `${rect.top}px`;
  frame.style.width = `${rect.width}px`;
  frame.style.height = `${rect.height}px`;
  frame.classList.remove('hidden');
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
  // Add Bloom Boss mode class
  document.body.classList.add('bloom-mode');

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
  // Stop any playing background music
  if (window.audioManager) {
    window.audioManager.stopBGMusic();
  }
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
  // Prevent rapid duplicate calls with a simple debounce
  const now = Date.now();
  const lastCall = window.getGlobalWinnerNumber.lastCall || 0;
  
  if (now - lastCall < 5000) { // 5 second debounce
    console.log('Winner counter call debounced - too soon since last call');
    return window.getGlobalWinnerNumber.lastResult || "1";
  }
  
  try {
    console.log('Calling winner counter API...');
    const res = await fetch(
      "https://winner-counter.luckyzee.workers.dev/increment",
      { method: "POST" }
    );
    const result = await res.text();
    
    // Store for debounce
    window.getGlobalWinnerNumber.lastCall = now;
    window.getGlobalWinnerNumber.lastResult = result;
    
    console.log('Winner counter result:', result);
    return result;
  } catch (error) {
    console.error('Winner counter error:', error);
    return "1"; // Fallback
  }
};

// -------- Winner template helper --------
window.setWinnerTemplate = function() {
  const templateImg = document.getElementById('winnerTemplate');
  if (!templateImg) return;
  
  // Set template based on current game mode
  if (document.body.classList.contains('dream-mode')) {
    templateImg.src = 'assets/winner screens/dreamcatcher_winner_screen.jpg';
  } else if (document.body.classList.contains('glow-mode')) {
    templateImg.src = 'assets/winner screens/glowgetter_winner_screen.jpg';
  } else if (document.body.classList.contains('bloom-mode')) {
    templateImg.src = 'assets/winner screens/bloomboss_winner_screen.jpg';
  }
};

// -------- Audio System --------
class AudioManager {
  constructor() {
    this.bgMusic = null;
    this.currentTrack = null;
    this.isEnabled = false;
    this.volume = 0.3; // 30% volume by default
    this.sfxVolume = 0.4; // 40% volume for sound effects
    this.sfxCache = new Map(); // Cache for sound effects
    this.wasPausedByBackground = false; // Track if paused by background
  }

  // Initialize audio (call after user interaction)
  init() {
    this.isEnabled = true;
    // Create and play a silent audio to unlock audio context on mobile
    this.unlockAudio();
  }

  // Unlock audio context for mobile browsers
  unlockAudio() {
    try {
      const silentAudio = new Audio();
      silentAudio.volume = 0;
      silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      const playPromise = silentAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          silentAudio.pause();
          silentAudio.currentTime = 0;
        }).catch(() => {
          // Silent failure - audio unlock didn't work
        });
      }
    } catch (error) {
      // Silent failure - audio unlock didn't work
    }
  }

  // Load and play background music
  playBGMusic(trackName) {
    if (!this.isEnabled) return;
    
    // Stop current track if playing
    this.stopBGMusic();
    
    try {
      this.bgMusic = new Audio(`assets/music/${trackName}_music.mp3`);
      this.bgMusic.volume = this.volume;
      this.bgMusic.loop = true;
      this.currentTrack = trackName;
      
      // Play with error handling
      const playPromise = this.bgMusic.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Audio play failed:', error);
        });
      }
    } catch (error) {
      console.log('Audio loading failed:', error);
    }
  }

  // Stop background music
  stopBGMusic() {
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic.currentTime = 0;
      this.bgMusic = null;
      this.currentTrack = null;
    }
  }

  // Play sound effect
  playSFX(sfxName) {
    if (!this.isEnabled) return;
    
    try {
      // Use cached audio or create new one
      let audio = this.sfxCache.get(sfxName);
      if (!audio) {
        audio = new Audio(`assets/music/${sfxName}.mp3`);
        this.sfxCache.set(sfxName, audio);
      }
      
      // Reset to start and play
      audio.currentTime = 0;
      audio.volume = this.sfxVolume;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('SFX play failed:', error);
        });
      }
    } catch (error) {
      console.log('SFX loading failed:', error);
    }
  }

  // Toggle audio on/off
  toggle() {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      this.stopBGMusic();
    }
    return this.isEnabled;
  }

  // Set volume (0.0 to 1.0)
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.bgMusic) {
      this.bgMusic.volume = this.volume;
    }
  }

  // Set SFX volume (0.0 to 1.0)
  setSFXVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  // Pause audio when page loses focus/visibility
  pauseOnBackground() {
    if (this.bgMusic && !this.bgMusic.paused) {
      this.bgMusic.pause();
      this.wasPausedByBackground = true;
    }
  }

  // Resume audio when page regains focus/visibility
  resumeOnForeground() {
    if (this.bgMusic && this.wasPausedByBackground && this.isEnabled) {
      const playPromise = this.bgMusic.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Audio resume failed:', error);
        });
      }
      this.wasPausedByBackground = false;
    }
  }
}

// Global audio manager instance
window.audioManager = new AudioManager();

// Audio toggle button functionality
function initAudioToggle() {
  const audioToggle = document.getElementById('audioToggle');
  if (!audioToggle) return;

  audioToggle.addEventListener('click', () => {
    // Initialize audio on first interaction if not already done
    if (!window.audioManager.isEnabled) {
      window.audioManager.init();
    }
    const isEnabled = window.audioManager.toggle();
    audioToggle.textContent = isEnabled ? '🔊' : '🔇';
    audioToggle.classList.toggle('muted', !isEnabled);
  });
}

// Initialize audio on any user interaction (mobile-friendly)
function initMobileAudio() {
  const initAudio = () => {
    if (!window.audioManager.isEnabled) {
      window.audioManager.init();
    }
  };

  // Add listeners to all interactive elements
  document.addEventListener('touchstart', initAudio, { once: true, passive: true });
  document.addEventListener('click', initAudio, { once: true, passive: true });
  
  // Character selection buttons
  const characterBtns = document.querySelectorAll('.character-btn');
  characterBtns.forEach(btn => {
    btn.addEventListener('touchstart', initAudio, { once: true, passive: true });
    btn.addEventListener('click', initAudio, { once: true, passive: true });
  });
}

// Handle page visibility changes (phone lock, app switching, etc.)
function initBackgroundAudioControl() {
  // Pause audio when page becomes hidden (phone lock, app switch, etc.)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.audioManager.pauseOnBackground();
    } else {
      window.audioManager.resumeOnForeground();
    }
  });

  // Additional fallbacks for older browsers
  window.addEventListener('blur', () => {
    window.audioManager.pauseOnBackground();
  });

  window.addEventListener('focus', () => {
    window.audioManager.resumeOnForeground();
  });

  // Handle page unload (browser close, navigation away)
  window.addEventListener('beforeunload', () => {
    window.audioManager.stopBGMusic();
  });
}

// ensure menu visible on load
window.addEventListener('DOMContentLoaded', ()=>{
  showGame(false);
  mainMenu.style.display='flex';
  initAudioToggle();
  initMobileAudio();
  initBackgroundAudioControl();
}); 