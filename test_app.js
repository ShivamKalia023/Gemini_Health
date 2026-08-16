const fs = require('fs');
const { JSDOM } = require('jsdom');
const jsdom = new JSDOM('<!DOCTYPE html><html><body><div id=""challenges-preview-list""></div><div id=""global-feed-list""></div></body></html>');
global.window = jsdom.window;
global.document = jsdom.window.document;
global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
const code = fs.readFileSync('src/main/resources/static/js/app.js', 'utf8');
try {
    eval(code);
    console.log('Script parsed and evaluated.');
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    console.log('DOMContentLoaded dispatched.');
} catch (e) {
    console.error('ERROR:', e);
}
