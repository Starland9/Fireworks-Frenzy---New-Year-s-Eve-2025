// 🎆 FIREWORKS FRENZY - New Year's Eve 2025 Game 🎆

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Local Storage Keys
const STORAGE_KEYS = {
    HIGH_SCORE: 'fireworks_high_score',
    SAVED_SESSION: 'fireworks_saved_session',
    PLAYER_NAME: 'fireworks_player_name',
    PLAYER_ID: 'fireworks_player_id'
};

// Session expiration time (24 hours in milliseconds)
const MAX_SESSION_AGE = 24 * 60 * 60 * 1000;

// Game Constants
const MAX_LIVES = 3;
const SHIELD_DURATION = 5000; // 5 seconds
const TIME_FREEZE_DURATION = 4000; // 4 seconds
const MULTI_POP_DURATION = 6000; // 6 seconds

// Power-up types
const POWERUP_TYPES = {
    EXTRA_LIFE: 'extraLife',
    SHIELD: 'shield',
    TIME_FREEZE: 'timeFreeze',
    MULTI_POP: 'multiPop'
};

// Game state
let gameRunning = false;
let score = 0;
let highScore = 0;
let combo = 1;
let comboTimer = 0;
let lives = MAX_LIVES;
let fireworks = [];
let particles = [];
let stars = [];
let floatingTexts = [];
let powerups = [];

// Active power-up effects
let activeEffects = {
    shield: false,
    shieldTimer: 0,
    timeFreeze: false,
    timeFreezeTimer: 0,
    multiPop: false,
    multiPopTimer: 0
};

// Player identification for leaderboard
let playerId = null;

// Visual effects state
let screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
let screenFlash = { color: '', alpha: 0, duration: 0 };

// Audio system
let audioContext = null;
const sounds = {
    pop: null,
    explosion: null,
    combo: null,
    bomb: null,
    golden: null,
    music: null
};
let musicPlaying = false;

// Initialize audio context (called on first user interaction)
function initAudioContext() {
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
        console.log('⚠️ Web Audio API not supported');
    }
}

// Load audio files
async function loadSound(name, url) {
    if (!audioContext) return;
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        sounds[name] = await audioContext.decodeAudioData(arrayBuffer);
        console.log(`✅ Loaded sound: ${name}`);
    } catch (error) {
        console.log(`⚠️ Could not load sound: ${name} (${url}) - Using synthesized sound`);
    }
}

// Initialize sounds
async function initSounds() {
    if (!audioContext) return;
    // Try to load audio files if they exist
    await Promise.all([
        loadSound('pop', 'sounds/pop.mp3'),
        loadSound('explosion', 'sounds/explosion.mp3'),
        loadSound('combo', 'sounds/combo.mp3'),
        loadSound('bomb', 'sounds/bomb.mp3'),
        loadSound('golden', 'sounds/golden.mp3'),
        loadSound('music', 'sounds/music.mp3')
    ]);
}

// Play sound (with fallback to synthesized sounds)
function playSound(name, volume = 0.5) {
    if (!audioContext) return;
    
    // Ensure audio context is resumed (required after user interaction)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    if (sounds[name]) {
        // Play loaded audio file
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        source.buffer = sounds[name];
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start();
    } else {
        // Play synthesized sound as fallback
        playSynthSound(name, volume);
    }
}

// Synthesized sounds (fallback when audio files not present)
function playSynthSound(name, volume) {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(volume, now);
    
    switch(name) {
        case 'pop':
            oscillator.frequency.setValueAtTime(600, now);
            oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;
        case 'explosion':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, now);
            oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.3);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
            break;
        case 'combo':
            oscillator.frequency.setValueAtTime(400, now);
            oscillator.frequency.setValueAtTime(500, now + 0.05);
            oscillator.frequency.setValueAtTime(600, now + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            oscillator.start(now);
            oscillator.stop(now + 0.15);
            break;
        case 'bomb':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(100, now);
            oscillator.frequency.exponentialRampToValueAtTime(30, now + 0.4);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            oscillator.start(now);
            oscillator.stop(now + 0.4);
            break;
        case 'golden':
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.setValueAtTime(1000, now + 0.05);
            oscillator.frequency.setValueAtTime(1200, now + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;
        default:
            // Unknown sound - play a generic beep
            console.log(`⚠️ Unknown sound: ${name}`);
            oscillator.frequency.setValueAtTime(440, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;
    }
}

// Screen shake effect
function triggerScreenShake(intensity, duration) {
    screenShake.intensity = intensity;
    screenShake.duration = duration;
}

// Screen flash effect
function triggerScreenFlash(color, duration) {
    screenFlash.color = color;
    screenFlash.alpha = 0.6;
    screenFlash.duration = duration;
}

// Update screen effects
function updateScreenEffects(deltaTime) {
    // Update screen shake
    if (screenShake.duration > 0) {
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity * 2;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity * 2;
        screenShake.duration -= deltaTime;
        screenShake.intensity *= 0.95;
    } else {
        screenShake.x = 0;
        screenShake.y = 0;
    }
    
    // Update screen flash
    if (screenFlash.duration > 0) {
        screenFlash.duration -= deltaTime;
        screenFlash.alpha *= 0.9;
    }
}

// Draw screen flash
function drawScreenFlash() {
    if (screenFlash.alpha > 0.01) {
        ctx.fillStyle = screenFlash.color.replace('1)', `${screenFlash.alpha})`);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// Timing
let lastTime = 0;
let spawnTimer = 0;
let difficultyTimer = 0;
let spawnInterval = 1500; // ms between firework spawns
let gameStartTime = 0;
let saveSessionTimer = 0; // Timer for periodic session saving

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    generateStars();
}

// Generate background stars
function generateStars() {
    stars = [];
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2 + 0.5,
            twinkle: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.02 + 0.01
        });
    }
}

