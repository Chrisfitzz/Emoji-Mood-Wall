// The brain of the frontend

// URL of backend API -- FE calls this
const API_URL = "/api/moods";



/* -------- API calls -------- */

// Function that calls the Backend and returns the moods as a JS object
async function fetchMoods() {
    const response = await fetch(API_URL);

    if (!response.ok) {
        console.error("Failed to fetch moods");
        return {};
    }

    return await response.json();
}

// Render mood bars in the page -- Turning Data into visible UI
function renderMoods(moods) {
    const container = document.getElementById("mood-bars");
    container.innerHTML = "";

    const counts = Object.values(moods);
    const max = counts.length ? Math.max(...counts) : 0;
    const maxBarWidth = 260;

    for (const [emoji, count] of Object.entries(moods)) {
        const row = document.createElement("div");
        row.className = "mood-row";

        const emojiSpan = document.createElement("span");
        emojiSpan.className = "emoji";
        emojiSpan.textContent = emoji;

        const barWrapper = document.createElement("div");
        barWrapper.className = "bar-wrapper";

        const bar = document.createElement("div");
        bar.className = "bar";

        const width = max > 0 ? (count / max) * maxBarWidth : 0;
        bar.style.width = `${width}px`;

        const countSpan = document.createElement("span");
        countSpan.className = "count";
        countSpan.textContent = count;

        barWrapper.appendChild(bar);
        barWrapper.appendChild(countSpan);

        row.appendChild(emojiSpan);
        row.appendChild(barWrapper);

        container.appendChild(row);
    }
}

// Send a vote for a specific emoji to the backend + refresh UI
async function vote(emoji) {
    try {

        const voterId = getVoterId();

        const res = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ emoji, voterId }),
        });



        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.error || "Vote failed");
            return;
        }

        // Mark after successful vote
        markVotedToday();

        const moods = await fetchMoods();
        renderMoods(moods);
    } catch (err) {
        console.error("Error voting:", err);
    }
}
function setupAddMoodForm() {
    const form = document.getElementById("addMoodForm");
    const input = document.getElementById("newEmoji");
    const msg = document.getElementById("addMoodMsg");
    if (!form || !input) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const emoji = input.value.trim();
        if (!emoji) return;

        const res = await fetch("/api/moods/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emoji }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            if (msg) msg.textContent = err.error || "Could not add mood";
            return;
        }

        input.value = "";
        if (msg) msg.textContent = "";
        const moods = await fetchMoods();
        renderMoods(moods);
    });
}

// Setup event listeners on page load
document.addEventListener("DOMContentLoaded", async () => {
    const moods = await fetchMoods();
    renderMoods(moods);
    setupAddMoodForm();

    // Attach click handlers to emoji buttons
    const buttons = document.querySelectorAll("[data-emoji]");
    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const emoji = button.dataset.emoji;
            vote(emoji);
        });
    });


});

// Optional: polling for “real-time-ish” updates
setInterval(async () => {
    const moods = await fetchMoods();
    renderMoods(moods);
}, 5000);