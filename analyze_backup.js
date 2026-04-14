const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:\\Users\\x67\\.gemini\\antigravity\\Scratch\\Alrashad-project\\AlRashad_Backup_2026-04-14.json', 'utf8'));

console.log('Keys in backup:');
for (const key in data) {
    console.log(`- ${key}: ${Array.isArray(data[key]) ? data[key].length + ' items' : typeof data[key]}`);
    if (Array.isArray(data[key]) && data[key].length > 0) {
        console.log(`  Sample object keys for ${key}:`);
        console.log('  ' + Object.keys(data[key][0]).join(', '));
    }
}
