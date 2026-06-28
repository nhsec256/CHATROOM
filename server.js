const http = require('http');
const fs = require('fs');
const OscBase = require('./oscbase');

const db = new OscBase();
const PORT = 7000;

const server = http.createServer((req, res) => {
    // Manually handle Cross-Origin Resource Sharing (CORS) rules
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // Endpoint: POST /store
    if (req.method === 'POST' && req.url === '/store') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { key, value } = JSON.parse(body);
                if (!key || value === undefined) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, error: "Missing key or value context." }));
                }
                const result = db.set(key, value);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: "Malformed JSON string payload." }));
            }
        });
    } 
    // Endpoint: GET /papers-list
    else if (req.method === 'GET' && req.url === '/papers-list') {
        const papers = [];
        for (let [key, value] of db.memTable.entries()) {
            if (key.startsWith('paper_')) {
                const { file_url, ...metaOnly } = value;
                papers.push({ dbKey: key, ...metaOnly });
            }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, value: papers }));
    }
    // Endpoint: GET /retrieve/:key
    else if (req.method === 'GET' && req.url.startsWith('/retrieve/')) {
        const key = req.url.split('/retrieve/')[1];
        const result = db.get(key);
        if (!result.success) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(result));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
    } else {
        res.writeHead(404);
        res.end();
    }
});

// Remove any request limit caps since standard http streams automatically handle massive strings cleanly
server.maxHeadersCount = 1000;
server.headersTimeout = 60000;

server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🛰️  OscBase Pure Native Service Online on Port ${PORT}`);
    console.log(`🚀 Bypassed Express/CORS requirements successfully!`);
    console.log(`=======================================================`);
});