// Firework class
class Firework {
    constructor() {
        this.x = Math.random() * (canvas.width - 100) + 50;
        this.y = canvas.height + 50;
        this.targetY = Math.random() * (canvas.height * 0.6) + 50;
        this.speed = Math.random() * 3 + 4;
        this.radius = Math.random() * 15 + 25;
        this.hue = Math.random() * 360;
        
        // Type determination: 10% golden, 15% bomb, 75% normal
        const typeRoll = Math.random();
        this.isGolden = typeRoll < 0.1;
        this.isBomb = !this.isGolden && typeRoll < 0.25; // 15% chance for bomb
        
        this.trail = [];
        this.maxTrailLength = 20;
        this.alive = true;
        this.exploding = false;
        this.explosionTime = 0;
        this.wobble = 0;
        this.wobbleSpeed = Math.random() * 0.1 + 0.05;
        this.pulsePhase = Math.random() * Math.PI * 2;
        
        // Bombs are slightly smaller and move differently
        if (this.isBomb) {
            this.radius = Math.random() * 10 + 20;
            this.wobbleSpeed = Math.random() * 0.15 + 0.1;
        }
    }
    
    update(deltaTime) {
        if (this.exploding) {
            this.explosionTime += deltaTime;
            if (this.explosionTime > 500) {
                this.alive = false;
            }
            return;
        }
        
        // Add trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // Move upward with wobble
        this.wobble += this.wobbleSpeed;
        this.x += Math.sin(this.wobble) * 1.5;
        this.y -= this.speed;
        this.pulsePhase += 0.1;
        
        // Check if reached target or went off screen
        if (this.y <= this.targetY) {
            this.explode(false);
        }
    }
    
