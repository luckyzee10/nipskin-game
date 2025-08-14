// games/bloom.js
// Bloom Boss: collect flowers, avoid cacti

let canvas, ctx;
let rafId;

// ---- Scaling constants ----
const SCALE = 1.1; // 10% larger
// Further enlarge player by 10% relative to other entities
const PLAYER_SCALE = SCALE * 1.1; // overall ~21% larger than original asset
const PLAYER_W = Math.round(30 * PLAYER_SCALE);
const PLAYER_H = Math.round(32 * PLAYER_SCALE);
const ENTITY_SIZE = Math.round(32 * SCALE); // base size for cacti
const FLOWER_SIZE = Math.round(ENTITY_SIZE * 1.05); // flowers are 5% larger

// game objects
const player = {
  x: 180,
  y: 280,
  w: PLAYER_W,
  h: PLAYER_H,
  vx:0,
  vy:0,
  speed:2, // slower movement
  facingRight:true
};
const flowers = [];
const cacti   = [];
let score = 0;

// assets
const imgPlayerR = new Image(); imgPlayerR.src='sprites/bloom boss right.png';
const imgPlayerL = new Image(); imgPlayerL.src='sprites/bloom boss left.png';
const imgFlower  = new Image(); imgFlower.src='sprites/new flower sprite.png';
const imgCactus  = new Image(); imgCactus.src='sprites/new cactus sprite.png';
const imgBasket  = new Image(); imgBasket.src='sprites/basket.png';

// background pattern (loaded from asset)
const imgBg = new Image(); imgBg.src='assets/bloom-boss-background.png';
let fieldPattern = null;
const PATTERN_SCALE = 0.5; // zoom out to 50%
imgBg.onload = () => {
  if(ctx){ 
    fieldPattern = ctx.createPattern(imgBg,'repeat');
    if(fieldPattern && fieldPattern.setTransform){
      const m = new DOMMatrix();
      m.a = PATTERN_SCALE; // scale x
      m.d = PATTERN_SCALE; // scale y
      fieldPattern.setTransform(m);
    }
  }
};

// controls
const keys = {left:false,right:false,up:false,down:false};

// mobile buttons (unused joystick mode)
let leftBtn,rightBtn,jumpBtn;
// joystick listeners
let pointerActive=false;
let pointerId=null;

function keyDown(e){
  if(['ArrowLeft','a','A'].includes(e.key)){ keys.left=true;}
  if(['ArrowRight','d','D'].includes(e.key)){ keys.right=true;}
  if(['ArrowUp','w','W'].includes(e.key)){ keys.up=true;}
  if(['ArrowDown','s','S'].includes(e.key)){ keys.down=true;}
}
function keyUp(e){
  if(['ArrowLeft','a','A'].includes(e.key)){ keys.left=false;}
  if(['ArrowRight','d','D'].includes(e.key)){ keys.right=false;}
  if(['ArrowUp','w','W'].includes(e.key)){ keys.up=false;}
  if(['ArrowDown','s','S'].includes(e.key)){ keys.down=false;}
}

function clearKeys(){
  keys.left = keys.right = keys.up = keys.down = false;
}

function spawnFlower(){
  const half=FLOWER_SIZE/2;
  flowers.push({x:Math.random()* (canvas.width-FLOWER_SIZE)+half, y:Math.random()*(canvas.height-100)+50});
}
function spawnCactus(){
  const half=ENTITY_SIZE/2;
  let x, y;
  let attempts = 0;
  const maxAttempts = 20;
  
  // Player starting position and safe zone
  const playerStartX = 180;
  const playerStartY = 280;
  const safeZoneRadius = 80; // Safe zone around player start position
  
  do {
    x = Math.random() * (canvas.width - ENTITY_SIZE) + half;
    y = Math.random() * (canvas.height - 100) + 50;
    
    // Check if position is too close to player start position
    const distanceFromPlayer = Math.sqrt(
      Math.pow(x - playerStartX, 2) + Math.pow(y - playerStartY, 2)
    );
    
    attempts++;
    
    // If we've tried many times and still no good position, place it far from player
    if (attempts >= maxAttempts) {
      x = playerStartX < canvas.width / 2 ? canvas.width - 50 : 50;
      y = playerStartY < canvas.height / 2 ? canvas.height - 100 : 100;
      break;
    }
    
  } while (Math.sqrt(Math.pow(x - playerStartX, 2) + Math.pow(y - playerStartY, 2)) < safeZoneRadius);
  
  cacti.push({x: x, y: y, active: false, speed: 0.8 + Math.random() * 0.4});
}

