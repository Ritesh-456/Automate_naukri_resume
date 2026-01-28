const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const SESSION_FILE_PATH = path.join(__dirname, '../data/session.json');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
            '--start-maximized',
            '--disable-blink-features=AutomationControlled', // Extract "stealth" mode
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        ignoreDefaultArgs: ['--enable-automation'] // Hide "Chrome is being controlled by automated test software" bar
    });

    const page = await browser.newPage();

    console.log('Navigating to Naukri.com login page...');
    await page.goto('https://www.naukri.com/nlogin/login', { waitUntil: 'networkidle2' });

    console.log('Please log in manually in the browser window.');
    console.log('Waiting for you to reach the dashboard (checking for "My Naukri" or profile image)...');

    // Wait for a selector that indicates successful login. 
    // Usually, the profile image or url change indicates success.
    // We will wait for URL to contain "mnj" or user to be redirected to homepage with session.
    try {
        await page.waitForFunction(
            () => window.location.href.includes('naukri.com/mnj') || document.querySelector('.nI-gNb-drawer__icon-img'),
            { timeout: 300000 } // 5 minutes timeout for manual login
        );
        console.log('Login detected!');
    } catch (e) {
        console.error('Timeout waiting for login. Please try again.');
        await browser.close();
        process.exit(1);
    }

    // Capture cookies
    const cookies = await page.cookies();

    // Capture localStorage (optional but good for some frameworks)
    const localStorageData = await page.evaluate(() => {
        let json = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            json[key] = localStorage.getItem(key);
        }
        return json;
    });

    const sessionData = {
        cookies,
        localStorage: localStorageData,
        timestamp: new Date().toISOString()
    };

    console.log('Saving session to data/session.json...');
    await fs.ensureDir(path.dirname(SESSION_FILE_PATH));
    await fs.writeJson(SESSION_FILE_PATH, sessionData, { spaces: 2 });

    console.log('Session saved successfully!');
    console.log('Closing browser...');
    await browser.close();
})();