    explode(popped) {
        this.exploding = true;
        
        // Create explosion particles
        const particleCount = this.isGolden ? 80 : (this.isBomb ? 60 : 50);
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = Math.random() * 5 + 3;
            let hue;
            if (this.isBomb) {
                hue = Math.random() < 0.5 ? 0 : 30; // Red and orange for bombs
            } else if (this.isGolden) {
                hue = 45 + Math.random() * 20;
            } else {
                hue = this.hue + Math.random() * 30 - 15;
            }
            
            particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed * (Math.random() * 0.5 + 0.5),
                vy: Math.sin(angle) * speed * (Math.random() * 0.5 + 0.5),
                radius: Math.random() * 3 + 2,
                hue: hue,
                life: 1,
                decay: Math.random() * 0.01 + 0.005,
                isGolden: this.isGolden,
                isBomb: this.isBomb,
                sparkle: Math.random() * Math.PI * 2
            });
        }
        
        // Add some glitter particles (or smoke for bombs)
        for (let i = 0; i < (this.isBomb ? 30 : 20); i++) {
            particles.push({
                x: this.x + (Math.random() - 0.5) * 50,
                y: this.y + (Math.random() - 0.5) * 50,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                radius: Math.random() * 2 + 1,
                hue: this.isBomb ? 0 : (this.isGolden ? 45 : this.hue),
                life: 1,
                decay: 0.02,
                isGlitter: !this.isBomb,
                isSmoke: this.isBomb,
                sparkle: Math.random() * Math.PI * 2
            });
        }
        
        if (!popped) {
            // Missed - reset combo (but not if it's a bomb - avoiding bombs is good!)
            if (!this.isBomb) {
                combo = 1;
                // Lose a life for missing a normal/golden firework
                loseLife('Firework escaped! 💨');
                updateUI();
            }
        }
    }
    
    draw() {
        if (this.exploding) return;
        
        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = i / this.trail.length * 0.5;
            const trailRadius = (i / this.trail.length) * this.radius * 0.5;
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, trailRadius, 0, Math.PI * 2);
            if (this.isBomb) {
                ctx.fillStyle = `rgba(50, 50, 50, ${alpha})`;
            } else if (this.isGolden) {
                ctx.fillStyle = `hsla(45, 100%, 70%, ${alpha})`;
            } else {
                ctx.fillStyle = `hsla(${this.hue}, 100%, 60%, ${alpha})`;
            }
            ctx.fill();
        }
        
        // Draw main firework with pulsing effect
        const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.1;
        const currentRadius = this.radius * pulseScale;
        
        // Glow effect
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, currentRadius * 2
        );
        
        if (this.isBomb) {
            gradient.addColorStop(0, 'rgba(80, 30, 30, 1)');
            gradient.addColorStop(0.5, 'rgba(50, 20, 20, 0.5)');
            gradient.addColorStop(1, 'rgba(30, 10, 10, 0)');
        } else if (this.isGolden) {
            gradient.addColorStop(0, 'rgba(255, 215, 0, 1)');
            gradient.addColorStop(0.5, 'rgba(255, 180, 0, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
        } else {
            gradient.addColorStop(0, `hsla(${this.hue}, 100%, 70%, 1)`);
            gradient.addColorStop(0.5, `hsla(${this.hue}, 100%, 50%, 0.5)`);
            gradient.addColorStop(1, `hsla(${this.hue}, 100%, 50%, 0)`);
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Core
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        if (this.isBomb) {
            ctx.fillStyle = 'rgba(40, 40, 40, 1)';
            ctx.strokeStyle = 'rgba(100, 30, 30, 0.8)';
        } else if (this.isGolden) {
            ctx.fillStyle = 'rgba(255, 235, 150, 1)';
            ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
        } else {
            ctx.fillStyle = `hsla(${this.hue}, 100%, 80%, 1)`;
            ctx.strokeStyle = `hsla(${this.hue}, 100%, 60%, 0.8)`;
        }
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
        
        // Draw bomb fuse and warning
        if (this.isBomb) {
            // Fuse
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - currentRadius);
            ctx.lineTo(this.x + 5, this.y - currentRadius - 15);
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Spark at fuse end
            const sparkPhase = (Date.now() / 100) % (Math.PI * 2);
            ctx.beginPath();
            ctx.arc(this.x + 5, this.y - currentRadius - 15, 4 + Math.sin(sparkPhase) * 2, 0, Math.PI * 2);
            ctx.fillStyle = Math.sin(sparkPhase) > 0 ? '#ff6600' : '#ff0000';
            ctx.fill();
            
            // Skull emoji or X mark
            ctx.font = `${currentRadius * 0.8}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ff3333';
            ctx.fillText('💀', this.x, this.y);
        }
        
        // Sparkle effect for golden
        if (this.isGolden) {
            ctx.fillStyle = 'white';
            for (let i = 0; i < 4; i++) {
                const angle = (this.pulsePhase * 2 + i * Math.PI / 2);
                const sx = this.x + Math.cos(angle) * currentRadius * 0.5;
                const sy = this.y + Math.sin(angle) * currentRadius * 0.5;
                ctx.beginPath();
                ctx.arc(sx, sy, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    contains(px, py) {
        if (this.exploding) return false;
        const dx = px - this.x;
        const dy = py - this.y;
        return dx * dx + dy * dy <= this.radius * this.radius * 2.5; // Slightly larger hitbox
    }
}

// Update particles
function updateParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // Gravity
        p.life -= p.decay;
        p.sparkle += 0.2;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Draw particles
function drawParticles() {
    for (const p of particles) {
        const alpha = p.life;
        const sparkleMultiplier = p.isGlitter ? (0.5 + Math.sin(p.sparkle) * 0.5) : 1;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * sparkleMultiplier, 0, Math.PI * 2);
        
        if (p.isSmoke) {
            // Dark smoke for bombs
            ctx.fillStyle = `rgba(60, 60, 60, ${alpha})`;
        } else if (p.isBomb) {
            // Red/orange explosion for bombs
            ctx.fillStyle = `hsla(${p.hue}, 100%, 50%, ${alpha})`;
        } else if (p.isGolden) {
            ctx.fillStyle = `hsla(45, 100%, ${60 + Math.sin(p.sparkle) * 20}%, ${alpha})`;
        } else {
            ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${alpha})`;
        }
        ctx.fill();
        
        // Add extra glow for golden particles
        if ((p.isGolden || p.isGlitter) && !p.isSmoke) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${alpha * 0.3})`;
            ctx.fill();
        }
    }
}

// Draw stars
function drawStars(deltaTime) {
    for (const star of stars) {
        star.twinkle += star.speed;
        const brightness = 0.5 + Math.sin(star.twinkle) * 0.5;
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.fill();
    }
}

// Floating text for score popups
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1;
        this.scale = 1;
    }
    
    update(deltaTime) {
        this.y -= 2;
        this.life -= 0.02;
        this.scale += 0.02;
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.color.replace('1)', `${this.life})`);
        ctx.strokeStyle = `rgba(0, 0, 0, ${this.life})`;
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, 0, 0);
        ctx.fillText(this.text, 0, 0);
        ctx.restore();
    }
}

// Update floating texts
function updateFloatingTexts(deltaTime) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].update(deltaTime);
        if (floatingTexts[i].life <= 0) {
            floatingTexts.splice(i, 1);
        }
    }
}

// Draw floating texts
function drawFloatingTexts() {
    for (const ft of floatingTexts) {
        ft.draw();
    }
}

// ============================================
// POWER-UP SYSTEM
// ============================================

class PowerUp {
    constructor(type) {
        this.x = Math.random() * (canvas.width - 100) + 50;
        this.y = canvas.height + 30;
        this.targetY = Math.random() * (canvas.height * 0.5) + 100;
        this.speed = Math.random() * 2 + 2;
        this.radius = 25;
        this.type = type;
        this.alive = true;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.wobble = 0;
        this.wobbleSpeed = 0.08;
        this.collected = false;
        this.collectAnimation = 0;
        
        // Set appearance based on type
        switch(type) {
            case POWERUP_TYPES.EXTRA_LIFE:
                this.emoji = '💚';
                this.color = 'rgba(0, 255, 100, 1)';
                this.glowColor = 'rgba(0, 255, 100, 0.5)';
                break;
            case POWERUP_TYPES.SHIELD:
                this.emoji = '🛡️';
                this.color = 'rgba(100, 150, 255, 1)';
                this.glowColor = 'rgba(100, 150, 255, 0.5)';
                break;
            case POWERUP_TYPES.TIME_FREEZE:
                this.emoji = '⏰';
                this.color = 'rgba(150, 200, 255, 1)';
                this.glowColor = 'rgba(150, 200, 255, 0.5)';
                break;
            case POWERUP_TYPES.MULTI_POP:
                this.emoji = '💥';
                this.color = 'rgba(255, 150, 0, 1)';
                this.glowColor = 'rgba(255, 150, 0, 0.5)';
                break;
        }
    }
    
    update(deltaTime) {
        if (this.collected) {
            this.collectAnimation += deltaTime;
            if (this.collectAnimation > 500) {
                this.alive = false;
            }
            return;
        }
        
        this.wobble += this.wobbleSpeed;
        this.x += Math.sin(this.wobble) * 1;
        this.y -= this.speed;
        this.pulsePhase += 0.1;
        
        // Disappear if reached target
        if (this.y <= this.targetY - 100) {
            this.alive = false;
        }
    }
    
    draw() {
        if (!this.alive) return;
        
        const scale = this.collected ? (1 + this.collectAnimation / 200) : (1 + Math.sin(this.pulsePhase) * 0.1);
        const alpha = this.collected ? Math.max(0, 1 - this.collectAnimation / 500) : 1;
        
        // Glow effect
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * 2
        );
        gradient.addColorStop(0, this.glowColor);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw emoji
        ctx.font = `${this.radius * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.x, this.y);
        
        ctx.globalAlpha = 1;
    }
    
    contains(px, py) {
        if (this.collected) return false;
        const dx = px - this.x;
        const dy = py - this.y;
        return dx * dx + dy * dy <= this.radius * this.radius * 2;
    }
    
    collect() {
        if (this.collected) return;
        this.collected = true;
        
        // Apply power-up effect
        switch(this.type) {
            case POWERUP_TYPES.EXTRA_LIFE:
                if (lives < MAX_LIVES) {
                    lives++;
                    updateLivesDisplay();
                    floatingTexts.push(new FloatingText(this.x, this.y, '+1 ❤️', 'rgba(0, 255, 100, 1)'));
                    playSound('golden', 0.4);
                } else {
                    // Already max lives, give bonus points
                    const bonus = 500;
                    score += bonus;
                    floatingTexts.push(new FloatingText(this.x, this.y, `+${bonus} MAX HP!`, 'rgba(0, 255, 100, 1)'));
                    playSound('combo', 0.4);
                }
                break;
            case POWERUP_TYPES.SHIELD:
                activeEffects.shield = true;
                activeEffects.shieldTimer = SHIELD_DURATION;
                floatingTexts.push(new FloatingText(this.x, this.y, '🛡️ SHIELD!', 'rgba(100, 150, 255, 1)'));
                playSound('golden', 0.4);
                triggerScreenFlash('rgba(100, 150, 255, 1)', 200);
                break;
            case POWERUP_TYPES.TIME_FREEZE:
                activeEffects.timeFreeze = true;
                activeEffects.timeFreezeTimer = TIME_FREEZE_DURATION;
                floatingTexts.push(new FloatingText(this.x, this.y, '⏰ FREEZE!', 'rgba(150, 200, 255, 1)'));
                playSound('golden', 0.4);
                triggerScreenFlash('rgba(150, 200, 255, 1)', 200);
                break;
            case POWERUP_TYPES.MULTI_POP:
                activeEffects.multiPop = true;
                activeEffects.multiPopTimer = MULTI_POP_DURATION;
                floatingTexts.push(new FloatingText(this.x, this.y, '💥 MULTI-POP!', 'rgba(255, 150, 0, 1)'));
                playSound('combo', 0.4);
                triggerScreenFlash('rgba(255, 150, 0, 1)', 200);
                break;
        }
        
        updateUI();
    }
}

