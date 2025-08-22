// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const gameOverDiv = document.getElementById('gameOver');

// Control buttons
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const jumpBtn = document.getElementById('jumpBtn');

// Game state
let gameState = 'menu'; // 'menu', 'playing', 'gameOver'
let score = 0;
let gameSpeed = 1;
let progress = 0; // counts frames survived for speed/thunder logic
const SPEED_RAMP_FRAMES = 1500; // cap after 25s @60fps (~1500 frames)

// Performance optimizations - background rendering removed since CSS handles background

// Player object
const player = {
    x: canvas.width / 2 - 15,
    y: canvas.height / 2 - 25,
    width: 30,
    height: 55,
    velocityX: 0,
    velocityY: 0,
    onGround: false,
    jumpPower: -12,
    gravity: 0.5,
    speed: 4,
    color: '#87ceeb',
    facingRight: true // Track which direction she's facing
};

// Platforms array
let platforms = [];
const platformWidth = 80;
const platformHeight = 15;

// Thunder cloud system
let thunderCloudChance = 0; // 1 in 10 chance after 1000 points
// Controls state
const keys = {
    left: false,
    right: false,
    jump: false
};

// Enhanced jump buffer for lag-resistant input
let jumpBuffer = 0;
const jumpBufferTime = 8; // Increased for better lag tolerance
let jumpPressed = false; // Track if jump was pressed this frame
let lastJumpTime = 0; // Track when jump was last pressed
let jumpCooldown = 0; // Prevent rapid-fire jumps
const JUMP_COOLDOWN_FRAMES = 5; // Minimum frames between jumps

// Load player sprites
const playerRightImg = new Image();
playerRightImg.src = 'sprites/(dream-chaser) player-right.png';
const playerLeftImg = new Image();
playerLeftImg.src = 'sprites/(dream-chaser) player-left.png';

// Load cloud platform sprite
const cloudImg = new Image();
cloudImg.src = 'sprites/cloud.png';

// Load thunder cloud sprite
const thunderCloudImg = new Image();
thunderCloudImg.src = 'sprites/thunder cloud.png';

// Menu logic
const mainMenu = document.getElementById('mainMenu');
const backToMenuBtn = document.getElementById('backToMenuBtn');

// New character selection logic
const characterRows = document.querySelectorAll('.character-row');

characterRows.forEach(row => {
    const btn = row.querySelector('.character-btn');
    if (btn && !btn.disabled) {
        btn.addEventListener('click', () => {
            characterRows.forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');
            if (btn.dataset.character === 'dream') {
                // Start game after slight delay to show selection
                setTimeout(() => {
                    mainMenu.style.display = 'none';
                    showGameUI(true);
                    startGame();
                }, 200);
            }
        });
    }
});

// Show/hide back button with game state
function showGameUI(show) {
    document.querySelector('.game-header').style.display = show ? 'block' : 'none';
    document.getElementById('gameCanvas').style.display = show ? 'block' : 'none';
    document.querySelector('.game-controls').style.display = show ? 'flex' : 'none';
    document.querySelector('.game-ui').style.display = show ? 'block' : 'none';
    backToMenuBtn.style.display = show ? 'inline-block' : 'none';
    if (show) {
        startBtn.classList.remove('hidden'); // visible at first
    }
}

// helper to clear menu selection
function clearCharacterSelection() {
    characterRows.forEach(r => r.classList.remove('selected'));
}

// Update menu logic to use showGameUI
window.addEventListener('DOMContentLoaded', () => {
    mainMenu.style.display = 'flex';
    showGameUI(false);
    clearCharacterSelection();
});

// Back to menu button logic
backToMenuBtn.addEventListener('click', () => {
    mainMenu.style.display = 'flex';
    showGameUI(false);
    clearCharacterSelection();
    // Reset game state
    gameState = 'menu';
    score = 0;
    gameSpeed = 1;
    player.x = canvas.width / 2 - 15;
    player.y = canvas.height / 2 - 25;
    player.velocityX = 0;
    player.velocityY = 0;
    player.facingRight = true;
    initializePlatforms();
    document.querySelector('.game-ui').style.display = 'none';
    gameOverDiv.classList.add('hidden');
});

// Background rendering removed - CSS handles background via setCanvasBG()

// Initialize platforms
function initializePlatforms() {
    platforms = [];
    
    // Starting platform
    platforms.push({
        x: canvas.width / 2 - platformWidth / 2,
        y: canvas.height - 50,
        width: platformWidth,
        height: platformHeight,
        scored: true // Starting platform doesn't give points
    });
    
    // Generate initial platforms
    for (let i = 1; i < 8; i++) {
        platforms.push({
            x: Math.random() * (canvas.width - platformWidth),
            y: canvas.height - 50 - (i * 90),
            width: platformWidth,
            height: platformHeight,
            scored: false
        });
    }
}

