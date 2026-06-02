# Naija Whot Card Game

A classic African card game built with HTML5 Canvas API, Vite, and JavaScript.

## Features
- Full game logic for Naija Whot (54 cards).
- All special actions implemented:
    - **1 (Hold On)**: Current player plays again.
    - **2 (Pick Two)**: Next player draws 2 or defends with another 2.
    - **5 (Pick Three)**: Next player draws 3 or defends with another 5.
    - **8 (Suspension)**: Next player is skipped.
    - **14 (General Market)**: All other players draw 1 card.
    - **20 (Whot)**: Wild card, caller names next suit.
- CPU opponent with basic AI.
- Animations and sound effects.
- Visual suit selection for human players.

## How to Play
- **Draw**: Click on the Market Deck (left side) if you don't have a valid move.
- **Play**: Click on a valid card in your hand (highlighted in green).
- **Goal**: Be the first to empty your hand!

## Setup and Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```

## KaiOS Build (Packaged Web App)
This project can be bundled for KaiOS (keypad-friendly, non-module bundle) with:
```bash
npm run build:kaios
```
Output is written to `dist-kaios/` and includes `manifest.webapp` for KaiOS 2.x-style packaged apps.

### Key Controls (KaiOS)
- Arrow keys: navigate cards/menus
- OK (Enter): select / play / draw
- Left softkey: open menu (in-game)
- Back/Right softkey: back

Tip: to preview the softkey labels on desktop, open the game with `?softkeys=1`.