// Power-up spawn weights (higher = more common)
const POWERUP_WEIGHTS = {
    [POWERUP_TYPES.EXTRA_LIFE]: 0.15,  // Rare - valuable
    [POWERUP_TYPES.SHIELD]: 0.30,       // Common
    [POWERUP_TYPES.TIME_FREEZE]: 0.25,  // Medium
    [POWERUP_TYPES.MULTI_POP]: 0.30     // Common
};

// Spawn power-up with random type
function spawnPowerUp() {
    const types = Object.values(POWERUP_TYPES);
    const rand = Math.random();
    let cumulative = 0;
    let selectedType = types[0];
    
    for (const type of types) {
        cumulative += POWERUP_WEIGHTS[type];
        if (rand < cumulative) {
            selectedType = type;
            break;
        }
    }
    
    powerups.push(new PowerUp(selectedType));
}

// Update power-ups
function updatePowerUps(deltaTime) {
    for (let i = powerups.length - 1; i >= 0; i--) {
        powerups[i].update(deltaTime);
        if (!powerups[i].alive) {
            powerups.splice(i, 1);
        }
    }
}

// Draw power-ups
function drawPowerUps() {
    for (const pu of powerups) {
        pu.draw();
    }
}

// Update active effects
function updateActiveEffects(deltaTime) {
    if (activeEffects.shield) {
        activeEffects.shieldTimer -= deltaTime;
        if (activeEffects.shieldTimer <= 0) {
            activeEffects.shield = false;
            floatingTexts.push(new FloatingText(canvas.width / 2, canvas.height / 2, 'Shield expired!', 'rgba(100, 150, 255, 1)'));
        }
    }
    
    if (activeEffects.timeFreeze) {
        activeEffects.timeFreezeTimer -= deltaTime;
        if (activeEffects.timeFreezeTimer <= 0) {
            activeEffects.timeFreeze = false;
            floatingTexts.push(new FloatingText(canvas.width / 2, canvas.height / 2, 'Time resumed!', 'rgba(150, 200, 255, 1)'));
        }
    }
    
    if (activeEffects.multiPop) {
        activeEffects.multiPopTimer -= deltaTime;
        if (activeEffects.multiPopTimer <= 0) {
            activeEffects.multiPop = false;
            floatingTexts.push(new FloatingText(canvas.width / 2, canvas.height / 2, 'Multi-Pop ended!', 'rgba(255, 150, 0, 1)'));
        }
    }
    
    updateEffectsDisplay();
}

// Draw active effects indicators
function drawActiveEffects() {
    let yOffset = 80;
    const x = 20;
    
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    
    if (activeEffects.shield) {
        const timeLeft = Math.ceil(activeEffects.shieldTimer / 1000);
        ctx.fillStyle = 'rgba(100, 150, 255, 0.9)';
        ctx.fillText(`🛡️ Shield: ${timeLeft}s`, x, yOffset);
        yOffset += 25;
    }
    
    if (activeEffects.timeFreeze) {
        const timeLeft = Math.ceil(activeEffects.timeFreezeTimer / 1000);
        ctx.fillStyle = 'rgba(150, 200, 255, 0.9)';
        ctx.fillText(`⏰ Freeze: ${timeLeft}s`, x, yOffset);
        yOffset += 25;
    }
    
    if (activeEffects.multiPop) {
        const timeLeft = Math.ceil(activeEffects.multiPopTimer / 1000);
        ctx.fillStyle = 'rgba(255, 150, 0, 0.9)';
        ctx.fillText(`💥 Multi-Pop: ${timeLeft}s`, x, yOffset);
        yOffset += 25;
    }
}

// ============================================
// END POWER-UP SYSTEM
// ============================================

// Spawn new firework
function spawnFirework() {
    fireworks.push(new Firework());
}

// Update countdown display
function updateCountdown() {
    const now = new Date();
    // Hardcode countdown to 2026 for the New Year's Eve 2025 game
    const newYear = new Date(2026, 0, 1, 0, 0, 0);
    
    // If it's already past midnight on Dec 31st 2025
    if (now >= newYear) {
        document.getElementById('countdown-timer').textContent = "🎉 HAPPY 2026! 🎉";
        return;
    }
    
    const diff = newYear - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('countdown-timer').textContent = timeString;
}

// Update UI elements
function updateUI() {
    document.getElementById('score').textContent = score.toLocaleString();
    document.getElementById('combo').textContent = `x${combo}`;
}

// Update lives display
function updateLivesDisplay() {
    const livesDisplay = document.getElementById('lives-display');
    if (livesDisplay) {
        let hearts = '';
        for (let i = 0; i < MAX_LIVES; i++) {
            hearts += i < lives ? '❤️' : '🖤';
        }
        livesDisplay.textContent = hearts;
    }
}