// Create new platform at the top
function generateNewPlatform() {
    const minX = 0;
    const maxX = canvas.width - platformWidth;
    
    // Determine if this should be a thunder cloud (1 in 10 chance after 1000 points)
    let isThunderCloud = false;
    if (progress >= 1000) {
        thunderCloudChance = Math.random() < 0.1; // 10% chance after about 1000 frames
        isThunderCloud = thunderCloudChance;
    }
    
    platforms.push({
        x: Math.random() * (maxX - minX) + minX,
        y: -platformHeight,
        width: platformWidth,
        height: platformHeight,
        isThunderCloud: isThunderCloud,
        isFalling: false,
        fallSpeed: 0,
        isActivated: false,
        fallDelay: 0,
        scored: false
    });
}

// Draw Dream Chaser character using PNG sprites
function drawPlayer() {
    ctx.save();
    let img = player.facingRight ? playerRightImg : playerLeftImg;
    // Slightly narrower sprite to correct aspect (approx -15% width)
    const spriteWidth = 40;
    const spriteHeight = 48;
    // Guard against image not yet loaded (drawImage throws if width/height 0)
    if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, player.x + player.width / 2 - spriteWidth / 2, player.y + player.height - spriteHeight, spriteWidth, spriteHeight);
    }
    ctx.restore();
}

// Draw cloud platforms
function drawPlatforms() {
    platforms.forEach(platform => {
        if (platform.isThunderCloud) {
            // Draw thunder cloud sprite with proper dimensions
            const cloudWidth = 60; // Reduced from 80 to 60 for less width
            const cloudHeight = 40; // Increased height to prevent flattening
            
            // Flicker effect before falling
            const flicker = platform.isActivated && !platform.isFalling && (platform.fallDelay % 10 < 5);
            if (!flicker) {
                ctx.drawImage(thunderCloudImg, platform.x + 10, platform.y - 25, cloudWidth, cloudHeight);
            }
            
            // Subtle lightning effect (less frequent and more subtle)
            if (Math.random() < 0.005) { // Reduced from 0.02 to 0.005 (0.5% chance)
                ctx.fillStyle = 'rgba(255, 255, 0, 0.6)'; // Semi-transparent yellow
                ctx.fillRect(platform.x + 35, platform.y - 30, 8, 15);
            }
            
            // Rain drops (more subtle)
            ctx.fillStyle = 'rgba(135, 206, 235, 0.7)'; // Semi-transparent blue
            for (let i = 0; i < 4; i++) {
                const dropX = platform.x + 15 + (i * 12); // Adjusted spacing for narrower cloud
                const dropY = platform.y + 20 + (score * 0.1) % 8;
                ctx.fillRect(dropX, dropY, 1, 2);
            }
        } else {
            // Draw regular cloud sprite as platform
            const cloudWidth = 80;
            const cloudHeight = 30;
            ctx.drawImage(cloudImg, platform.x, platform.y - 15, cloudWidth, cloudHeight);
        }
    });
}

// Background rendering functions removed - CSS handles background

// Collision detection
function checkCollisions() {
    player.onGround = false;
    
    platforms.forEach(platform => {
        if (player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + player.height > platform.y) {
            
            // Landing on top of platform
            if (player.velocityY > 0 && player.y < platform.y) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.onGround = true;
                
                // Score points for landing on a new cloud (but not the starting platform)
                if (!platform.scored && platform !== platforms[0]) {
                    platform.scored = true;
                    score += 1;
                    scoreElement.textContent = score;
                }
                
                // If it's a thunder cloud, make it start falling
                if (platform.isThunderCloud && !platform.isActivated) {
                    platform.isActivated = true;
                    platform.fallDelay = 60; // 1-second warning (assuming 60fps)
                }
            }
        }
    });
}

