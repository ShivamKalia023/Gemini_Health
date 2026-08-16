const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('src/main/resources/static/home.html', 'utf8');
const js = fs.readFileSync('src/main/resources/static/js/app.js', 'utf8');

const jsdom = new JSDOM(html, { runScripts: 'dangerously' });
global.window = jsdom.window;
global.document = jsdom.window.document;
global.fetch = () => Promise.resolve({ ok: false, json: () => Promise.resolve([]) });

// We need to inject app.js into the jsdom window
const scriptEl = jsdom.window.document.createElement('script');
scriptEl.textContent = js;
jsdom.window.document.body.appendChild(scriptEl);

// Dispatch DOMContentLoaded
jsdom.window.document.dispatchEvent(new jsdom.window.Event('DOMContentLoaded'));

setTimeout(() => {
    console.log("Global Feed HTML:", jsdom.window.document.getElementById('global-feed-list').innerHTML);
    console.log("Champs Container HTML:", jsdom.window.document.getElementById('champs-cards-container').innerHTML);
}, 500);
