const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const UPDATE_SCRIPT = path.join(__dirname, 'update-resume.js');
const LOG_FILE = path.join(__dirname, '../logs/resume_activity.log');
const INTERVAL_MINUTES = 30;

console.log('Starting Naukri Resume Scheduler...');
console.log(`Schedule: Every ${INTERVAL_MINUTES} minutes (*/30 * * * *)`);

const runUpdate = () => {
    console.log('--------------------------------------------------');
    console.log(`[${new Date().toISOString()}] Triggering scheduled update...`);

    exec(`node "${UPDATE_SCRIPT}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        if (stderr) console.error(`stderr: ${stderr}`);
    });
};

const checkLastRunAndStart = () => {
    console.log('Checking last run time from logs...');

    if (!fs.existsSync(LOG_FILE)) {
        console.log('No log file found. Running immediately...');
        runUpdate();
        return;
    }

    const data = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = data.trim().split('\n');
    let lastSuccessTime = null;

    // Iterate backwards to find last SUCCESS
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (line.includes('SUCCESS: Resume updated successfully')) {
            // Extract timestamp: [21/1/2026, 2:00:17 am]
            const match = line.match(/^\[(.*?)]/);
            if (match && match[1]) {
                const dateStr = match[1];
                // Parse "D/M/YYYY, h:mm:ss am"
                // Using regex to split explicitly for robustness
                const dateParts = dateStr.match(/(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+)\s+(am|pm)/i);

                if (dateParts) {
                    let [_, day, month, year, hour, minute, second, meridiem] = dateParts;
                    hour = parseInt(hour);
                    if (meridiem.toLowerCase() === 'pm' && hour < 12) hour += 12;
                    if (meridiem.toLowerCase() === 'am' && hour === 12) hour = 0;

                    lastSuccessTime = new Date(year, month - 1, day, hour, minute, second);
                    break;
                }
            }
        }
    }

    if (lastSuccessTime) {
        const now = new Date();
        const diffMs = now - lastSuccessTime;
        const diffMins = diffMs / (1000 * 60);

        console.log(`Last successful run: ${lastSuccessTime.toLocaleString()}`);
        console.log(`Time elapsed: ${diffMins.toFixed(1)} minutes`);

        if (diffMins >= INTERVAL_MINUTES) {
            console.log('Last run was too long ago. Running immediately...');
            runUpdate();
        } else {
            console.log(`Last run was recent (< ${INTERVAL_MINUTES} mins). Waiting for next schedule.`);
        }
    } else {
        console.log('No previous success record found. Running immediately...');
        runUpdate();
    }
};

// Check on startup
checkLastRunAndStart();

// Schedule tasks to be run on the server.
cron.schedule('*/30 * * * *', () => {
    runUpdate();
});

console.log('Scheduler is running. Press Ctrl+C to stop.');
