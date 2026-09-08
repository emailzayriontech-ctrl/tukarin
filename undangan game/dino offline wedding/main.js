/**
 * Wedding Run - Main Game Logic
 */

// --- UI Elements ---
const screens = {
    landing: document.getElementById('landing-screen'),
    hud: document.getElementById('hud-screen'),
    gameOver: document.getElementById('game-over-screen'),
    milestoneScreen: document.getElementById('milestone-screen')
};

const btnPlay = document.getElementById('btn-play');
const btnRestart = document.getElementById('btn-restart');
const charBtns = document.querySelectorAll('.char-btn');
const scoreEl = document.getElementById('current-score');
const finalScoreEl = document.getElementById('final-score');
const milestoneToast = document.getElementById('milestone-toast');
const milestoneMsg = document.getElementById('milestone-msg');

// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let cw, ch;
function resizeCanvas() {
    cw = window.innerWidth;
    ch = window.innerHeight;
    canvas.width = cw;
    canvas.height = ch;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Game State ---
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let frameCount = 0;
let gameSpeed = 5;
let animationId;
let selectedChar = 'groom'; // default
const groundHeight = 100;

// Load Character Images
const imgGroom = new Image();
imgGroom.src = 'groom.png';
const imgGroomDuck = new Image();
imgGroomDuck.src = 'groom_duck.png';

const imgBride = new Image();
imgBride.src = 'bride.png';
const imgBrideDuck = new Image();
imgBrideDuck.src = 'bride_duck.png';

const chars = {
    groom: { img: imgGroom, imgDuck: imgGroomDuck },
    bride: { img: imgBride, imgDuck: imgBrideDuck }
};

// Milestones rich data (Isi Undangan Berurutan)
const milestones = [
    { score: 200, reached: false, icon: '👫', title: 'Kedua Mempelai', text: 'Zahra (Putri dari Bapak & Ibu X)\n&\nZayan (Putra dari Bapak & Ibu Y)', detailLabel: 'Tentang Kami:', detailText: 'Dua hati yang dipersatukan dalam ikatan suci.' },
    { score: 400, reached: false, icon: '🗓️', title: 'Tanggal Acara', text: 'Dengan memohon rahmat dan ridho Allah SWT, kami mengundang Bapak/Ibu/Saudara/i.', detailLabel: 'Akad & Resepsi:', detailText: 'Minggu, 24 September 2026\nPukul 08:00 WIB - Selesai' },
    { score: 600, reached: false, icon: '📍', title: 'Lokasi Acara', text: 'Kehadiran Anda adalah suatu kehormatan bagi kami.', detailLabel: 'Tempat:', detailText: 'Grand Ballroom Hotel Jakarta\n(Klik link maps pada undangan)' },
    { score: 800, reached: false, icon: '📖', title: 'Our Story', text: 'Pertemuan yang tak disengaja membawa kami pada perjalanan cinta yang indah.', detailLabel: 'Kisah Kami:', detailText: 'Berawal dari teman, kini menjadi teman hidup selamanya.' },
    { score: 1000, reached: false, icon: '📋', title: 'Susunan Acara', text: 'Rangkaian acara bahagia kami.', detailLabel: 'Jadwal:', detailText: '08.00 : Ijab Kabul\n11.00 : Resepsi\n13.00 : Foto Bersama' },
    { score: 1200, reached: false, icon: '🎁', title: 'Wedding Gift', text: 'Doa restu Anda adalah karunia terindah bagi kami. Namun, bagi yang ingin mengirimkan tanda kasih:', detailLabel: 'Digital Envelope:', detailText: 'BCA: 1234567890 (a.n Zayan)\nMandiri: 0987654321 (a.n Zahra)' },
    { score: 1400, reached: false, icon: '📝', title: 'Form Kehadiran', text: 'Merupakan suatu kebahagiaan apabila Bapak/Ibu/Saudara/i berkenan hadir.', detailLabel: 'RSVP:', detailText: 'Mohon konfirmasi kehadiran Anda melalui form undangan utama.' },
    { score: 1600, reached: false, icon: '📸', title: 'Gallery', text: 'Beberapa momen berharga perjalanan cinta kami sebelum menuju pelaminan.', detailLabel: 'Pre-Wedding:', detailText: '(Lihat foto-foto lengkap di halaman undangan)' },
    { score: 1800, reached: false, icon: '🙏', title: 'Terima Kasih', text: 'Tiada yang dapat kami ungkapkan selain rasa syukur dan terima kasih atas doa restunya.', detailLabel: 'Salam Hangat:', detailText: 'Zahra & Zayan' }
];

// Obstacle types (Emojis for MVP)
const obstacleTypes = ['🧾', '🚗', '🎁', '📦', '🌧️', '💬', '🕳️', '📷', '👶'];

// --- Entities ---

class Player {
    constructor() {
        this.w = 50;
        this.h = 80;
        this.x = 50;
        this.y = ch - groundHeight - this.h;
        this.vy = 0;
        this.gravity = 0.8;
        this.jumpPower = -15;
        this.isJumping = false;
        this.isDucking = false;
        
        // Ducking dimensions
        this.normalH = 80;
        this.duckH = 40;
    }

    jump() {
        if (!this.isJumping) {
            this.vy = this.jumpPower;
            this.isJumping = true;
        }
    }

    duck(isDucking) {
        if (isDucking && !this.isJumping) {
            this.isDucking = true;
            this.h = this.duckH;
            this.y = ch - groundHeight - this.h;
        } else if (!isDucking && this.isDucking) {
            this.isDucking = false;
            this.h = this.normalH;
            this.y = ch - groundHeight - this.h;
        }
    }

    update() {
        // Apply gravity
        this.vy += this.gravity;
        this.y += this.vy;

        // Ground collision
        if (this.y + this.h > ch - groundHeight) {
            this.y = ch - groundHeight - this.h;
            this.vy = 0;
            this.isJumping = false;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        
        let rotation = 0;
        let bobbingY = 0;

        // Apply running animation if on the ground and game is playing
        if (gameState === 'PLAYING' && !this.isJumping && !this.isDucking) {
            bobbingY = Math.sin(frameCount * 0.5) * 5; // Bob up and down
            rotation = Math.sin(frameCount * 0.5) * 0.15; // Wiggle slightly
        }

        ctx.rotate(rotation);
        
        // Draw slightly lower if ducking
        let drawY = this.isDucking ? -10 : bobbingY;
        
        const charData = chars[selectedChar];
        const currentImg = (this.isDucking && charData.imgDuck.complete && charData.imgDuck.naturalWidth !== 0) 
                            ? charData.imgDuck 
                            : charData.img;

        if (currentImg.complete && currentImg.naturalWidth !== 0) {
            // Draw image centered
            ctx.drawImage(currentImg, -this.w / 2, drawY - this.h / 2, this.w, this.h);
        } else {
            // Fallback square
            ctx.fillStyle = 'gray';
            ctx.fillRect(-this.w / 2, drawY - this.h / 2, this.w, this.h);
        }
        
        ctx.restore();
    }
}

class Obstacle {
    constructor() {
        this.w = 40;
        this.h = 40;
        this.x = cw;
        
        // Randomize type
        this.type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        
        // Some obstacles can be flying (e.g. Chat bubble, Rain)
        const isFlying = (this.type === '💬' || this.type === '🌧️') && Math.random() > 0.5;
        if (isFlying) {
            this.y = ch - groundHeight - this.h - 50; // Fly height
        } else {
            this.y = ch - groundHeight - this.h;
        }
        
        this.markedForDeletion = false;
    }

    update() {
        this.x -= gameSpeed;
        if (this.x + this.w < 0) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.font = '40px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(this.type, this.x, this.y);
        
        // Debug hitbox
        // ctx.strokeStyle = 'blue';
        // ctx.strokeRect(this.x, this.y, this.w, this.h);
    }
}

// --- Global Variables ---
let player;
let obstacles = [];
let obstacleTimer = 0;

function initGame() {
    player = new Player();
    obstacles = [];
    score = 0;
    frameCount = 0;
    gameSpeed = 6;
    
    // Reset milestones
    milestones.forEach(m => m.reached = false);
    
    scoreEl.innerText = score;
    milestoneToast.classList.add('hidden');
}

// --- Inputs ---

// Keyboard
window.addEventListener('keydown', (e) => {
    if (gameState !== 'PLAYING') return;
    
    // Mencegah halaman scroll ke bawah saat menekan spasi/panah
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
    }

    if (e.code === 'Space' || e.code === 'ArrowUp') {
        player.jump();
    } else if (e.code === 'ArrowDown') {
        player.duck(true);
    }
});
window.addEventListener('keyup', (e) => {
    if (gameState !== 'PLAYING') return;
    if (e.code === 'ArrowDown') {
        player.duck(false);
    }
});

// Touch (Swipe Detection)
let touchStartY = 0;
let touchEndY = 0;

window.addEventListener('touchstart', (e) => {
    if (gameState !== 'PLAYING') return;
    touchStartY = e.changedTouches[0].screenY;
}, {passive: false});

window.addEventListener('touchmove', (e) => {
    if (gameState !== 'PLAYING') return;
    // Prevent default scroll on canvas
    e.preventDefault(); 
    touchEndY = e.changedTouches[0].screenY;
    
    // Detect swipe while moving for responsive ducking
    if (touchEndY > touchStartY + 30) {
        // Swipe Down
        player.duck(true);
    }
}, {passive: false});

window.addEventListener('touchend', (e) => {
    if (gameState !== 'PLAYING') return;
    touchEndY = e.changedTouches[0].screenY;
    
    player.duck(false); // Release duck

    if (touchEndY < touchStartY - 30) {
        // Swipe Up
        player.jump();
    }
});

// --- Collision ---
function checkCollision(p, o) {
    // Basic AABB collision with slight padding to make it forgiving
    const paddingX = 10;
    const paddingY = 10;
    
    return (
        p.x + paddingX < o.x + o.w &&
        p.x + p.w - paddingX > o.x &&
        p.y + paddingY < o.y + o.h &&
        p.y + p.h - paddingY > o.y
    );
}

// --- Main Loop ---
function drawBackground() {
    // Very simple background for now (Sky + Ground)
    // Could be expanded with parallax layers
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, cw, ch);
    
    // Draw ground
    ctx.fillStyle = '#8B4513'; // Dirt brown
    ctx.fillRect(0, ch - groundHeight, cw, groundHeight);
    ctx.fillStyle = '#228B22'; // Grass green
    ctx.fillRect(0, ch - groundHeight, cw, 10);
}

