
/*
 * yes, this is a lot of global variables
 * while they could be managed using a context object passed through the functions
 * for such a small project, this is fine
 * 
 * If this is ever refactored to be made larger, or potentially add a backend, 
 * this should be addressed first to improve larger architecture decisions.
 */
var workTime = 25; // minutes
var breakTime = 5; // minutes

var running = false;
var isWorkTime = true;
var startTime = 0; // UNIX timestamp
var elapsedTime = 0; // seconds
var timerID; // int to allow for killing interval

/* Constants */
const UPDATE_PERIOD = 250; // ms

/* initial setup for storing the variables in Chrome */
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ workTime });
    chrome.storage.sync.set({ breakTime });
});

/* more or less a mini API between popup and background */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.cmd === "START_TIMER" && !running) {
        updateTimes(message);

        running = true;
        isWorkTime = true;

        startTime = getCurrentTime();
        timerID = setInterval(updateElapsed, UPDATE_PERIOD);

        sendResponse({ success: true });

    } else if (message.cmd === "END_TIMER" && running) {
        running = false;

        clearInterval(timerID);
        startTime = 0;
        
        let response = {
            success : true,
            workTime: workTime,
            breakTime: breakTime
        }
        sendResponse(response);

    } else if (message.cmd === "REFRESH") {
        sendResponse({ running });
        updateElapsed();
    }
});

/* args -  None
   ret - UNIX timestamp
 */
function getCurrentTime() {
    let date = new Date();
    let currentTime = date.getTime();
    return currentTime;
}

/* args - time : UNIX timestamp
   ret - seconds from time to now : int
*/
function timeSince(time) {
    let diff = getCurrentTime() - time; 
    return Math.floor(diff / 1000);
}

/* 
 * Calculates the elapsed time since timer start, updates the clocks on the UI,
 * switches timers if time is up.
 * 
 * BUG: throws an uncaught error when the UI is closed because it is trying to send an update
 * to popup.js that can't be received.

   args - None
   ret - None
 */
function updateElapsed() {
    elapsedTime = timeSince(startTime);
    minutesElapsed = elapsedTime / 60;
    
    if ((isWorkTime && minutesElapsed > workTime)
    || (!isWorkTime && minutesElapsed > breakTime)) {
        switchTimers();
    } else {
        const timeLeft = (isWorkTime ? workTime : breakTime) * 60 - elapsedTime;
        const secondsLeft = timeLeft % 60;
        const minutesLeft = Math.floor(timeLeft / 60);

        const message = {
            cmd: "UPDATE_TIME",
            minutes: minutesLeft,
            seconds: secondsLeft,
            timer: isWorkTime ? "WORK_TIMER" : "BREAK_TIMER"
        };
        chrome.runtime.sendMessage(message);
    }
}

/* 
 * switches the timer being used, sends a popup alert to the user about whether to staart or stop working
 * 
 * 
 * args - None
 * ret - None
 */
function switchTimers() {
    if (!running) {
        return;
    }

    isWorkTime = !isWorkTime;
    startTime = getCurrentTime();
    const message = {
        cmd: "SWITCH_TIMERS",
        workTime: workTime,
        breakTime: breakTime,
        isWorkTime: isWorkTime
    }

    chrome.windows.create({
        url: isWorkTime ? "work.html" : "break.html", 
        width: 250, 
        height: 80, 
        type: "popup",
        focused: true
    });

    chrome.runtime.sendMessage(message);
}

/* 
 * updates the synchronized storage
 * args - message : object with workTime and breakTime
 * ret - None
 */
function updateTimes(message) {
    workTime = message.workTime;
    breakTime = message.breakTime;

    chrome.storage.sync.set({ workTime });
    chrome.storage.sync.set({ breakTime });
}
