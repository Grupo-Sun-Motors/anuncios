const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5501;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'application/font-woff',
  '.woff2': 'application/font-woff2',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - File Not Found</h1>');
      return;
    }

    res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
    res.end(data);
  });
}

function isStaticFile(url) {
  // Check if URL has a file extension
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(url) && !url.endsWith('/');
  
  // Check for common static file directories
  const isStaticPath = url.startsWith('/css/') || 
                      url.startsWith('/js/') || 
                      url.startsWith('/images/') || 
                      url.startsWith('/assets/') ||
                      url.startsWith('/components/') ||
                      url.startsWith('/services-apis/');
  
  return hasExtension || isStaticPath;
}

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0]; // Remove query string
  
  // Handle root
  if (url === '/') {
    url = '/index.html';
  }
  
  // Check if it's a static file request
  if (isStaticFile(url)) {
    const filePath = path.join(ROOT_DIR, url);
    serveFile(filePath, res);
  } else {
    // It's a SPA route, serve index.html
    const indexPath = path.join(ROOT_DIR, 'index.html');
    serveFile(indexPath, res);
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}/`);
  console.log('SPA routing enabled - all routes will serve index.html');
});

