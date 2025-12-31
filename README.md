# 🎆 Fireworks Frenzy - New Year's Eve 2025 🎆

A super fun 2D web game to celebrate the end of 2025! Pop fireworks, build combos, and welcome 2026 with a bang!

## 🎮 How to Play

1. Open `index.html` in your web browser
2. Click "START THE PARTY!" to begin
3. **Click or tap** on the rising fireworks before they explode on their own
4. Chain quick pops to build **COMBO multipliers** (up to x20!)
5. **Golden fireworks** are worth 10x more points!
6. **💀 AVOID the bombs!** They cost you points and reset your combo!
7. Keep playing and try to beat your high score!
8. **Submit your score** to the global leaderboard and compete with players worldwide!

## ✨ Features

- 🎯 **Addictive Gameplay**: Click to pop fireworks and score points
- 🔥 **Combo System**: Chain pops for massive multipliers
- 💎 **Golden Fireworks**: Rare fireworks worth 10x points
- 💀 **Bombs**: Dark fireworks with skulls - don't tap them!
- ⏰ **Real Countdown**: Live countdown to 2026!
- 🎨 **Beautiful Particles**: Stunning explosion effects
- 💥 **Screen Effects**: Screen shake and flash effects for feedback
- 🔊 **Sound Effects**: Pop, explosion, and combo sounds
- 📱 **Mobile Friendly**: Works on touch devices
- 🌟 **Progressive Difficulty**: Game gets faster over time
- 🏆 **Global Leaderboard**: Compete with players worldwide using Vercel Edge Config!

## 🏆 Global Leaderboard

The game features a global leaderboard powered by **Vercel Edge Config** that allows players from around the world to compete for the highest scores!

### Features:
- 🌍 Real-time global rankings
- 🥇🥈🥉 Medals for top 3 players
- 📱 Works on all devices
- ⚡ Ultra-fast global reads with Edge Config
- 💾 Player name saved locally for convenience

### How to Set Up the Leaderboard (for developers):

1. **Create an Edge Config in Vercel Dashboard**:
   - Go to your Vercel Dashboard → Storage → Create → Edge Config
   - Note the Edge Config ID

2. **Connect to your project**:
   - Go to your project settings → Environment Variables
   - Add the following environment variables:
     - `EDGE_CONFIG` - The connection string (automatically set when you connect Edge Config to your project)
     - `EDGE_CONFIG_ID` - Your Edge Config ID (found in the Edge Config dashboard)
     - `VERCEL_API_TOKEN` - A Vercel API token (create at vercel.com/account/tokens)

3. **Deploy to Vercel**:
   - The leaderboard API is located at `/api/leaderboard`
   - It handles both GET (fetch leaderboard) and POST (submit score) requests

### API Endpoints:

- `GET /api/leaderboard` - Fetch the global leaderboard (top 100 scores)
- `POST /api/leaderboard` - Submit a new score
  ```json
  {
    "playerName": "Your Name",
    "score": 12345
  }
  ```

## 🎵 Adding Custom Audio Files

The game includes synthesized sounds by default, but you can add custom audio files for a better experience!

### How to add audio files:

1. Create a `sounds` folder in the same directory as `index.html`
2. Add the following MP3 files:

```
sounds/
├── pop.mp3        # Sound when popping a normal firework
├── explosion.mp3  # Explosion sound effect
├── combo.mp3      # Sound for combo milestones (x5, x10, x15, x20)
├── bomb.mp3       # Sound when hitting a bomb (error sound)
├── golden.mp3     # Sound when popping a golden firework
└── music.mp3      # Background music (optional)
```

### Recommended audio:
- **pop.mp3**: Short, satisfying pop sound (0.1-0.2 seconds)
- **explosion.mp3**: Firework explosion sound (0.3-0.5 seconds)
- **combo.mp3**: Upward chime or celebration sound (0.2-0.3 seconds)
- **bomb.mp3**: Error/alarm sound or explosion (0.3-0.5 seconds)
- **golden.mp3**: Magical/sparkle sound (0.2-0.3 seconds)

### Where to find free sounds:
- [Freesound.org](https://freesound.org) - Free sound effects
- [Pixabay](https://pixabay.com/sound-effects/) - Free sound effects
- [Mixkit](https://mixkit.co/free-sound-effects/) - Free sound effects

> **Note**: If audio files are not found, the game automatically uses synthesized sounds as fallback.

## 🚀 Quick Start

Simply open `index.html` in any modern web browser - no installation required!

```bash
# Or serve with a local server
npx serve .
# or
python -m http.server 8000
```

## 🎉 Happy New Year 2026!

Made with ❤️ to celebrate the end of 2025
