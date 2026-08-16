const fs = require('fs');
const { JSDOM } = require('jsdom');
const jsdom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = jsdom.window;
global.document = jsdom.window.document;
global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
const code = fs.readFileSync('src/main/resources/static/js/app.js', 'utf8');
try {
    eval(code);
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    console.log('SUCCESS');
} catch (e) {
    console.error('ERROR:', e);
}
