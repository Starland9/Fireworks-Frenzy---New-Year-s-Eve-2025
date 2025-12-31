// 🎆 FIREWORKS FRENZY - New Year's Eve 2025 Game 🎆

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameRunning = false;
let score = 0;
let combo = 1;
let comboTimer = 0;
let fireworks = [];
let particles = [];
let stars = [];
let floatingTexts = [];

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

// Handle click/tap
function handleClick(e) {
    if (!gameRunning) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let hit = false;
    
    for (let i = fireworks.length - 1; i >= 0; i--) {
        const fw = fireworks[i];
        if (fw.contains(x, y)) {
            hit = true;
            
            if (fw.isBomb) {
                // BOOM! Hit a bomb - lose points and combo
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
                
                // Explode the bomb
                fw.explode(true);
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
            }
            
            updateUI();
            break; // Only pop one firework per click
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
        // Update combo timer
        if (comboTimer > 0) {
            comboTimer -= deltaTime;
            if (comboTimer <= 0) {
                combo = 1;
                updateUI();
            }
        }
        
        // Spawn fireworks
        spawnTimer += deltaTime;
        if (spawnTimer >= spawnInterval) {
            spawnFirework();
            spawnTimer = 0;
        }
        
        // Increase difficulty over time
        difficultyTimer += deltaTime;
        if (difficultyTimer >= 10000) { // Every 10 seconds
            spawnInterval = Math.max(400, spawnInterval - 100);
            difficultyTimer = 0;
        }
        
        // Update fireworks
        for (let i = fireworks.length - 1; i >= 0; i--) {
            fireworks[i].update(deltaTime);
            if (!fireworks[i].alive) {
                fireworks.splice(i, 1);
            }
        }
        
        // Update particles
        updateParticles(deltaTime);
        
        // Update floating texts
        updateFloatingTexts(deltaTime);
        
        // Draw fireworks
        for (const fw of fireworks) {
            fw.draw();
        }
        
        // Draw particles
        drawParticles();
        
        // Draw floating texts
        drawFloatingTexts();
        
        // Draw screen flash
        drawScreenFlash();
    }
    
    ctx.restore();
    
    requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    gameRunning = true;
    score = 0;
    combo = 1;
    fireworks = [];
    particles = [];
    floatingTexts = [];
    spawnTimer = 0;
    difficultyTimer = 0;
    spawnInterval = 1500;
    gameStartTime = Date.now();
    updateUI();
    
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
    document.getElementById('celebration-overlay').classList.remove('hidden');
    document.getElementById('final-score').textContent = `Final Score: ${score.toLocaleString()} 🏆`;
    
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

// Initialize
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Event listeners
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    
    // Start countdown update
    updateCountdown();
    setInterval(updateCountdown, 1000);
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
