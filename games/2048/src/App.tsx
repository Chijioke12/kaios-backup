/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'preact/hooks';

type Tile = {
  id: number;
  value: number;
  row: number;
  col: number;
  isNew?: boolean;
  isMerged?: boolean;
};

let nextTileId = 1;

export default function App() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const initGame = () => {
    let freshTiles = addRandomTile([]);
    freshTiles = addRandomTile(freshTiles);
    setTiles(freshTiles);
    setScore(0);
    setGameOver(false);
    setGameWon(false);
  };

  useEffect(() => {
    initGame();
    const savedBest = localStorage.getItem('2048-best');
    if (savedBest) {
      setBestScore(parseInt(savedBest, 10));
    }
  }, []);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('2048-best', score.toString());
    }
  }, [score, bestScore]);

  const addRandomTile = (currentTiles: Tile[]): Tile[] => {
    const emptyCells = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!currentTiles.some(t => t.row === r && t.col === c)) {
          emptyCells.push({ r, c });
        }
      }
    }
    if (emptyCells.length === 0) return currentTiles;
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    return [...currentTiles, { id: nextTileId++, value, row: randomCell.r, col: randomCell.c, isNew: true }];
  };

  const moveTiles = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (gameOver || gameWon) return;

    const directionDeltas = {
      UP: { dr: -1, dc: 0, rStarts: [0, 1, 2, 3], cStarts: [0, 1, 2, 3] },
      DOWN: { dr: 1, dc: 0, rStarts: [3, 2, 1, 0], cStarts: [0, 1, 2, 3] },
      LEFT: { dr: 0, dc: -1, rStarts: [0, 1, 2, 3], cStarts: [0, 1, 2, 3] },
      RIGHT: { dr: 0, dc: 1, rStarts: [0, 1, 2, 3], cStarts: [3, 2, 1, 0] },
    };

    const { dr, dc, rStarts, cStarts } = directionDeltas[direction];
    
    const currentTiles = tiles.map(t => ({ ...t, isNew: false, isMerged: false }));
    const newTiles: Tile[] = [];
    let moved = false;
    let newScore = score;
    const mergedThisTurn = new Set<string>();

    const getTileAt = (r: number, c: number) => currentTiles.find(t => t.row === r && t.col === c);
    const getNewTileAt = (r: number, c: number) => newTiles.find(t => t.row === r && t.col === c);

    for (const c of cStarts) {
      for (const r of rStarts) {
        const tile = getTileAt(r, c);
        if (!tile) continue;

        let targetR = r;
        let targetC = c;

        while (true) {
          const nextR = targetR + dr;
          const nextC = targetC + dc;

          if (nextR < 0 || nextR > 3 || nextC < 0 || nextC > 3) break;

          const nextTileInNew = getNewTileAt(nextR, nextC);
          if (nextTileInNew) {
             if (nextTileInNew.value === tile.value && !mergedThisTurn.has(`${nextR},${nextC}`)) {
               targetR = nextR;
               targetC = nextC;
             }
             break;
          }
          targetR = nextR;
          targetC = nextC;
        }

        if (targetR !== r || targetC !== c) moved = true;

        const mergeTarget = getNewTileAt(targetR, targetC);
        if (mergeTarget) {
          mergeTarget.value *= 2;
          mergeTarget.isMerged = true;
          newScore += mergeTarget.value;
          mergedThisTurn.add(`${targetR},${targetC}`);
        } else {
          newTiles.push({ ...tile, row: targetR, col: targetC });
        }
      }
    }

    if (moved) {
      const updatedTiles = addRandomTile(newTiles);
      setTiles(updatedTiles);
      setScore(newScore);

      if (updatedTiles.some(t => t.value === 2048)) {
        // Option: allow continuing after 2048 by an explicit continue action, but for a simple game just set gameWon
        setGameWon(true);
      } else if (!canMove(updatedTiles)) {
        setGameOver(true);
      }
    }
  };

  const canMove = (currentTiles: Tile[]) => {
    if (currentTiles.length < 16) return true;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const tile = currentTiles.find(t => t.row === r && t.col === c);
        if (!tile) continue;
        const neighbors = [
          currentTiles.find(t => t.row === r + 1 && t.col === c),
          currentTiles.find(t => t.row === r - 1 && t.col === c),
          currentTiles.find(t => t.row === r && t.col === c + 1),
          currentTiles.find(t => t.row === r && t.col === c - 1),
        ];
        if (neighbors.some(n => n && n.value === tile.value)) return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for game keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp': moveTiles('UP'); break;
        case 'ArrowDown': moveTiles('DOWN'); break;
        case 'ArrowLeft': moveTiles('LEFT'); break;
        case 'ArrowRight': moveTiles('RIGHT'); break;
        case 'Enter': 
          if (gameOver || gameWon) initGame();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tiles, score, gameOver, gameWon, bestScore]); // need to include bestScore because moveTiles accesses it, wait - actually just the values used

  const handleTouchStart = (e: TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    if (Math.max(absDx, absDy) > 20) {
      if (absDx > absDy) {
        moveTiles(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        moveTiles(dy > 0 ? 'DOWN' : 'UP');
      }
    }
    touchStartRef.current = null;
  };

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="app-wrapper">
      <div className="header">
        <h1 className="title">2048</h1>
        <div className="scores-container">
          <div className="score-box">
            <div className="score-title">SCORE</div>
            <div className="score-value">{score}</div>
          </div>
          <div className="score-box">
            <div className="score-title">BEST</div>
            <div className="score-value">{bestScore}</div>
          </div>
        </div>
      </div>

      <div className="game-container">
        <div className="grid">
          {Array.from({ length: 16 }).map((_, i) => (
            <div className="grid-cell" key={i}></div>
          ))}
        </div>
        <div className="tile-container">
          {tiles.map(tile => {
            const left = `calc(${tile.col * 25}% + ${tile.col * 1.25}px)`;
            const top = `calc(${tile.row * 25}% + ${tile.row * 1.25}px)`;
            return (
              <div 
                key={tile.id} 
                className={`tile tile-${tile.value} ${tile.isNew ? 'tile-new' : ''} ${tile.isMerged ? 'tile-merged' : ''}`}
                style={{ top, left }}
              >
                {tile.value}
              </div>
            );
          })}
        </div>
        
        {(gameOver || gameWon) && (
          <div className="game-message">
            <p>{gameWon ? 'You win!' : 'Game over!'}</p>
            <button onClick={initGame}>Try again</button>
            <div className="hint-text">Press ENTER</div>
          </div>
        )}
      </div>
    </div>
  );
}
