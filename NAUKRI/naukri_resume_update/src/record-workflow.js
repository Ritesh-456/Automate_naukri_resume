const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

const SESSION_FILE_PATH = path.join(__dirname, '../data/session.json');
const RECORDING_FILE_PATH = path.join(__dirname, '../logs/workflow_recording.json');

(async () => {
    console.log('Starting Recorder...');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
            '--start-maximized',
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    const actions = [];

    // Load session if exists
    if (fs.existsSync(SESSION_FILE_PATH)) {
        const sessionData = await fs.readJson(SESSION_FILE_PATH);
        if (sessionData.cookies) {
            await page.setCookie(...sessionData.cookies);
        }
    }

    // Function to generate a simple CSS selector
    const getSelector = `
    function getSelector(el) {
        if (!el) return '';
        if (el.id) return '#' + el.id;
        if (el.className) return '.' + el.className.split(' ').join('.');
        return el.tagName.toLowerCase();
    }
    `;

    // Inject recorder on every navigation
    await page.evaluateOnNewDocument(() => {
        window.recordedActions = [];

        function uniqueSelector(element) {
            if (element.id) return '#' + element.id;
            let path = [];
            while (element && element.nodeType === Node.ELEMENT_NODE) {
                let selector = element.nodeName.toLowerCase();
                if (element.className) {
                    selector += '.' + Array.from(element.classList).join('.');
                }
                path.unshift(selector);
                element = element.parentNode;
            }
            return path.join(' > ');
        }

        document.addEventListener('click', (e) => {
            const selector = uniqueSelector(e.target);
            const el = e.target;
            console.log('RECORD_ACTION:', JSON.stringify({
                type: 'click',
                selector: selector,
                // Capture more robust attributes
                attributes: {
                    id: el.id,
                    className: el.className,
                    name: el.getAttribute('name'),
                    href: el.getAttribute('href'),
                    type: el.getAttribute('type'),
                    ariaLabel: el.getAttribute('aria-label')
                },
                timestamp: Date.now(),
                innerText: el.innerText ? el.innerText.substring(0, 50) : ''
            }));
        }, true);

        document.addEventListener('change', (e) => {
            const selector = uniqueSelector(e.target);
            console.log('RECORD_ACTION:', JSON.stringify({
                type: 'change',
                selector: selector,
                value: e.target.value ? 'captured' : '', // Don't log sensitive values
                inputType: e.target.type,
                timestamp: Date.now()
            }));
        }, true);
    });

    // Listen to console logs from the page
    page.on('console', msg => {
        const text = msg.text();
        if (text.startsWith('RECORD_ACTION:')) {
            try {
                const action = JSON.parse(text.replace('RECORD_ACTION:', ''));
                console.log('Action recorded:', action.type, action.selector);
                actions.push(action);
                // Save incrementally
                fs.writeJsonSync(RECORDING_FILE_PATH, actions, { spaces: 2 });
            } catch (e) { }
        }
    });

    console.log('Browser open. Please perform the Resume Update process manually.');
    console.log('I am recording your clicks and file uploads...');
    console.log('Close the browser when you are done.');

    // Go to Homepage and let user navigate
    await page.goto('https://www.naukri.com', { waitUntil: 'networkidle2' });

    // Keep script running until browser is closed
    browser.on('disconnected', () => {
        console.log('Browser closed. Recording saved to logs/workflow_recording.json');
        process.exit(0);
    });
})();
