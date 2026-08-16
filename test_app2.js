const fs = require('fs');
const code = fs.readFileSync('src/main/resources/static/js/app.js', 'utf8');
try {
    eval(code);
    console.log('Script parsed and evaluated.');
} catch (e) {
    console.error('ERROR:', e);
}
