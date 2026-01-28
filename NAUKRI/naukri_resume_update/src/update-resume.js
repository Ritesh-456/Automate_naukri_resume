const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const SESSION_FILE_PATH = path.join(__dirname, '../data/session.json');
const LOG_FILE_PATH = path.join(__dirname, '../logs/resume_activity.log');
const RESUME_DIR = path.join(__dirname, '../resume');

async function getAndRenameResume() {
    // 1. Ensure directory exists
    await fs.ensureDir(RESUME_DIR);

    // 2. Find any PDF file
    const files = await fs.readdir(RESUME_DIR);
    const pdfFile = files.find(f => f.toLowerCase().endsWith('.pdf'));

    if (!pdfFile) {
        throw new Error(`No PDF file found in ${RESUME_DIR}`);
    }

    // 3. Generate filename: Ritesh_resume_DD_mon_YYYY_and_HH_MM_AMPM.pdf
    const date = new Date();

    const pad = (num) => num.toString().padStart(2, '0');

    const day = pad(date.getDate());
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    const minutes = pad(date.getMinutes());

    // Format: Ritesh_resume_28_jan_2026_and_11_16_PM.pdf
    const newFileName = `Ritesh_resume_${day}_${month}_${year}_and_${pad(hours)}_${minutes}_${ampm}.pdf`;

    const oldPath = path.join(RESUME_DIR, pdfFile);
    const newPath = path.join(RESUME_DIR, newFileName);

    // 4. Rename if needed
    if (oldPath !== newPath) {
        await log(`Renaming resume from ${pdfFile} to ${newFileName}`);
        await fs.rename(oldPath, newPath);
    } else {
        await log(`Resume already has today's name: ${newFileName}`);
    }

    return newPath;
}


const log = async (message) => {
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    await fs.appendFile(LOG_FILE_PATH, logMessage);
};

async function loginUser(page) {
    const email = process.env.NAUKRI_EMAIL;
    const password = process.env.NAUKRI_PASSWORD;

    if (!email || !password || email === 'your_email@example.com') {
        await log('ERROR: Session expired and no valid credentials in .env file. Cannot auto-login.');
        return false;
    }

    await log('Session expired. Attempting standard Email/Password auto-login...');

    try {
        if (!page.url().includes('login')) {
            await page.goto('https://www.naukri.com/nlogin/login', { waitUntil: 'networkidle2' });
        }

        // Wait for standard Naukri login inputs
        // These selectors are for the standard email/pass form
        // Note: Sometimes Naukri changes IDs (like usernameField, passwordField)

        await log('Waiting for email input...');
        const emailSelectors = ['input#usernameField', 'input[placeholder*="Email"]', 'input[type="text"]'];
        let emailInput;
        for (const sel of emailSelectors) {
            try {
                emailInput = await page.waitForSelector(sel, { timeout: 3000, visible: true });
                if (emailInput) break;
            } catch (e) { }
        }

        if (!emailInput) throw new Error('Could not find Email input field');
        await emailInput.type(email, { delay: 50 });

        await log('Waiting for password input...');
        const passwordSelectors = ['input#passwordField', 'input[type="password"]'];
        let passwordInput;
        for (const sel of passwordSelectors) {
            try {
                passwordInput = await page.waitForSelector(sel, { timeout: 3000, visible: true });
                if (passwordInput) break;
            } catch (e) { }
        }

        if (!passwordInput) throw new Error('Could not find Password input field');
        await passwordInput.type(password, { delay: 50 });

        // Click Login
        await log('Clicking login button...');
        const loginBtnSelectors = ['button[type="submit"]', 'button.blue-btn', 'button.waves-effect'];
        let loginBtn;
        for (const sel of loginBtnSelectors) {
            try {
                loginBtn = await page.waitForSelector(sel, { timeout: 3000, visible: true });
                if (loginBtn) break;
            } catch (e) { }
        }

        if (loginBtn) {
            await loginBtn.click();
        } else {
            // Fallback: Press Enter
            await page.keyboard.press('Enter');
        }

        await log('Credentials submitted. Waiting for dashboard...');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

        if (page.url().includes('login')) {
            await log('Still on login page. Login might have failed (wrong password? captcha?).');
            return false;
        }

        // Save new session
        const cookies = await page.cookies();
        const localStorageData = await page.evaluate(() => {
            return JSON.stringify(localStorage);
        });

        await fs.outputJson(SESSION_FILE_PATH, { cookies, localStorage: JSON.parse(localStorageData) });
        await log('New session saved successfully via Standard Login.');
        return true;

    } catch (e) {
        await log(`Auto-login failed: ${e.message}`);
        return false;
    }
}