function spawnBorderCactus(){
  const half=ENTITY_SIZE/2;
  let x,y;
  const side = Math.floor(Math.random()*4);
  switch(side){
    case 0: // top
      x = Math.random()*(canvas.width-ENTITY_SIZE)+half; y = 0+half; break;
    case 1: // bottom
      x = Math.random()*(canvas.width-ENTITY_SIZE)+half; y = canvas.height-half; break;
    case 2: // left
      x = 0+half; y = Math.random()*(canvas.height-ENTITY_SIZE)+half; break;
    case 3: // right
    default:
      x = canvas.width-half; y = Math.random()*(canvas.height-ENTITY_SIZE)+half; break;
  }
  // After 30 points introduce very slow "obstacle" cacti
  let spd, act;
  if(score >= 30){
    spd = 0.15 + Math.random()*0.15; // super slow
    act = true; // already active but barely moves
  } else {
    spd = 0.8+Math.random()*0.4;
    act = true;
  }
  cacti.push({x, y, active: act, speed: spd});
  cactiActivated++;
}

// after variables
let gameOver = false;
let gravity = 0.4;

// track how many cacti have been activated to chase
let cactiActivated = 0;
let lastCactusSpawn = 0;
const CACTUS_SPAWN_INTERVAL = 5000; // ms

// ---- Helper to fully reset game state without reattaching listeners ----
function reset(){
  clearKeys();
  score = 0;
  flowers.length = 0;
  cacti.length = 0;
  for(let i=0;i<5;i++) spawnFlower();
  for(let i=0;i<3;i++) spawnCactus();
  cactiActivated = 0;
  lastCactusSpawn = Date.now();
  gameOver = false;
  player.x = 180;
  player.y = 280;
  player.vx = 0;
  player.vy = 0;
  player.facingRight = true;
  // Hide game-over overlay if visible
  const gov = document.getElementById('gameOver');
  if(gov) gov.classList.add('hidden');
  // Update score display immediately
  const final = document.getElementById('score');
  if(final) final.textContent = score;
}

function start(){
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  // mobile button refs
  leftBtn=document.getElementById('leftBtn');
  rightBtn=document.getElementById('rightBtn');
  jumpBtn=document.getElementById('jumpBtn');
  clearKeys();
  score = 0;
  flowers.length=0; cacti.length=0;
  for(let i=0;i<5;i++) spawnFlower();
  for(let i=0;i<3;i++) spawnCactus();
  cactiActivated=0;
  lastCactusSpawn = Date.now();
  // hide start button
  const sb=document.getElementById('startBtn'); if(sb) sb.classList.add('hidden');

  gameOver=false;
  player.x=180; player.y=280; player.vy=0;

  document.addEventListener('keydown',keyDown);
  document.addEventListener('keyup',keyUp);

  // create pattern if background already loaded
  if(!fieldPattern && imgBg.complete){
    fieldPattern = ctx.createPattern(imgBg,'repeat');
    if(fieldPattern && fieldPattern.setTransform){
      const m = new DOMMatrix();
      m.a = PATTERN_SCALE;
      m.d = PATTERN_SCALE;
      fieldPattern.setTransform(m);
    }
  }

  // ---------- On-screen joystick ----------
  const joy=document.getElementById('bloomJoystick');
  if(joy) joy.classList.remove('hidden');
  // --- Position joystick just below the game canvas ---
  function positionJoystick(){
    if(!joy) return;
    const rect = canvas.getBoundingClientRect();
    joy.style.position = 'fixed';
    joy.style.top  = `${rect.bottom + 10}px`; // 10px gap below canvas
    joy.style.left = `${rect.left + rect.width/2}px`;
    joy.style.bottom = 'auto';
  }
  positionJoystick();
  window.addEventListener('resize', positionJoystick);
  window.addEventListener('scroll', positionJoystick, {passive:true});

  // show mobile tooltip briefly
  const tip = document.getElementById('joystickTip');
  if(tip){
    tip.classList.remove('hidden');
    setTimeout(()=>tip.classList.add('hidden'), 4000);
  }
  // store listener for cleanup
  start._listeners = start._listeners || [];
  start._listeners.push(
    [joy,'pointerdown',onJoyStart],[joy,'pointermove',onJoyMove],
    [joy,'pointerup',onJoyEnd],[joy,'pointercancel',onJoyEnd]
  );
  start._listeners.push([window,'resize',positionJoystick]);
  start._listeners.push([window,'scroll',positionJoystick]);

  // ------ Joystick movement handling (restored) ------
  const thumb = joy ? joy.querySelector('.stick-thumb') : null;
  let thresh = 20;

  function moveThumb(dx,dy){ if(!thumb) return; thumb.style.transform=`translate(${dx}px,${dy}px)`; }

  function processPointer(e){
    if(!pointerActive) return;
    const rect = joy.getBoundingClientRect();
    const cx = rect.width/2;
    const cy = rect.height/2;
    let dx = (e.clientX - rect.left) - cx;
    let dy = (e.clientY - rect.top ) - cy;

    keys.left = dx < -thresh;
    keys.right= dx >  thresh;
    keys.up   = dy < -thresh;
    keys.down = dy >  thresh;

    const max = 40;
    const dist = Math.hypot(dx,dy);
    if(dist > max){ dx = dx/dist*max; dy = dy/dist*max; }
    moveThumb(dx,dy);
  }

  function onJoyStart(e){ pointerActive=true; pointerId=e.pointerId; processPointer(e);} 
  function onJoyMove(e){ if(e.pointerId===pointerId) processPointer(e);} 
  function onJoyEnd(e){ if(e.pointerId===pointerId){ pointerActive=false; clearKeys(); moveThumb(0,0);} }

  joy.addEventListener('pointerdown',onJoyStart);
  joy.addEventListener('pointermove',onJoyMove);
  joy.addEventListener('pointerup',onJoyEnd);
  joy.addEventListener('pointercancel',onJoyEnd);

  start._listeners.push(
    [joy,'pointerdown',onJoyStart],[joy,'pointermove',onJoyMove],
    [joy,'pointerup',onJoyEnd],[joy,'pointercancel',onJoyEnd]
  );

  // Initialize and start background music
  if (window.audioManager) {
    window.audioManager.init();
    window.audioManager.playBGMusic('bloomboss');
  }

  startMainLoop();
}

