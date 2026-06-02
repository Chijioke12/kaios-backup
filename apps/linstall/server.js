const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve the app entry point at the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'bundled_install.html'));
});

// Also serve the packaged app files
app.get('/download', (req, res) => {
    res.download(path.join(__dirname, 'linstall-omnisd.zip'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`To download the app: http://localhost:${port}/download`);
});
