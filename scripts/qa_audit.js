
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/lib/countries/top100.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Regex to extract objects { code: 'XX', ... }
const matches = content.match(/\{ code: '([A-Z]{2})'/g);

if (!matches) {
    console.error('FAIL: No country entries found.');
    process.exit(1);
}

const codes = matches.map(m => m.match(/'([A-Z]{2})'/)[1]);
const total = codes.length;
const unique = new Set(codes).size;

console.log('--- QA AUDIT: TOP 100 (Node.js) ---');
console.log(`Total Count: ${total}`);
console.log(`Unique Count: ${unique}`);

if (total !== 100) {
    console.error(`FAIL: Expected 100, got ${total}`);
}
if (unique !== 100) {
    console.error(`FAIL: Expected 100 unique, got ${unique}`);
}

if (total === 100 && unique === 100) {
    console.log('PASS: Exact Match 100 Unique Countries');
}