function stop(){
  cancelAnimationFrame(rafId);
  document.removeEventListener('keydown',keyDown);
  document.removeEventListener('keyup',keyUp);
  // remove touch listeners
  if(start._listeners){ start._listeners.forEach(([el,ev,fn])=>el.removeEventListener(ev,fn)); }
  clearKeys();
  const joy=document.getElementById('bloomJoystick'); if(joy) joy.classList.add('hidden');
  
  // Stop background music
  if (window.audioManager) {
    window.audioManager.stopBGMusic();
  }
}

function loop(){
  update();
  render();
  rafId=requestAnimationFrame(loop);
}

// Helper to (re)start main loop safely
function startMainLoop(){
  if(rafId){ cancelAnimationFrame(rafId); rafId=null; }
  rafId = requestAnimationFrame(loop);
}

function update(){
  if(gameOver){
    player.vy += gravity;
    player.y  += player.vy;
    if(player.y>canvas.height){
      endGame();
    }
    return;
  }
  // movement
  let ax=0, ay=0;
  if(keys.left) ax=-player.speed;
  if(keys.right) ax= player.speed;
  if(keys.up) ay=-player.speed;
  if(keys.down) ay= player.speed;
  player.x += ax; player.y += ay;
  if(ax<0) player.facingRight=false; if(ax>0) player.facingRight=true;
  // clamp
  player.x=Math.max(0,Math.min(canvas.width-player.w,player.x));
  player.y=Math.max(0,Math.min(canvas.height-player.h,player.y));

  // activate and move cacti based on score
  updateCactiActivation();
  moveActiveCacti();

  // Calculate player center for consistent collision detection
  const playerCenterX = player.x + player.w / 2;
  const playerCenterY = player.y + player.h / 2;

  // collect flowers - bigger hitbox
  const collectDist = FLOWER_SIZE * 0.95;
  for(let i=flowers.length-1;i>=0;i--){
    const f=flowers[i];
    if(Math.abs(playerCenterX-f.x)<collectDist && Math.abs(playerCenterY-f.y)<collectDist){
      flowers.splice(i,1); score+=1; spawnFlower();
      
      // Play flower collection sound effect
      if (window.audioManager) {
        window.audioManager.playSFX('bloomboss_flower');
      }
    }
  }

  // collision with cactus -> smaller hitbox
  const cactusHit = ENTITY_SIZE * 0.6;
  for(const c of cacti){
    if(!gameOver && Math.abs(playerCenterX-c.x)<cactusHit && Math.abs(playerCenterY-c.y)<cactusHit){
      // Play character damage sound effect
      if (window.audioManager) {
        window.audioManager.playSFX('characterdamage');
      }
      // Small delay to ensure sound starts playing before game state changes
      setTimeout(() => {
        triggerLose();
      }, 50);
      break;
    }
  }

  // spawn new cacti over time once all current are active
  if(cactiActivated === cacti.length){
    const now = Date.now();
    if(now - lastCactusSpawn > CACTUS_SPAWN_INTERVAL){
      spawnBorderCactus();
      lastCactusSpawn = now;
    }
  }
}