// Update game logic
function update() {
    if (gameState !== 'playing') return;
    // increment progress every frame for difficulty scaling
    progress++;
    
    // Handle input and update facing direction
    if (keys.left) {
        player.velocityX = -player.speed;
        if (player.facingRight) {
            player.facingRight = false; // Face left when moving left
        }
    } else if (keys.right) {
        player.velocityX = player.speed;
        if (!player.facingRight) {
            player.facingRight = true; // Face right when moving right
        }
    } else {
        player.velocityX *= 0.8; // Friction
    }
    
    // Enhanced lag-resistant jump system
    if (jumpCooldown > 0) {
        jumpCooldown--;
    }
    
    // Primary jump when on ground
    if (keys.jump && player.onGround && !jumpPressed && jumpCooldown === 0) {
        player.velocityY = player.jumpPower;
        player.onGround = false;
        jumpBuffer = 0; // Reset buffer when jump is executed
        jumpPressed = true;
        jumpCooldown = JUMP_COOLDOWN_FRAMES;
        lastJumpTime = Date.now();
        
        // Play jump sound effect
        if (window.audioManager) {
            window.audioManager.playSFX('dreamchaser_jump');
        }
    }
    
    // Enhanced jump buffer system for lag tolerance
    if (keys.jump && !player.onGround && jumpBuffer > 0 && !jumpPressed && jumpCooldown === 0) {
        // More generous buffered jump - check if falling or near ground
        let canBufferJump = false;
        
        // Allow buffered jump if falling
        if (player.velocityY >= 0) {
            canBufferJump = true;
        }
        
        // Also allow if very close to any platform
        platforms.forEach(platform => {
            if (player.x < platform.x + platform.width &&
                player.x + player.width > platform.x &&
                player.y + player.height >= platform.y - 8 && // More generous proximity
                player.y + player.height <= platform.y + 10) {
                canBufferJump = true;
            }
        });
        
        if (canBufferJump) {
            player.velocityY = player.jumpPower;
            jumpBuffer = 0;
            jumpPressed = true;
            jumpCooldown = JUMP_COOLDOWN_FRAMES;
            lastJumpTime = Date.now();
            
            // Play jump sound effect for buffered jump
            if (window.audioManager) {
                window.audioManager.playSFX('dreamchaser_jump');
            }
        }
    }
    
    // Enhanced jump buffer management
    if (keys.jump && player.onGround) {
        jumpBuffer = jumpBufferTime; // Full buffer when on ground
    } else if (keys.jump && !player.onGround && jumpBuffer === 0) {
        jumpBuffer = jumpBufferTime; // Start buffer even if not on ground
    } else if (player.onGround) {
        jumpBuffer = 0; // Clear buffer when landing
    } else if (jumpBuffer > 0) {
        jumpBuffer--; // Decrease buffer over time
    }
    
    // Reset jump pressed flag when key is released
    if (!keys.jump) {
        jumpPressed = false;
    }
    
    // Apply gravity
    player.velocityY += player.gravity;
    
    // Update player position
    player.x += player.velocityX;
    player.y += player.velocityY;
    
    // Keep player within canvas bounds (horizontally)
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    
    // Check collisions
    checkCollisions();
    
    // Move platforms down
    const effective = Math.min(progress, SPEED_RAMP_FRAMES);
    gameSpeed = 1 + effective * 0.001;
    platforms.forEach(platform => {
        // handle thunder cloud activation delay
        if (platform.isThunderCloud && platform.isActivated && !platform.isFalling) {
            platform.fallDelay--;
            if (platform.fallDelay <= 0) {
                platform.isFalling = true;
                platform.fallSpeed = 2;
            }
        }

        if (platform.isFalling) {
            // Falling platforms move faster and accelerate
            platform.fallSpeed += 0.5; // Accelerate falling
            platform.y += platform.fallSpeed;
        } else {
            platform.y += gameSpeed;
        }
    });
    
    // Remove platforms that are off screen
    platforms = platforms.filter(platform => platform.y < canvas.height + 50);
    
    // Generate new platforms
    if (platforms.length < 8) {
        generateNewPlatform();
    }
    
    // Update score
    // score += 1; // Removed automatic score increment
    // scoreElement.textContent = score; // Removed automatic score increment
    
    // Check game over
    if (player.y > canvas.height) {
        gameOver();
    }
}

// Render game
function render() {
    if (gameState !== 'playing' && gameState !== 'gameOver') return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background disabled - using CSS background instead
    // drawBackground();
    drawPlatforms();
    drawPlayer();
}

// Add RAF handle for start/stop control
let animationId = null;

function gameLoop() {
    update();
    render();
    animationId = requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
    gameState = 'playing';
    score = 0;
    progress = 0;
    scoreElement.textContent = score; // Ensure score display is updated
    gameSpeed = 1;
    player.x = canvas.width / 2 - 15;
    player.y = canvas.height / 2 - 25;
    player.velocityX = 0;
    player.velocityY = 0;
    player.facingRight = true; // Reset facing direction
    
    initializePlatforms();
    
    document.querySelector('.game-ui').style.display = 'none';
    gameOverDiv.classList.add('hidden');
    startBtn.classList.add('hidden'); // hide after first press

    // Initialize and start background music
    if (window.audioManager) {
        window.audioManager.init();
        window.audioManager.playBGMusic('dreamchaser');
    }
}