// Update effects display (stub for UI, actual drawing in canvas)
function updateEffectsDisplay() {
    // Effects are drawn directly on canvas in drawActiveEffects()
}

// Lose a life
function loseLife(reason) {
    // Shield protects from losing life
    if (activeEffects.shield) {
        floatingTexts.push(new FloatingText(canvas.width / 2, canvas.height / 2, '🛡️ Shield protected!', 'rgba(100, 150, 255, 1)'));
        return;
    }
    
    lives--;
    updateLivesDisplay();
    
    floatingTexts.push(new FloatingText(canvas.width / 2, canvas.height / 2 - 50, reason, 'rgba(255, 100, 100, 1)'));
    floatingTexts.push(new FloatingText(canvas.width / 2, canvas.height / 2, `-1 ❤️ (${lives} left)`, 'rgba(255, 50, 50, 1)'));
    
    triggerScreenShake(10, 300);
    
    if (lives <= 0) {
        gameOver();
    }
}

// Game Over
function gameOver() {
    gameRunning = false;
    
    // Save high score
    saveHighScore();
    clearGameSession();
    
    // Show game over overlay
    showGameOver();
}

// Generate unique player ID
function generatePlayerId() {
    return `player_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// Get or create player ID
function getPlayerId() {
    if (playerId) return playerId;
    
    try {
        playerId = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
        if (!playerId) {
            playerId = generatePlayerId();
            localStorage.setItem(STORAGE_KEYS.PLAYER_ID, playerId);
        }
    } catch (error) {
        playerId = generatePlayerId();
    }
    
    return playerId;
}

// Handle click/tap
function handleClick(e) {
    if (!gameRunning) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let hit = false;
    
    // Check power-ups first
    for (let i = powerups.length - 1; i >= 0; i--) {
        const pu = powerups[i];
        if (pu.contains(x, y)) {
            pu.collect();
            hit = true;
            break;
        }
    }
    
    // Then check fireworks
    const fireworksToExplode = [];
    
    for (let i = fireworks.length - 1; i >= 0; i--) {
        const fw = fireworks[i];
        if (fw.contains(x, y)) {
            hit = true;
            
            if (fw.isBomb) {
                // Check if shield is active
                if (activeEffects.shield) {
                    // Shield protects from bomb
                    floatingTexts.push(new FloatingText(fw.x, fw.y, '🛡️ BLOCKED!', 'rgba(100, 150, 255, 1)'));
                    playSound('pop', 0.3);
                    fw.explode(true);
                } else {
                    // BOOM! Hit a bomb - lose a life
                    const penalty = 50 * combo;
                    score = Math.max(0, score - penalty);
                    combo = 1;
                    
                    // Effects for bomb hit
                    playSound('bomb', 0.6);
                    triggerScreenShake(20, 500);
                    triggerScreenFlash('rgba(255, 0, 0, 1)', 300);
                    
                    // Create warning floating text
                    floatingTexts.push(new FloatingText(fw.x, fw.y, `💀 -${penalty}!`, 'rgba(255, 50, 50, 1)'));
                    floatingTexts.push(new FloatingText(fw.x, fw.y - 30, 'BOOM!', 'rgba(255, 100, 0, 1)'));
                    
                    // Lose a life for hitting bomb
                    loseLife('Hit a bomb! 💣');
                    
                    // Explode the bomb
                    fw.explode(true);
                }
            } else {
                // Calculate points
                const basePoints = fw.isGolden ? 100 : 10;
                const points = basePoints * combo;
                score += points;
                
                // Play appropriate sound
                if (fw.isGolden) {
                    playSound('golden', 0.5);
                    triggerScreenFlash('rgba(255, 215, 0, 1)', 200);
                } else {
                    playSound('pop', 0.3);
                }
                
                // Create floating text
                const color = fw.isGolden ? 'rgba(255, 215, 0, 1)' : `hsla(${fw.hue}, 100%, 70%, 1)`;
                floatingTexts.push(new FloatingText(fw.x, fw.y, `+${points}`, color));
                
                if (combo > 1) {
                    floatingTexts.push(new FloatingText(fw.x, fw.y - 30, `COMBO x${combo}!`, 'rgba(255, 100, 100, 1)'));
                }
                
                // Increase combo
                const oldCombo = combo;
                combo = Math.min(combo + 1, 20);
                comboTimer = 2000; // Reset combo timer (2 seconds)
                
                // Play combo sound on milestones
                if (combo >= 5 && combo !== oldCombo && combo % 5 === 0) {
                    playSound('combo', 0.4);
                    triggerScreenShake(5, 100);
                }
                
                // Explode the firework
                fw.explode(true);
                
                // Multi-pop: chain explosion to nearby fireworks
                if (activeEffects.multiPop) {
                    const chainRadius = 150;
                    const chainRadiusSq = chainRadius * chainRadius;
                    for (let j = fireworks.length - 1; j >= 0; j--) {
                        if (j !== i && !fireworks[j].exploding && !fireworks[j].isBomb) {
                            const dx = fireworks[j].x - fw.x;
                            const dy = fireworks[j].y - fw.y;
                            const distSq = dx * dx + dy * dy;
                            if (distSq < chainRadiusSq) {
                                fireworksToExplode.push(j);
                            }
                        }
                    }
                }
            }
            
            updateUI();
            break; // Only pop one firework per click (multi-pop handles the rest)
        }
    }
    
    // Handle multi-pop chain explosions
    for (const idx of fireworksToExplode) {
        if (fireworks[idx] && !fireworks[idx].exploding) {
            const chainFw = fireworks[idx];
            const chainMultiplier = Math.max(1, Math.floor(combo / 2));
            const chainPoints = (chainFw.isGolden ? 100 : 10) * chainMultiplier;
            score += chainPoints;
            floatingTexts.push(new FloatingText(chainFw.x, chainFw.y, `+${chainPoints} CHAIN!`, 'rgba(255, 150, 0, 1)'));
            chainFw.explode(true);
        }
    }
    
    if (!hit) {
        // Create miss particles
        for (let i = 0; i < 5; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                radius: 2,
                hue: 0,
                life: 0.5,
                decay: 0.05,
                isMiss: true
            });
        }
    }
}

// Handle touch
function handleTouch(e) {
    e.preventDefault();
    for (const touch of e.touches) {
        handleClick({ clientX: touch.clientX, clientY: touch.clientY });
    }
}

// Draw background gradient
function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(0.5, '#1a1a4e');
    gradient.addColorStop(1, '#2a0a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Main game loop
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // Update screen effects
    updateScreenEffects(deltaTime);
    
    // Apply screen shake
    ctx.save();
    ctx.translate(screenShake.x, screenShake.y);
    
    // Clear and draw background
    drawBackground();
    
    // Always draw stars
    drawStars(deltaTime);
    
    if (gameRunning) {
        // Update active power-up effects
        updateActiveEffects(deltaTime);
        
        // Update combo timer
        if (comboTimer > 0) {
            comboTimer -= deltaTime;
            if (comboTimer <= 0) {
                combo = 1;
                updateUI();
            }
        }
        
        // Spawn fireworks (slower if time freeze active)
        const spawnMultiplier = activeEffects.timeFreeze ? 3 : 1;
        spawnTimer += deltaTime;
        if (spawnTimer >= spawnInterval * spawnMultiplier) {
            spawnFirework();
            spawnTimer = 0;
            
            // 8% chance to spawn a power-up with each firework
            if (Math.random() < 0.08) {
                spawnPowerUp();
            }
        }
        
        // Increase difficulty over time
        difficultyTimer += deltaTime;
        if (difficultyTimer >= 10000) { // Every 10 seconds
            spawnInterval = Math.max(400, spawnInterval - 100);
            difficultyTimer = 0;
        }
        
        // Save game session periodically (every 5 seconds)
        saveSessionTimer += deltaTime;
        if (saveSessionTimer >= 5000) {
            saveGameSession();
            saveSessionTimer = 0;
        }
        
        // Update fireworks (slower movement if time freeze)
        const speedMultiplier = activeEffects.timeFreeze ? 0.3 : 1;
        for (let i = fireworks.length - 1; i >= 0; i--) {
            fireworks[i].update(deltaTime * speedMultiplier);
            if (!fireworks[i].alive) {
                fireworks.splice(i, 1);
            }
        }
        
        // Update power-ups
        updatePowerUps(deltaTime);
        
        // Update particles
        updateParticles(deltaTime);
        
        // Update floating texts
        updateFloatingTexts(deltaTime);
        
        // Draw fireworks
        for (const fw of fireworks) {
            fw.draw();
        }
        
        // Draw power-ups
        drawPowerUps();
        
        // Draw particles
        drawParticles();
        
        // Draw floating texts
        drawFloatingTexts();
        
        // Draw active effects indicators
        drawActiveEffects();
        
        // Draw screen flash
        drawScreenFlash();
        
        // Draw time freeze overlay
        if (activeEffects.timeFreeze) {
            ctx.fillStyle = 'rgba(150, 200, 255, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    ctx.restore();
    
    requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-overlay').classList.add('hidden');
    gameRunning = true;
    score = 0;
    combo = 1;
    lives = MAX_LIVES;
    fireworks = [];
    particles = [];
    floatingTexts = [];
    powerups = [];
    spawnTimer = 0;
    difficultyTimer = 0;
    spawnInterval = 1500;
    gameStartTime = Date.now();
    saveSessionTimer = 0;
    
    // Reset active effects
    activeEffects = {
        shield: false,
        shieldTimer: 0,
        timeFreeze: false,
        timeFreezeTimer: 0,
        multiPop: false,
        multiPopTimer: 0
    };
    
    // Clear any saved session when starting fresh
    clearGameSession();
    
    updateUI();
    updateLivesDisplay();
    
    // Initialize audio context on first user interaction
    initAudioContext();
    
    // Resume audio context if suspended
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // Load sounds after audio context is ready
    initSounds();
    
    // Spawn initial fireworks
    for (let i = 0; i < 3; i++) {
        setTimeout(() => spawnFirework(), i * 500);
    }
}

// Show celebration
function showCelebration() {
    gameRunning = false;
    
    // Save high score and clear session
    saveHighScore();
    clearGameSession();
    
    document.getElementById('celebration-overlay').classList.remove('hidden');
    document.getElementById('final-score').textContent = `Final Score: ${score.toLocaleString()} 🏆`;
    
    // Show if it's a new high score
    if (score === highScore && score > 0) {
        document.getElementById('final-score').textContent += ' 🌟 NEW HIGH SCORE! 🌟';
    }
    
    // Reset score submission UI
    const submitSection = document.getElementById('score-submit-section');
    const submitBtn = document.getElementById('submit-score-btn');
    const submitStatus = document.getElementById('submit-status');
    const playerNameInput = document.getElementById('player-name-input');
    
    submitSection.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = '🏆 Submit Score';
    submitStatus.classList.add('hidden');
    
    // Load saved player name if available
    const savedName = localStorage.getItem(STORAGE_KEYS.PLAYER_NAME);
    if (savedName) {
        playerNameInput.value = savedName;
    }
    
    // Play celebration sound
    playSound('combo', 0.5);
    triggerScreenFlash('rgba(255, 215, 0, 1)', 500);
    
    // Massive celebration particles
    for (let i = 0; i < 200; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            radius: Math.random() * 4 + 2,
            hue: Math.random() * 360,
            life: 1,
            decay: 0.005,
            isGlitter: true,
            sparkle: Math.random() * Math.PI * 2
        });
    }
}

// Restart game
function restartGame() {
    document.getElementById('celebration-overlay').classList.add('hidden');
    startGame();
}

// Show game over screen
function showGameOver() {
    document.getElementById('game-over-overlay').classList.remove('hidden');
    document.getElementById('game-over-score').textContent = `Final Score: ${score.toLocaleString()}`;
    
    // Show if it's a new high score
    const isNewHighScore = score === highScore && score > 0;
    if (isNewHighScore) {
        document.getElementById('game-over-score').textContent += ' 🌟 NEW HIGH SCORE!';
    }
    
    // Update player name input with saved name
    const savedName = localStorage.getItem(STORAGE_KEYS.PLAYER_NAME);
    const nameInput = document.getElementById('game-over-player-name');
    if (savedName && nameInput) {
        nameInput.value = savedName;
    }
    
    // Reset submit UI
    const submitBtn = document.getElementById('game-over-submit-btn');
    const submitStatus = document.getElementById('game-over-submit-status');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '🏆 Submit Score';
    }
    if (submitStatus) {
        submitStatus.classList.add('hidden');
    }
    
    // Play death sound
    playSound('bomb', 0.5);
    triggerScreenShake(15, 400);
    triggerScreenFlash('rgba(255, 0, 0, 1)', 400);
}

// Handle game over score submission
async function handleGameOverSubmit() {
    const playerNameInput = document.getElementById('game-over-player-name');
    const submitBtn = document.getElementById('game-over-submit-btn');
    const submitStatus = document.getElementById('game-over-submit-status');
    
    const playerName = playerNameInput.value.trim();
    
    if (!playerName || playerName.length < 1 || playerName.length > 20) {
        submitStatus.textContent = 'Please enter a name (1-20 characters)';
        submitStatus.className = 'error';
        submitStatus.classList.remove('hidden');
        return;
    }
    
    // Save player name for next time
    localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, playerName);
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    submitStatus.classList.add('hidden');
    
    try {
        const result = await submitScoreWithPlayerId(playerName, score);
        
        submitStatus.textContent = result.message || 'Score submitted! 🎉';
        submitStatus.className = 'success';
        submitStatus.classList.remove('hidden');
        submitBtn.textContent = '✅ Submitted!';
        
    } catch (error) {
        submitStatus.textContent = error.message || 'Failed to submit. Try again.';
        submitStatus.className = 'error';
        submitStatus.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = '🏆 Submit Score';
    }
}

// Restart from game over
function restartFromGameOver() {
    document.getElementById('game-over-overlay').classList.add('hidden');
    startGame();
}

// ============================================
// LEADERBOARD FUNCTIONALITY
// ============================================

const LEADERBOARD_API = '/api/leaderboard';

// Fetch leaderboard from API
async function fetchLeaderboard() {
    try {
        const response = await fetch(LEADERBOARD_API);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        return data.leaderboard || [];
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return null;
    }
}

// Submit score to leaderboard
async function submitScore(playerName, playerScore) {
    try {
        const response = await fetch(LEADERBOARD_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerName: playerName,
                score: playerScore,
            }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit score');
        }
        
        return data;
    } catch (error) {
        console.error('Error submitting score:', error);
        throw error;
    }
}

// Submit score with player ID for tracking
async function submitScoreWithPlayerId(playerName, playerScore) {
    const currentPlayerId = getPlayerId();
    
    try {
        const response = await fetch(LEADERBOARD_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerName: playerName,
                score: playerScore,
                playerId: currentPlayerId
            }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit score');
        }
        
        return data;
    } catch (error) {
        console.error('Error submitting score:', error);
        throw error;
    }
}

// Display leaderboard in the panel
function displayLeaderboard(leaderboard) {
    const tableBody = document.getElementById('leaderboard-body');
    const table = document.getElementById('leaderboard-table');
    const loading = document.getElementById('leaderboard-loading');
    
    if (!leaderboard || leaderboard.length === 0) {
        loading.textContent = 'No scores yet. Be the first! 🚀';
        loading.classList.remove('hidden');
        table.classList.add('hidden');
        return;
    }
    
    tableBody.innerHTML = '';
    
    leaderboard.forEach((entry, index) => {
        const row = document.createElement('tr');
        const rank = index + 1;
        
        // Medal for top 3
        let rankDisplay = rank.toString();
        if (rank === 1) rankDisplay = '🥇 1';
        else if (rank === 2) rankDisplay = '🥈 2';
        else if (rank === 3) rankDisplay = '🥉 3';
        
        row.innerHTML = `
            <td>${rankDisplay}</td>
            <td>${escapeHtml(entry.playerName)}</td>
            <td>${entry.score.toLocaleString()}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    loading.classList.add('hidden');
    table.classList.remove('hidden');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Open leaderboard panel
async function openLeaderboard() {
    const panel = document.getElementById('leaderboard-panel');
    const loading = document.getElementById('leaderboard-loading');
    const table = document.getElementById('leaderboard-table');
    
    panel.classList.remove('hidden');
    loading.textContent = 'Loading...';
    loading.classList.remove('hidden');
    table.classList.add('hidden');
    
    const leaderboard = await fetchLeaderboard();
    
    if (leaderboard === null) {
        loading.textContent = 'Unable to load leaderboard. Please try again.';
    } else {
        displayLeaderboard(leaderboard);
    }
}

// Close leaderboard panel
function closeLeaderboard() {
    document.getElementById('leaderboard-panel').classList.add('hidden');
}

// Handle score submission
async function handleScoreSubmit() {
    const playerNameInput = document.getElementById('player-name-input');
    const submitBtn = document.getElementById('submit-score-btn');
    const submitStatus = document.getElementById('submit-status');
    
    const playerName = playerNameInput.value.trim();
    
    if (!playerName || playerName.length < 1 || playerName.length > 20) {
        submitStatus.textContent = 'Please enter a name (1-20 characters)';
        submitStatus.className = 'error';
        submitStatus.classList.remove('hidden');
        return;
    }
    
    // Save player name for next time
    localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, playerName);
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    submitStatus.classList.add('hidden');
    
    try {
        const result = await submitScore(playerName, score);
        
        submitStatus.textContent = result.message || 'Score submitted successfully! 🎉';
        submitStatus.className = 'success';
        submitStatus.classList.remove('hidden');
        submitBtn.textContent = '✅ Submitted!';
        
        // Hide the submit section after success
        setTimeout(() => {
            document.getElementById('score-submit-section').classList.add('hidden');
        }, 2000);
        
    } catch (error) {
        submitStatus.textContent = error.message || 'Failed to submit. Please try again.';
        submitStatus.className = 'error';
        submitStatus.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = '🏆 Submit Score';
    }
}