function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // Background disabled - using CSS background instead
  // ctx.fillStyle = fieldPattern || '#5abf41';
  // ctx.fillRect(0,0,canvas.width,canvas.height);
  // draw flowers
  const halfF=FLOWER_SIZE/2;
  flowers.forEach(f=>ctx.drawImage(imgFlower,f.x-halfF,f.y-halfF,FLOWER_SIZE,FLOWER_SIZE));
  // draw cacti static
  const half=ENTITY_SIZE/2;
  cacti.forEach(c=>ctx.drawImage(imgCactus,c.x-half,c.y-half,ENTITY_SIZE,ENTITY_SIZE));
  // draw player
  const img=player.facingRight?imgPlayerR:imgPlayerL;
  ctx.drawImage(img,player.x,player.y,player.w,player.h);
  // score with basket icon
  const basketSize = 24;
  ctx.drawImage(imgBasket, 10, 6, basketSize, basketSize);
  ctx.fillStyle='#000'; ctx.font='16px monospace';
  ctx.fillText('x ' + score, 10 + basketSize + 6, 24);
}

function triggerLose(){
  gameOver=true;
  player.vx=0;
  player.vy=-6; // pop up then fall
}

function endGame(){
  // Prevent multiple calls to endGame in the same session  
  if(endGame.called) return;
  endGame.called = true;
  
  // Tiered reward system
  const rewardTiers = [
    { points: 65, reward: '50% de descuento', code: 'NAIOADS' },
    { points: 55, reward: '25% de descuento', code: 'UEONSK' }, // existing win level
    { points: 45, reward: '15% de descuento', code: 'SNAIOADS' },
    { points: 35, reward: '10% de descuento', code: 'XJHO9HN' },
    { points: 20, reward: 'Envío gratis',      code: 'NJK92NL' }
  ];

  const achievedTier = rewardTiers.find(t => score >= t.points);

  if (achievedTier) {
    const overlay = document.getElementById('winnerOverlay');
    const numSpan  = document.getElementById('winnerNumber');
    if(numSpan){ window.getGlobalWinnerNumber().then(n=>{ numSpan.textContent = n; }); }

    // Dynamic reward copy
    const discountMsg = overlay.querySelector('.discount-msg');
    if(discountMsg){
      discountMsg.innerHTML = `
        <p>Has ganado un ${achievedTier.reward} en tu próxima compra de NipSkin!</p>
        <p>Usa este código en nuestra tienda para reclamar tu premio:</p>
        <p class=\"discount-code\"><strong>${achievedTier.code}</strong></p>
      `;
    }

    overlay.classList.remove('hidden');
    document.querySelector('.game-ui').style.display = 'block';
    document.body.classList.add('winner-mode');

    const wr = document.getElementById('winnerRestartBtn');
    const wm = document.getElementById('winnerMenuBtn');
    if(wr){ wr.onclick = ()=>{ overlay.classList.add('hidden'); document.body.classList.remove('winner-mode'); reset(); startMainLoop();}; }
    if(wm){ wm.onclick = ()=>{ document.body.classList.remove('winner-mode'); window.returnToMenu && window.returnToMenu(); }; }
  } else {
    const final=document.getElementById('finalScore');
    if(final) final.textContent=score;
    const gov=document.getElementById('gameOver');
    if(gov) gov.classList.remove('hidden');
    const restart=document.getElementById('restartBtn');
    const menu=document.getElementById('menuBtn');
    if(restart){ restart.onclick = ()=>{ gov.classList.add('hidden'); reset(); startMainLoop(); }; }
    if(menu){ menu.onclick = ()=>{ window.returnToMenu && window.returnToMenu(); }; }
  }
  // pause loop but keep context; listeners remain so restart works
  cancelAnimationFrame(rafId);
}

// helper to activate cacti based on score
function updateCactiActivation(){
  const shouldBeActive = Math.min(Math.floor(score/10), cacti.length);
  while(cactiActivated < shouldBeActive){
    cacti[cactiActivated].active = true;
    cactiActivated++;
  }
}

// helper to move active cacti toward player
function moveActiveCacti(){
  cacti.forEach(c=>{
    if(!c.active) return;
    const dx = player.x - c.x;
    const dy = player.y - c.y;
    const dist = Math.hypot(dx,dy) || 1;
    const vx = (dx/dist)*c.speed;
    const vy = (dy/dist)*c.speed;
    c.x += vx;
    c.y += vy;
    // keep within bounds
    c.x = Math.max(0, Math.min(canvas.width-ENTITY_SIZE/2, c.x));
    c.y = Math.max(0, Math.min(canvas.height-ENTITY_SIZE/2, c.y));
  });
}

export {start, stop}; 