(async () => {
    await log('Starting resume update process (Ver. 2 - Recorded Flow)...');

    if (!fs.existsSync(SESSION_FILE_PATH)) {
        await log('ERROR: Session file not found. Please run login-setup.js first.');
        process.exit(1);
    }

    let resumeFilePath;
    try {
        resumeFilePath = await getAndRenameResume();
    } catch (err) {
        await log(`ERROR: ${err.message}`);
        process.exit(1);
    }

    if (!fs.existsSync(resumeFilePath)) {
        await log(`ERROR: Resume file not found at ${resumeFilePath}`);
        process.exit(1);
    }


    let browser;
    try {
        const sessionData = await fs.readJson(SESSION_FILE_PATH);

        browser = await puppeteer.launch({
            headless: false, // Switch to Headed mode to avoid session rejection
            defaultViewport: null,
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ],
            ignoreDefaultArgs: ['--enable-automation']
        });

        const page = await browser.newPage();

        // --- OPTIMIZATION: Request Interception Removed for Reliability ---
        // Blocking resources caused instability. Loading full page now.



        // 1. Set Cookies
        if (sessionData.cookies && sessionData.cookies.length > 0) {
            await page.setCookie(...sessionData.cookies);
        } else {
            // Check if we lost cookies?
            await log('WARNING: No cookies found in session file?');
        }

        // 2. Navigate to Homepage
        await log('Navigating to Naukri Homepage...');
        await page.goto('https://www.naukri.com', { waitUntil: 'networkidle2' });

        // 3. Click "View Profile"
        await log('Looking for "View profile" link...');
        // Selector strategy: href containing '/mnj/user/profile' or text "View profile"
        try {
            const profileLink = await page.waitForSelector('a[href*="/mnj/user/profile"], .view-profile-wrapper a', { timeout: 10000 });
            await profileLink.click();
            await log('Clicked "View profile". Waiting for navigation...');
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
        } catch (e) {
            await log('Could not find "View profile" link. Checking if we need to login...');

            // Try to Login
            const loggedIn = await loginUser(page);
            if (loggedIn) {
                await log('Login successful. Retrying profile navigation...');
                await page.goto('https://www.naukri.com/mnj/user/profile', { waitUntil: 'networkidle2' });
            } else {
                await log('Could not login. Checking if we are already on profile or giving up.');
                if (page.url().includes('profile')) {
                    await log('Already on profile page.');
                } else {
                    throw new Error('Failed to navigate to profile page (Login failed or not attempted)');
                }
            }
        }



        // 4. Upload Resume
        await log('Looking for Resume Upload section...');

        // Strategy: 
        // 1. Wait for .upload-button (visual confirmation we are there)
        // 2. Upload to input[type="file"] (the actual mechanism)

        await page.waitForSelector('.upload-button', { timeout: 15000 });
        const fileInput = await page.$('input[type="file"]');

        if (!fileInput) {
            throw new Error('File input not found');
        }

        await log(`Uploading file: ${resumeFilePath}`);
        await fileInput.uploadFile(resumeFilePath);


        // 5. Verify Success
        await log('File uploaded. Waiting for confirmation...');

        // Wait for success text
        try {
            await page.waitForFunction(
                () => {
                    const bodyText = document.body.innerText;
                    // Format today's date like "Jan 19, 2026" matches Naukri's format
                    const today = new Date();
                    const options = { year: 'numeric', month: 'short', day: 'numeric' };
                    // Naukri format: "Uploaded on Jan 19, 2026"

                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const d = new Date();
                    const day = d.getDate();
                    const month = months[d.getMonth()];
                    const year = d.getFullYear();
                    const exactString = `Uploaded on ${month} ${day}, ${year}`;

                    return bodyText.includes('Successfully uploaded') ||
                        bodyText.includes('Resume updated') ||
                        bodyText.includes(exactString) ||
                        bodyText.includes(path.basename(resumeFilePath)); // Check for specific filename
                },
                { timeout: 30000 }
            );

            // Double check: Verify the filename actually appears on the screen (strongest check)
            await page.waitForFunction(
                (filename) => document.body.innerText.includes(filename),
                { timeout: 5000 },
                path.basename(resumeFilePath)
            );

            await log('SUCCESS: Resume updated successfully!');

        } catch (e) {
            await log('WARNING: Upload performed, but success message not detected. Saving screenshot and text.');
            const screenshotDir = path.join(__dirname, '../logs/resume_screenshots');
            await fs.ensureDir(screenshotDir);
            await page.screenshot({ path: path.join(screenshotDir, 'debug-upload-success.png') });
            const bodyText = await page.evaluate(() => document.body.innerText);

            await fs.writeFile(path.join(__dirname, '../logs/failed-verification-text.txt'), bodyText);
        }

    } catch (error) {
        await log(`CRITICAL ERROR: ${error.message}`);
        if (browser) {
            try {
                const page = (await browser.pages())[0];
                if (page) await page.screenshot({ path: path.join(__dirname, '../logs/resume_screenshots/error-screenshot.png') });
                // Save page content for debug
                const html = await page.content();
                await fs.writeFile(path.join(__dirname, '../logs/error-dump.html'), html);
            } catch (sq) { }
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
