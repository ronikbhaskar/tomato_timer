// TODO: documentation

/* load html elements */
const toggleTomato = document.getElementById("toggleTomato");
const workTimeInput = document.getElementById("workTime");
const breakTimeInput = document.getElementById("breakTime");
const startStopText = document.getElementById("startStopText");

const START_TEXT = "Start Session";
const STOP_TEXT = "Stop Session";
const START_ICON = "▶";
const STOP_ICON = "✖";

var running = false;

/* Initialize times with user preference */
chrome.storage.sync.get("workTime", ({ workTime }) => {
    workTimeInput.value = workTime;
});

chrome.storage.sync.get("breakTime", ({ breakTime }) => {
    breakTimeInput.value = breakTime;
});

/* When the button is clicked, toggle the timer */
toggleTomato.addEventListener("click", async () => {
    /* the toggle */
    running = !running;

    if (running) {
        let message = { 
            cmd: "START_TIMER",
            workTime: workTimeInput.value,
            breakTime: breakTimeInput.value
        };

        if (message.workTime === "" || message.breakTime === "") {
            return;
        }

        chrome.runtime.sendMessage(message, response => {
            if (!response.success) {
                /* untoggle */
                running = !running;
                return;
            }
        });
        startStopText.textContent = STOP_TEXT;
        toggleTomato.textContent = STOP_ICON;
        workTimeInput.type = "text";
        breakTimeInput.type = "text";
        workTimeInput.disabled = true;
        breakTimeInput.disabled = true;
    } else {
        chrome.runtime.sendMessage({ cmd: "END_TIMER" }, response => {
            if (!response.success) {
                /* untoggle */
                running = !running;
                return;
            }

            workTimeInput.value = response.workTime;
            breakTimeInput.value = response.breakTime;
        });

        startStopText.textContent = START_TEXT;
        toggleTomato.textContent = START_ICON;
        workTimeInput.type = "number";
        breakTimeInput.type = "number";
        workTimeInput.disabled = false;
        breakTimeInput.disabled = false;
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.cmd === "UPDATE_TIME") {
        const minuteString = message.minutes.toString();
        const secondString = (message.seconds < 10 ? "0" : "") + message.seconds.toString();
        const timeString = minuteString + ":" + secondString;

        if (message.timer === "WORK_TIMER") {
            workTimeInput.value = timeString;
        } else {
            breakTimeInput.value = timeString;
        }

    } else if (message.cmd === "SWITCH_TIMERS") {
        workTimeInput.value = message.workTime;
        breakTimeInput.value = message.breakTime;
    }
});

chrome.runtime.sendMessage({ cmd: "REFRESH" }, response => {
    if (!response.running) {
        return;
    }

    workTimeInput.type = "text";
    breakTimeInput.type = "text";
    startStopText.textContent = STOP_TEXT;
    toggleTomato.textContent = STOP_ICON;
    workTimeInput.disabled = true;
    breakTimeInput.disabled = true;
});