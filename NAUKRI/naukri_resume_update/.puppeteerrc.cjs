const path = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Move cache up 2 levels:
    // From: /media/riteshbrahmachari/Storage/DATA/NAUKRI/naukri_resume_update/
    // To:   /media/riteshbrahmachari/Storage/DATA/.puppeteer_cache
    cacheDirectory: path.join(__dirname, '../../.puppeteer_cache'),
};
