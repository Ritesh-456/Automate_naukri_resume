# Naukri Resume Auto-Updater

> A powerful Node.js automation bot that stealthily updates your Naukri.com resume daily to keep your profile active at the top of recruiter searches, featuring automatic resume renaming and background scheduling.

---

## 🚀 Features
- **Auto-Rename**: Automatically renames your resume to `Ritesh_resume_DD_Mon_YYYY_and_HH_MM_AMPM.pdf` to ensure uniqueness.
- **Stealth Mode**: Uses advanced stealth techniques to bypass bot detection.
- **Background Scheduler**: Runs automatically in the background (Windows Startup included).
- **Session Re-use**: Logs in once manually and reuses the session (Cookies) indefinitely.
- **Strict Verification**: Verifies the upload by checking that the *exact* new filename appears on the page.

---

## 🛠️ Step-by-Step Guide

### 1. Installation
Install the necessary dependencies (Node.js required):
```powershell
npm install
```

### 2. Login Setup (One Time Only)
Run this command to capture your login session. You don't need to put your password in any file.
```powershell
npm run login-setup
```
- A Chrome window will open.
- **Log in** to Naukri manually.
- Wait until you see the **Dashboard**.
- The window will close automatically, saving your session to `data/session.json`.

### 3. Resume File
Place your resume PDF in the `resume/` folder.
- **Do not rename it manually.**
- The script will automatically pick any `.pdf` file in that folder and rename it with the current timestamp before uploading.

### 4. Test the Script (Manual Run)
Run the update script once to verify everything works:
```powershell
node src/update-resume.js
```
- It should open Chrome -> Go to Profile -> Upload Resume -> Verify Success.
- If successful, you are ready for automation.

### 5. Start Background Automation
To invoke the scheduler immediately:
**Option A: PowerShell**
```powershell
./start-background.ps1
```

**Option B: Silent Launcher**
Double-click `naukri-updater.vbs` in the folder. This runs it silently (no black window).

### 6. Auto-Start on Boot (Already Configured)
A shortcut has been placed in your Windows `Startup` folder. The automation will start automatically every time you turn on your computer.

---

## 📊 Monitoring & Logs
- **Activity Log**: `logs/resume_activity.log` (Check this to see run history).
- **Screenshots**: `logs/resume_screenshots/` (Saved if an error occurs).

To watch logs live in PowerShell:
```powershell
Get-Content logs/resume_activity.log -Wait
```

---

## ❓ Troubleshooting

### "App performance is very slow"
- **This is normal.** Naukri's homepage is heavy with ads/tracking. The script waits for it to fully load to avoid detection.
- A typical run takes 30-60 seconds.

### `net::ERR_NAME_NOT_RESOLVED`
- Your internet connection dropped. The script will fail this run but retry automatically in the next scheduled slot.

### "Could not find View profile link"
- Your session might have expired. Run `npm run login-setup` again to refresh it.
