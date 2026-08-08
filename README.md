# EcoPulse - The Last 60 Seconds

A dependency-free 2D Canvas game prototype designed for a competition demo.

## Run locally

Requires Node.js 18 or newer.

```powershell
npm run dev
```

Open http://localhost:5173 and press **Begin field trial**. Move with WASD or the arrow keys.

## Structure

- `index.html` - game shell and accessible UI
- `src/styles.css` - visual system and responsive layout
- `src/main.js` - game loop, input, player movement, and rendering
- `server.mjs` - tiny local static server