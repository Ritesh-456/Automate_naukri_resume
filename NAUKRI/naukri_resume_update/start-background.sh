#!/bin/bash
# Stops any existing scheduler
pkill -f "node src/scheduler.js"

# Ensure we are in the project directory
cd /media/riteshbrahmachari/Storage/DATA/NAUKRI/naukri_resume_update

# Starts the scheduler in the background
nohup npm run start-scheduler > logs/scheduler.log 2>&1 &

echo "Scheduler started in background. Logs are being written to logs/scheduler.log"
notify-send "Naukri Updater" "Auto-Scheduler Started Successfully!"
echo "To stop it, run: pkill -f 'node src/scheduler.js'"
