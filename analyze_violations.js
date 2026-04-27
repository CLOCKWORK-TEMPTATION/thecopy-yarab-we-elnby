const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/quality/baselines/eslint.json', 'utf8'));
const web = data.web;
const categories = {};
Object.keys(web).forEach(key => {
    const parts = key.split('|');
    const file = parts[0];
    const rule = parts.slice(1).join('|');
    if (!categories[rule]) categories[rule] = { count: 0, files: [] };
    categories[rule].count += web[key];
    categories[rule].files.push({ file, count: web[key] });
});
console.log(JSON.stringify(categories, null, 2));