// Game over
function gameOver() {
    // Prevent multiple calls to gameOver in the same session
    if (gameState === 'gameOver') return;
    
    gameState = 'gameOver';
    
    // Stop background music
    if (window.audioManager) {
        window.audioManager.stopBGMusic();
    }
    // Determine if the player qualifies for a tiered reward
    const rewardTiers = [
        { points: 55, reward: '50% de descuento', code: 'NAIOADS' },
        { points: 45, reward: '25% de descuento', code: 'UEONSK' },
        { points: 35, reward: '15% de descuento', code: 'SNAIOADS' },
        { points: 25, reward: '10% de descuento', code: 'XJHO9HN' },
        { points: 20, reward: 'Envío gratis',      code: 'NJK92NL' }
    ];

    const achievedTier = rewardTiers.find(t => score >= t.points);

    if (achievedTier) {
        // Special winner screen with tiered rewards
        const overlay = document.getElementById('winnerOverlay');
        const numberSpan = document.getElementById('winnerNumber');
        if (numberSpan) {
            window.getGlobalWinnerNumber().then(n => { numberSpan.textContent = n; });
        }

        // Set the correct template image
        window.setWinnerTemplate();

        // Update dynamic reward copy
        const discountMsg = overlay.querySelector('.discount-msg');
        if (discountMsg) {
            discountMsg.innerHTML = `
                <p>Has ganado un ${achievedTier.reward} en tu próxima compra de NipSkin!</p>
                <p>Usa este código en nuestra tienda para reclamar tu premio:</p>
                <p class="discount-code"><strong>${achievedTier.code}</strong></p>
            `;
        }

        overlay.classList.remove('hidden');
        document.body.classList.add('winner-mode');
        document.querySelector('.game-ui').style.display = 'block';

        const wr = document.getElementById('winnerRestartBtn');
        const wm = document.getElementById('winnerMenuBtn');
        if (wr) {
            wr.onclick = () => {
                overlay.classList.add('hidden');
                document.body.classList.remove('winner-mode');
                startGame();
            };
        }
        if (wm) {
            wm.onclick = () => {
                document.body.classList.remove('winner-mode');
                window.returnToMenu && window.returnToMenu();
            };
        }
    } else {
    finalScoreElement.textContent = score;
    gameOverDiv.classList.remove('hidden');
    // Hide start button so only PLAY AGAIN shows
    startBtn.classList.add('hidden');
    document.querySelector('.game-ui').style.display = 'block';

        // Re-attach PLAY AGAIN and MAIN MENU behaviour without duplicate listeners
        const restart = document.getElementById('restartBtn');
        const menu = document.getElementById('menuBtn');
        if (restart) {
            restart.onclick = () => {
                gameOverDiv.classList.add('hidden');
                startGame();
            };
        }
        if (menu) {
            menu.onclick = () => {
                window.returnToMenu && window.returnToMenu();
            };
        }
    }
}

// Control event listeners
startBtn.addEventListener('click', startGame);

// Touch controls
// Unified pointer controls to avoid duplicate touch/click events
function bindPointer(button, key) {
    const onDown = (e) => {
        e.preventDefault();
        try { button.setPointerCapture(e.pointerId); } catch (_) {}
        keys[key] = true;
        if (button === jumpBtn) button.style.opacity = '0.7';
    };
    const clear = (e) => {
        e && e.preventDefault();
        keys[key] = false;
        if (button === jumpBtn) button.style.opacity = '1';
        try { button.releasePointerCapture && button.releasePointerCapture(e?.pointerId); } catch (_) {}
    };
    button.addEventListener('pointerdown', onDown, { passive: false });
    button.addEventListener('pointerup', clear, { passive: false });
    button.addEventListener('pointercancel', clear, { passive: false });
    button.addEventListener('pointerleave', clear, { passive: false });
    // Block synthetic click to prevent duplicate triggers
    button.addEventListener('click', (e) => e.preventDefault());
    button.addEventListener('contextmenu', (e) => e.preventDefault());
}

bindPointer(leftBtn, 'left');
bindPointer(rightBtn, 'right');
bindPointer(jumpBtn, 'jump');

// As a safety net, clear keys when the tab loses focus (prevents "stuck" inputs)
window.addEventListener('blur', () => {
    keys.left = keys.right = keys.jump = false;
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
        case 'a':
        case 'A':
            keys.left = true;
            break;
        case 'ArrowRight':
            e.preventDefault();
        case 'd':
        case 'D':
            keys.right = true;
            break;
        case ' ':
        case 'ArrowUp':
        case 'w':
        case 'W':
            e.preventDefault();
            keys.jump = true;
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
        case 'a':
        case 'A':
            keys.left = false;
            break;
        case 'ArrowRight':
            e.preventDefault();
        case 'd':
        case 'D':
            keys.right = false;
            break;
        case ' ':
        case 'ArrowUp':
        case 'w':
        case 'W':
            keys.jump = false;
            break;
    }
});

// Prevent context menu on long press
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// ------- Module API for hub -------

export function start() {
    // Reset UI & state then kick off gameplay
    startGame();            // built-in reset logic
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
}

export function stop() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    gameState = 'menu';
} 