const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>NETWORK TEST SUCCESSFUL</h1><p>Your phone can see your computer. The issue is with the main server or Port 3000.</p>');
});

server.listen(8080, '0.0.0.0', () => {
  console.log('Diagnostic server running at http://0.0.0.0:8080');
});
