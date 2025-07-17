// games/glow.js - Glow Getter space-invader style

let canvas, ctx;
let rafId;

// Assets
const imgPlayerR = new Image(); imgPlayerR.src = 'sprites/glow-getter-right.png';
const imgPlayerL = new Image(); imgPlayerL.src = 'sprites/glow-getter-left.png';
const imgEnemy  = new Image(); imgEnemy.src = 'sprites/meteor.png';
const imgDiamond= new Image(); imgDiamond.src = 'sprites/star.png';

// Sizes
// Final desired player size (~40% larger than original)
const PLAYER_SCALE = 1.4;
const PLAYER_W = Math.round(28 * PLAYER_SCALE), PLAYER_H = Math.round(32 * PLAYER_SCALE);
const ENEMY_BASE_W = 28, ENEMY_BASE_H = 28;
const DIAMOND_W = 20, DIAMOND_H = 20;
const BULLET_W = 4, BULLET_H = 10;

// -------- Difficulty tuning --------
// Lower values to make game easier
const ENEMY_SPEED = 0.7;           // vertical speed of meteors (px per frame)
const DIAMOND_SPEED = 0.9;         // vertical speed of stars (px per frame)
const ENEMY_SPAWN_INTERVAL = 90;   // frames between meteor spawns (was 60)
const DIAMOND_SPAWN_INTERVAL = 200;// frames between star spawns (was 150)

// Star field
const STAR_COUNT = 120;
const stars = [];

// Life system
const MAX_LIFE = 100;
let life = MAX_LIFE;

// Game objects
const player = {x:0,y:0,vx:0,speed:4,facingRight:true};
const bullets = [];
const enemies = [];
const diamonds= [];
let score = 0;
let gameOver = false;

// input
const keys = {left:false,right:false,shoot:false};
function keyDown(e){
  if(['ArrowLeft','a','A'].includes(e.key)) keys.left=true;
  if(['ArrowRight','d','D'].includes(e.key)) keys.right=true;
  if([' ','ArrowUp','w','W'].includes(e.key)) keys.shoot=true;
}
function keyUp(e){
  if(['ArrowLeft','a','A'].includes(e.key)) keys.left=false;
  if(['ArrowRight','d','D'].includes(e.key)) keys.right=false;
  if([' ','ArrowUp','w','W'].includes(e.key)) keys.shoot=false;
}

// Shooting control
let canShoot = true;

// mobile buttons
let leftBtn,rightBtn,jumpBtn;

function spawnEnemy(){
  const scale = 0.8 + Math.random()*0.6; // 0.8x - 1.4x size
  const w = ENEMY_BASE_W*scale;
  const h = ENEMY_BASE_H*scale;
  const x = Math.random()*(canvas.width-w);
  enemies.push({x,y: -h,vy:ENEMY_SPEED,w,h});
}
function spawnDiamond(){
  const x = Math.random()*(canvas.width-DIAMOND_W);
  diamonds.push({x,y:-DIAMOND_H,vy:DIAMOND_SPEED});
}

// Start/stop
function start(){
  canvas=document.getElementById('gameCanvas');
  ctx=canvas.getContext('2d');
  // mobile button refs
  leftBtn=document.getElementById('leftBtn');
  rightBtn=document.getElementById('rightBtn');
  jumpBtn=document.getElementById('jumpBtn');

  const onLeftDown=()=>keys.left=true;
  const onLeftUp=()=>keys.left=false;
  const onRightDown=()=>keys.right=true;
  const onRightUp=()=>keys.right=false;
  const onShootDown=()=>keys.shoot=true;
  const onShootUp=()=>keys.shoot=false;

  leftBtn.addEventListener('pointerdown',onLeftDown);
  leftBtn.addEventListener('pointerup',onLeftUp);
  rightBtn.addEventListener('pointerdown',onRightDown);
  rightBtn.addEventListener('pointerup',onRightUp);
  jumpBtn.addEventListener('pointerdown',onShootDown);
  jumpBtn.addEventListener('pointerup',onShootUp);

  start._listeners=[
    [leftBtn,'pointerdown',onLeftDown],[leftBtn,'pointerup',onLeftUp],
    [rightBtn,'pointerdown',onRightDown],[rightBtn,'pointerup',onRightUp],
    [jumpBtn,'pointerdown',onShootDown],[jumpBtn,'pointerup',onShootUp]
  ];
  reset();
  document.addEventListener('keydown',keyDown);
  document.addEventListener('keyup',keyUp);
  rafId=requestAnimationFrame(loop);
  document.getElementById('startBtn').classList.add('hidden');
}
function stop(){
  cancelAnimationFrame(rafId);
  document.removeEventListener('keydown',keyDown);
  document.removeEventListener('keyup',keyUp);
  if(start._listeners){ start._listeners.forEach(([el,ev,fn])=>el.removeEventListener(ev,fn)); }
}
function reset(){
  player.x = canvas.width/2-PLAYER_W/2;
  player.y = canvas.height-PLAYER_H-10;
  player.facingRight = true;
  bullets.length=0; enemies.length=0; diamonds.length=0;
  score=0; gameOver=false;
  life = MAX_LIFE;
  // init stars
  stars.length=0;
  for(let i=0;i<STAR_COUNT;i++){
    stars.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,alpha:Math.random(),speed:0.002+Math.random()*0.003});
  }
  updateScore();
}
function updateScore(){
  const el=document.getElementById('score'); if(el) el.textContent=score;
}

