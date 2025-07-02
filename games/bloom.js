// games/bloom.js
// Bloom Boss: collect flowers, avoid cacti

let canvas, ctx;
let rafId;

// ---- Scaling constants ----
const SCALE = 1.1; // 10% larger
const PLAYER_W = Math.round(30 * SCALE);
const PLAYER_H = Math.round(32 * SCALE);
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
  speed:3,
  facingRight:true
};
const flowers = [];
const cacti   = [];
let score = 0;

// assets
const imgPlayerR = new Image(); imgPlayerR.src='sprites/bloom boss right.png';
const imgPlayerL = new Image(); imgPlayerL.src='sprites/bloom boss left.png';
const imgFlower  = new Image(); imgFlower.src='sprites/flower.png';
const imgCactus  = new Image(); imgCactus.src='sprites/cactus.png';
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
  cacti.push({x:Math.random()* (canvas.width-ENTITY_SIZE)+half, y:Math.random()*(canvas.height-100)+50, active:false, speed:0.8+Math.random()*0.4});
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
  cacti.push({x, y, active:true, speed:0.8+Math.random()*0.4});
  cactiActivated++;
}

// after variables
let gameOver = false;
let gravity = 0.4;

// track how many cacti have been activated to chase
let cactiActivated = 0;
let lastCactusSpawn = 0;
const CACTUS_SPAWN_INTERVAL = 5000; // ms

function start(){
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
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

  // Virtual joystick on canvas
  const rect = canvas.getBoundingClientRect();
  const thresh = 20; // deadzone

  function processPointer(e){
    if(!pointerActive) return;
    let x=e.clientX - rect.left;
    let y=e.clientY - rect.top;
    let cx=rect.width/2;
    let cy=rect.height/2;
    let dx=x-cx;
    let dy=y-cy;
    keys.left = dx < -thresh;
    keys.right= dx >  thresh;
    keys.up   = dy < -thresh;
    keys.down = dy >  thresh;
  }

  function onJoyStart(e){
    pointerActive=true;
    pointerId=e.pointerId;
    processPointer(e);
  }
  function onJoyMove(e){ if(e.pointerId===pointerId) processPointer(e); }
  function onJoyEnd(e){ if(e.pointerId===pointerId){ pointerActive=false; clearKeys(); } }

  canvas.addEventListener('pointerdown',onJoyStart);
  canvas.addEventListener('pointermove',onJoyMove);
  canvas.addEventListener('pointerup',onJoyEnd);
  canvas.addEventListener('pointercancel',onJoyEnd);

  start._listeners=[
    [canvas,'pointerdown',onJoyStart],[canvas,'pointermove',onJoyMove],
    [canvas,'pointerup',onJoyEnd],[canvas,'pointercancel',onJoyEnd]
  ];

  loop();
}

function stop(){
  cancelAnimationFrame(rafId);
  document.removeEventListener('keydown',keyDown);
  document.removeEventListener('keyup',keyUp);
  // remove touch listeners
  if(start._listeners){ start._listeners.forEach(([el,ev,fn])=>el.removeEventListener(ev,fn)); }
  clearKeys();
}

function loop(){
  update();
  render();
  rafId=requestAnimationFrame(loop);
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

  // collect flowers
  const collectDist = FLOWER_SIZE * 0.75; // relaxed threshold
  for(let i=flowers.length-1;i>=0;i--){
    const f=flowers[i];
    if(Math.abs(player.x-f.x)<collectDist && Math.abs(player.y-f.y)<collectDist){
      flowers.splice(i,1); score+=1; spawnFlower();
    }
  }

  // collision with cactus -> lose
  const cactusHit = ENTITY_SIZE * 0.75;
  for(const c of cacti){
    if(Math.abs(player.x-c.x)<cactusHit && Math.abs(player.y-c.y)<cactusHit){
      triggerLose();
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
  // top-down field view with image pattern fallback
  ctx.fillStyle = fieldPattern || '#5abf41';
  ctx.fillRect(0,0,canvas.width,canvas.height);
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
  // show global game over UI
  const final=document.getElementById('finalScore');
  if(final) final.textContent=score;
  const gov=document.getElementById('gameOver');
  if(gov) gov.classList.remove('hidden');
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