// ============================================
// END LEADERBOARD FUNCTIONALITY
// ============================================

// ============================================
// LOCAL STORAGE - SAVE/LOAD GAME STATE
// ============================================

// Load high score from local storage
function loadHighScore() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
        if (saved) {
            const parsed = parseInt(saved, 10);
            if (!isNaN(parsed) && parsed >= 0) {
                highScore = parsed;
                updateHighScoreDisplay();
            }
        }
    } catch (error) {
        console.log('⚠️ Could not load high score:', error);
    }
}

// Save high score to local storage
function saveHighScore() {
    try {
        if (score > highScore) {
            highScore = score;
            localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, highScore.toString());
            updateHighScoreDisplay();
        }
    } catch (error) {
        console.log('⚠️ Could not save high score:', error);
    }
}

// Update high score display in UI
function updateHighScoreDisplay() {
    const highScoreElement = document.getElementById('high-score');
    if (highScoreElement) {
        highScoreElement.textContent = highScore.toLocaleString();
    }
}

// Save game session for later resumption
function saveGameSession() {
    try {
        const session = {
            score: score,
            combo: combo,
            comboTimer: comboTimer,
            spawnInterval: spawnInterval,
            difficultyTimer: difficultyTimer,
            gameStartTime: gameStartTime,
            lives: lives,
            savedAt: Date.now()
        };
        localStorage.setItem(STORAGE_KEYS.SAVED_SESSION, JSON.stringify(session));
    } catch (error) {
        console.log('⚠️ Could not save game session:', error);
    }
}