// Game loop
function loop(){
  update();
  render();
  rafId=requestAnimationFrame(loop);
}

let frame=0;
function update(){
  if(gameOver) return;
  // update star twinkle
  stars.forEach(s=>{
    s.alpha += s.speed;
    if(s.alpha>1 || s.alpha<0){ s.speed*=-1; s.alpha = Math.max(0,Math.min(1,s.alpha)); }
  });
  // Player movement
  player.vx=0;
  if(keys.left){ player.vx=-player.speed; player.facingRight=false; }
  if(keys.right){ player.vx=player.speed; player.facingRight=true; }
  player.x+=player.vx;
  player.x=Math.max(0,Math.min(canvas.width-PLAYER_W,player.x));

  // Shooting single-shot
  if(keys.shoot && canShoot){
    bullets.push({x:player.x+PLAYER_W/2-BULLET_W/2,y:player.y});
    canShoot = false;
  }
  if(!keys.shoot){
    canShoot = true;
  }

  // Update bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i]; b.y-=6;
    if(b.y+ BULLET_H<0) bullets.splice(i,1);
  }

  // spawn enemies/diamonds periodically
  frame++;
  if(frame%ENEMY_SPAWN_INTERVAL===0) spawnEnemy();
  if(frame%DIAMOND_SPAWN_INTERVAL===0) spawnDiamond();

  // Update enemies
  enemies.forEach(e=>{ e.y+=e.vy; });
  // Remove off screen enemies
  for(let i=enemies.length-1;i>=0;i--){
    if(enemies[i].y>canvas.height){
      enemies.splice(i,1);
      life -= 20; // lose 20 life per escape
      if(life <= 0){ triggerLose(); return; }
    }
  }

  // Update diamonds
  diamonds.forEach(d=>{ d.y+=d.vy; });
  for(let i=diamonds.length-1;i>=0;i--){ if(diamonds[i].y>canvas.height) diamonds.splice(i,1); }

  // Bullet-enemy collision
  for(let bi=bullets.length-1;bi>=0;bi--){
    const b=bullets[bi];
    for(let ei=enemies.length-1;ei>=0;ei--){
      const e=enemies[ei];
      if(b.x<e.x+e.w && b.x+BULLET_W>e.x && b.y<e.y+e.h && b.y+BULLET_H>e.y){
        bullets.splice(bi,1); enemies.splice(ei,1); score+=2; updateScore(); break;
      }
    }
  }

  // Player collisions
  for(const e of enemies){
    if(player.x<e.x+e.w && player.x+PLAYER_W>e.x && player.y<e.y+e.h && player.y+PLAYER_H>e.y){
      triggerLose(); return;
    }
  }
  for(let i=diamonds.length-1;i>=0;i--){
    const d=diamonds[i];
    if(player.x<d.x+DIAMOND_W && player.x+PLAYER_W>d.x && player.y<d.y+DIAMOND_H && player.y+PLAYER_H>d.y){
      diamonds.splice(i,1); score+=1; updateScore();
    }
  }
}

