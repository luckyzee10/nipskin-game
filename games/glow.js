// games/glow.js - Glow Getter space-invader style

let canvas, ctx;
let rafId;

// Assets
const imgPlayer = new Image(); imgPlayer.src = 'sprites/glow-getter-character.png';
const imgEnemy  = new Image(); imgEnemy.src = 'sprites/pimple-punk.png';
const imgDiamond= new Image(); imgDiamond.src = 'sprites/diamond.png';

// Sizes
const PLAYER_W = 32, PLAYER_H = 32;
const ENEMY_BASE_W = 28, ENEMY_BASE_H = 28;
const DIAMOND_W = 20, DIAMOND_H = 20;
const BULLET_W = 4, BULLET_H = 10;

// Star field
const STAR_COUNT = 120;
const stars = [];

// Life system
const MAX_LIFE = 100;
let life = MAX_LIFE;

// Game objects
const player = {x:0,y:0,vx:0,speed:4};
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
  enemies.push({x,y: -h,vy:1,w,h});
}
function spawnDiamond(){
  const x = Math.random()*(canvas.width-DIAMOND_W);
  diamonds.push({x,y:-DIAMOND_H,vy:1.2});
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
  if(keys.left) player.vx=-player.speed;
  if(keys.right) player.vx=player.speed;
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
  if(frame%60===0) spawnEnemy();
  if(frame%150===0) spawnDiamond();

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
  // background (space black)
  ctx.fillStyle='#000'; ctx.fillRect(0,0,canvas.width,canvas.height);

  // draw stars
  stars.forEach(s=>{
    ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
    ctx.fillRect(s.x,s.y,2,2);
  });

  // draw diamonds behind enemies for depth
  diamonds.forEach(d=> ctx.drawImage(imgDiamond,d.x,d.y,DIAMOND_W,DIAMOND_H));
  enemies.forEach(e=> ctx.drawImage(imgEnemy,e.x,e.y,e.w,e.h));
  bullets.forEach(b=> {ctx.fillStyle='#0ff'; ctx.fillRect(b.x,b.y,BULLET_W,BULLET_H);} );
  ctx.drawImage(imgPlayer,player.x,player.y,PLAYER_W,PLAYER_H);

  // draw life bar
  const barWidth = 100;
  const barHeight = 8;
  const barX = canvas.width - barWidth - 10;
  const barY = 10;
  ctx.fillStyle = '#444';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = life > MAX_LIFE*0.4 ? '#0f0' : '#f00';
  ctx.fillRect(barX, barY, barWidth * (life / MAX_LIFE), barHeight);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  // score text is in header
}

function triggerLose(){
  gameOver=true;
  const final=document.getElementById('finalScore'); if(final) final.textContent=score;
  const gov=document.getElementById('gameOver'); if(gov) gov.classList.remove('hidden');
}

export {start, stop}; 