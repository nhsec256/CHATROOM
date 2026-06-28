const http = require('http');
const fs = require('fs');
const path = require('path');
const OscBase = require('./oscbase');

const db = new OscBase();
const PORT = process.env.PORT || 7000;

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-File-Name, X-Collection-Key');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // Endpoint: POST /upload (Streams raw file data cleanly onto the server disk)
    if (req.method === 'POST' && req.url === '/upload') {
        const fileName = req.headers['x-file-name'] || `file_${Date.now()}.pdf`;
        const collectionKey = req.headers['x-collection-key'] || 'unassigned';

        const safeFileName = `${Date.now()}_${path.basename(fileName)}`;
        const targetPath = path.join(process.cwd(), 'database_store', 'uploads', safeFileName);
        const writeStream = fs.createWriteStream(targetPath);

        req.pipe(writeStream);

        req.on('end', () => {
            // Serve file statically relative link back to the browser
            const hostedUrl = `/database_store/uploads/${safeFileName}`;
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, fileUrl: hostedUrl }));
        });

        req.on('error', (err) => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        });
    }

    // Endpoint: POST /store (Saves standard text objects/metadata)
    else if (req.method === 'POST' && req.url === '/store') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { collection, key, value } = JSON.parse(body);
                const result = db.set(collection, key, value);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: "Invalid JSON metadata form structures." }));
            }
        });
    }

    // Endpoint: GET /retrieve
    else if (req.method === 'GET' && req.url.startsWith('/retrieve/')) {
        const parts = req.url.split('/retrieve/')[1].split('/');
        const collection = parts[0];
        const key = parts[1];

        const result = db.get(collection, key);
        res.writeHead(result.success ? 200 : 404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
    }
    
    // Serve uploaded files statically back to browsers automatically
    else if (req.method === 'GET' && req.url.startsWith('/database_store/uploads/')) {
        const filePath = path.join(process.cwd(), req.url);
        if (fs.existsSync(filePath)) {
            res.writeHead(200, { 'Content-Type': 'application/pdf' }); // Optimized to load PDFs instantly
            return fs.createReadStream(filePath).pipe(res);
        }
        res.writeHead(404);
        res.end();
    }

    else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`🛰️ OscBase Disk-Linked Portal Engine running on Port ${PORT}`);
});