function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // Background disabled - using CSS background instead
  // ctx.fillStyle='#000'; ctx.fillRect(0,0,canvas.width,canvas.height);

  // draw stars
  stars.forEach(s=>{
    ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
    ctx.fillRect(s.x,s.y,2,2);
  });

  // draw diamonds behind enemies for depth
  diamonds.forEach(d=> ctx.drawImage(imgDiamond,d.x,d.y,DIAMOND_W,DIAMOND_H));
  enemies.forEach(e=> ctx.drawImage(imgEnemy,e.x,e.y,e.w,e.h));
  bullets.forEach(b=> {ctx.fillStyle='#0ff'; ctx.fillRect(b.x,b.y,BULLET_W,BULLET_H);} );
  const spr = player.facingRight? imgPlayerR : imgPlayerL;
  ctx.drawImage(spr,player.x,player.y,PLAYER_W,PLAYER_H);

  // draw life bar
  drawLifeBar();
}

// --------- Pixel art life bar ----------
function drawLifeBar(){
  const fullW = 120;
  const fullH = 28; // slightly taller for chunkier bar
  const x = canvas.width - fullW - 10;
  const y = 8;

  const outer = '#dca7ff';
  const inner = '#ffffff';
  const fill  = '#c66bff';
  const t = 8; // thicker outline -> larger rounded corners

  ctx.save();
  ctx.lineWidth = t;
  ctx.lineJoin = 'round';
  ctx.lineCap  = 'round';

  // Outer rounded rectangle frame
  ctx.strokeStyle = outer;
  ctx.strokeRect(x + t/2, y + t/2, fullW - t, fullH - t);

  // Inner background (white)
  const innerX = x + t;
  const innerY = y + t;
  const innerW = fullW - 2*t;
  const innerH = fullH - 2*t;
  ctx.fillStyle = inner;
  ctx.fillRect(innerX, innerY, innerW, innerH);

  // Fill amount
  const pct = Math.max(0, life)/MAX_LIFE;
  const fillW = Math.floor(innerW * pct);
  if(fillW>0){
    ctx.fillStyle = fill;
    ctx.fillRect(innerX, innerY, fillW, innerH);
  }
  ctx.restore();
}

function triggerLose(){
  gameOver=true;
  // Tiered reward system
  const rewardTiers = [
    { points: 60, reward: '50% de descuento', code: 'NAIOADS' },
    { points: 45, reward: '25% de descuento', code: 'UEONSK' }, // existing win level
    { points: 35, reward: '15% de descuento', code: 'SNAIOADS' },
    { points: 25, reward: '10% de descuento', code: 'XJHO9HN' },
    { points: 20, reward: 'Envío gratis',      code: 'NJK92NL' }
  ];

  const achievedTier = rewardTiers.find(t => score >= t.points);

  if (achievedTier) {
    const overlay = document.getElementById('winnerOverlay');
    const numSpan = document.getElementById('winnerNumber');
    if(numSpan){ window.getGlobalWinnerNumber().then(n=>{ numSpan.textContent = n; }); }

    // Dynamic reward copy
    const discountMsg = overlay.querySelector('.discount-msg');
    if(discountMsg){
      discountMsg.innerHTML = `Has ganado un ${achievedTier.reward} en tu próxima compra de NipSkin!<br>Usa este código en nuestra tienda para reclamar tu premio:<br><strong>${achievedTier.code}</strong>`;
    }

    overlay.classList.remove('hidden');
    document.body.classList.add('winner-mode');
    document.querySelector('.game-ui').style.display = 'block';

    const wr = document.getElementById('winnerRestartBtn');
    const wm = document.getElementById('winnerMenuBtn');
    if(wr){ wr.onclick = ()=>{ overlay.classList.add('hidden'); document.body.classList.remove('winner-mode'); reset(); }; }
    if(wm){ wm.onclick = ()=>{ document.body.classList.remove('winner-mode'); window.returnToMenu && window.returnToMenu(); }; }
  } else {
    const final=document.getElementById('finalScore'); if(final) final.textContent=score;
    const gov=document.getElementById('gameOver'); if(gov) gov.classList.remove('hidden');
    const restart=document.getElementById('restartBtn');
    const menu=document.getElementById('menuBtn');
    if(restart){ restart.onclick = ()=>{ gov.classList.add('hidden'); reset(); }; }
    if(menu){ menu.onclick = ()=>{ window.returnToMenu && window.returnToMenu(); }; }
  }
}

export {start, stop}; 