function handleMilestones() {
    for (let m of milestones) {
        if (score >= m.score && !m.reached) {
            m.reached = true;
            showMilestoneModal(m);
            gameSpeed += 0.5; // Increase difficulty
        }
    }
}

function showMilestoneModal(m) {
    gameState = 'PAUSED';
    document.getElementById('modal-icon').innerText = m.icon;
    document.getElementById('modal-title').innerText = m.title;
    document.getElementById('modal-text').innerText = m.text;
    document.getElementById('modal-detail-label').innerText = m.detailLabel;
    document.getElementById('modal-detail-text').innerText = m.detailText;
    
    screens.milestoneScreen.classList.add('active');
    cancelAnimationFrame(animationId);
}

function closeModalAndResume() {
    screens.milestoneScreen.classList.remove('active');
    gameState = 'PLAYING';
    
    // Jeda sebentar agar pemain siap
    setTimeout(() => {
        if (gameState === 'PLAYING') {
            gameLoop();
        }
    }, 300);
}

document.getElementById('btn-continue').addEventListener('click', closeModalAndResume);
document.getElementById('btn-close-modal').addEventListener('click', closeModalAndResume);

function gameLoop() {
    if (gameState !== 'PLAYING') return;

    ctx.clearRect(0, 0, cw, ch);
    
    drawBackground();

    // Spawning obstacles
    obstacleTimer++;
    // Spawn rate based on game speed (faster = spawn slightly faster, but needs gaps)
    let spawnRate = Math.max(60, 150 - (gameSpeed * 5)); 
    
    if (obstacleTimer > spawnRate) {
        // Add some randomness to gap
        if (Math.random() > 0.3) {
            obstacles.push(new Obstacle());
        }
        obstacleTimer = 0;
    }

    player.update();
    player.draw();

    for (let i = 0; i < obstacles.length; i++) {
        let o = obstacles[i];
        o.update();
        o.draw();

        if (checkCollision(player, o)) {
            gameOver();
            return;
        }
    }

    obstacles = obstacles.filter(o => !o.markedForDeletion);

    // Score
    if (frameCount % 5 === 0) {
        score++;
        scoreEl.innerText = score;
        handleMilestones();
    }

    frameCount++;
    animationId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState = 'GAMEOVER';
    cancelAnimationFrame(animationId);
    
    finalScoreEl.innerText = score;
    switchScreen('gameOver');
}

// --- UI Navigation ---
function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Events
charBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        charBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedChar = btn.dataset.char;
    });
});

btnPlay.addEventListener('click', function() {
    this.blur(); // Remove focus
    switchScreen('hud');
    initGame();
    gameState = 'PLAYING';
    gameLoop();
});

btnRestart.addEventListener('click', function() {
    this.blur(); // Remove focus
    switchScreen('hud');
    initGame();
    gameState = 'PLAYING';
    gameLoop();
});

// Placeholder for external redirects
document.getElementById('btn-open-invitation').addEventListener('click', () => {
    window.location.href = '#undangan';
});
document.getElementById('btn-buka-undangan-end').addEventListener('click', () => {
    window.location.href = '#undangan';
});
