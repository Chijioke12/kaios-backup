const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3001;

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Explicitly serve index.html at the root
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, '../public/index.html');
    console.log(`Serving index from: ${indexPath}`);
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send(`index.html not found at ${indexPath}`);
    }
});

// Serve manifest
app.get('/manifest.webapp', (req, res) => {
    res.setHeader('Content-Type', 'application/x-web-app-manifest+json');
    res.sendFile(path.join(__dirname, '../manifest.webapp'));
});

// Static folders
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../src')));
app.use('/dist', express.static(path.join(__dirname, '../dist')));

// Fallback for everything else in public
app.use(express.static(path.join(__dirname, '../public')));

// Catch-all
app.use((req, res) => {
    res.status(404).send(`404: Cannot ${req.method} ${req.url}`);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
});
