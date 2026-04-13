const os = require('os');
const networkInterfaces = os.networkInterfaces();

console.log('--- LOCAL NETWORK IP DETECTION ---');
Object.keys(networkInterfaces).forEach((iface) => {
  networkInterfaces[iface].forEach((details) => {
    if (details.family === 'IPv4' && !details.internal) {
      console.log(`Interface: ${iface}`);
      console.log(`IP Address: ${details.address}`);
      console.log(`HTTPS Link: https://${details.address}:3000`);
      console.log('-----------------------------------');
    }
  });
});

console.log('\nUse the "HTTPS Link" above on your iOS device Safari browser.');
console.log('Note: You will need to bypass the security warning by clicking "Advanced" -> "Proceed".');
