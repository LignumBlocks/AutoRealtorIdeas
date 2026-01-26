
const { TOP100_COUNTRIES } = require('../src/lib/countries/top100');

console.log('--- QA AUDIT: TOP 100 ---');
console.log(`Current Length: ${TOP100_COUNTRIES.length}`);
console.log(`Unique Codes: ${new Set(TOP100_COUNTRIES.map((c: any) => c.code)).size}`);

if (TOP100_COUNTRIES.length !== 100) {
    console.error('FAIL: Length is not 100');
} else {
    console.log('PASS: Length is exactly 100');
}