// Load saved game session
function loadGameSession() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.SAVED_SESSION);
        if (saved) {
            const session = JSON.parse(saved);
            // Check if session is less than 24 hours old
            if (session && session.savedAt && (Date.now() - session.savedAt) < MAX_SESSION_AGE) {
                return session;
            } else {
                // Session expired, clear it
                clearGameSession();
            }
        }
    } catch (error) {
        console.log('⚠️ Could not load game session:', error);
    }
    return null;
}

// Clear saved game session
function clearGameSession() {
    try {
        localStorage.removeItem(STORAGE_KEYS.SAVED_SESSION);
    } catch (error) {
        console.log('⚠️ Could not clear game session:', error);
    }
}

// Check if there's a saved session and show continue button
function checkSavedSession() {
    const session = loadGameSession();
    const continueBtn = document.getElementById('continue-btn');
    const savedScoreDisplay = document.getElementById('saved-score-display');
    
    if (session && session.score > 0 && continueBtn && savedScoreDisplay) {
        continueBtn.classList.remove('hidden');
        savedScoreDisplay.textContent = `Continue with ${session.score.toLocaleString()} points`;
        savedScoreDisplay.classList.remove('hidden');
    } else if (continueBtn) {
        continueBtn.classList.add('hidden');
        if (savedScoreDisplay) savedScoreDisplay.classList.add('hidden');
    }
}

