document.querySelector('#root').innerHTML = `
  <div style="font-family: sans-serif; padding: 20px; background: #000; color: #fff; min-height: 100vh;">
    <h1>KaiOS Game Launcher</h1>
    <p>Select a game to play:</p>
    <ul>
      <li><a href="/games/chromajump/index.html" style="color: #0ff;">Chroma Jump</a></li>
      <li><a href="/games/neon-core-defender/index.html" style="color: #0ff;">Neon Core Defender</a></li>
      <li><a href="/games/neon-echo-jumper/index.html" style="color: #0ff;">Neon Echo Jumper</a></li>
      <li><a href="/games/neon-quantum-shift/index.html" style="color: #0ff;">Neon Quantum Shift</a></li>
      <li><a href="/games/neonoverdrive/index.html" style="color: #0ff;">Neon Overdrive</a></li>
      <li><a href="/games/pulsejumper/index.html" style="color: #0ff;">Pulse Jumper</a></li>
    </ul>
    <style>
      a { text-decoration: none; font-size: 1.2rem; display: block; padding: 10px; border: 1px solid #333; margin-bottom: 5px; border-radius: 4px; }
      a:hover { background: #222; }
      ul { list-style: none; padding: 0; }
    </style>
  </div>
`;