// Continue saved game
function continueGame() {
    const session = loadGameSession();
    if (!session) {
        startGame();
        return;
    }
    
    document.getElementById('start-screen').classList.add('hidden');
    gameRunning = true;
    
    // Restore session state
    score = session.score || 0;
    combo = session.combo || 1;
    comboTimer = session.comboTimer || 0;
    spawnInterval = session.spawnInterval || 1500;
    difficultyTimer = session.difficultyTimer || 0;
    gameStartTime = session.gameStartTime || Date.now();
    lives = session.lives || MAX_LIVES;
    
    // Reset runtime state
    fireworks = [];
    particles = [];
    floatingTexts = [];
    powerups = [];
    spawnTimer = 0;
    
    // Reset active effects
    activeEffects = {
        shield: false,
        shieldTimer: 0,
        timeFreeze: false,
        timeFreezeTimer: 0,
        multiPop: false,
        multiPopTimer: 0
    };
    
    updateUI();
    updateLivesDisplay();
    
    // Initialize audio context on first user interaction
    initAudioContext();
    
    // Resume audio context if suspended
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // Load sounds after audio context is ready
    initSounds();
    
    // Spawn initial fireworks
    for (let i = 0; i < 3; i++) {
        setTimeout(() => spawnFirework(), i * 500);
    }
    
    // Show welcome back floating text
    floatingTexts.push(new FloatingText(canvas.width / 2, canvas.height / 2, 'Welcome back! 🎉', 'rgba(255, 215, 0, 1)'));
}

// ============================================
// END LOCAL STORAGE FUNCTIONALITY
// ============================================

// Initialize
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Load saved high score
    loadHighScore();
    
    // Initialize player ID
    getPlayerId();
    
    // Check for saved session
    checkSavedSession();
    
    // Initial lives display
    updateLivesDisplay();
    
    // Event listeners
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    
    // Continue game listener
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
        continueBtn.addEventListener('click', continueGame);
    }
    
    // Game over event listeners
    const gameOverRestartBtn = document.getElementById('game-over-restart-btn');
    if (gameOverRestartBtn) {
        gameOverRestartBtn.addEventListener('click', restartFromGameOver);
    }
    
    const gameOverSubmitBtn = document.getElementById('game-over-submit-btn');
    if (gameOverSubmitBtn) {
        gameOverSubmitBtn.addEventListener('click', handleGameOverSubmit);
    }
    
    const gameOverNameInput = document.getElementById('game-over-player-name');
    if (gameOverNameInput) {
        gameOverNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleGameOverSubmit();
            }
        });
    }
    
    // Leaderboard event listeners
    document.getElementById('leaderboard-toggle-btn').addEventListener('click', openLeaderboard);
    document.getElementById('close-leaderboard-btn').addEventListener('click', closeLeaderboard);
    document.getElementById('submit-score-btn').addEventListener('click', handleScoreSubmit);
    
    // Allow pressing Enter to submit score
    document.getElementById('player-name-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleScoreSubmit();
        }
    });
    
    // Start countdown update
    updateCountdown();
    setInterval(updateCountdown, 1000);
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
