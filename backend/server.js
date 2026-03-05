const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// Middleware
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

function getMoodCountsObject() {
    const rows = db.prepare("SELECT emoji, count FROM moods").all();
    const moodCounts = {};
    for (const row of rows) moodCounts[row.emoji] = row.count;
    return moodCounts;
}

// Health checks
app.get("/health", (req, res) => res.send("OKIE DOKIE"));
app.get("/check", (req, res) => res.send("YEP."));

// Get current mood counts (from SQLite)
app.get("/api/moods", (req, res) => {
    res.json(getMoodCountsObject());
});

// Vote (1 vote per user per day)
app.post("/api/moods", (req, res) => {
    const { emoji, voterId } = req.body;

    if (!emoji) return res.status(400).json({ error: "emoji is required" });
    if (!voterId) return res.status(400).json({ error: "voterId is required" });

    // Check emoji exists
    const exists = db.prepare("SELECT 1 FROM moods WHERE emoji = ?").get(emoji);
    if (!exists) return res.status(400).json({ error: "emoji not supported" });

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Enforce one vote per voter per day
    const alreadyVoted = db
        .prepare("SELECT 1 FROM votes WHERE voter_id = ? AND vote_date = ?")
        .get(voterId, today);

    if (alreadyVoted) {
        return res.status(429).json({ error: "already voted today" });
    }

    // Transaction: record vote + increment mood
    const txn = db.transaction(() => {
        db.prepare("INSERT INTO votes (voter_id, vote_date) VALUES (?, ?)").run(voterId, today);
        db.prepare("UPDATE moods SET count = count + 1 WHERE emoji = ?").run(emoji);
    });

    txn();

    res.json(getMoodCountsObject());
});

// Add a new mood (emoji)
app.post("/api/moods/add", (req, res) => {
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ error: "emoji is required" });

    // Basic normalization: trim
    const cleaned = String(emoji).trim();
    if (!cleaned) return res.status(400).json({ error: "emoji is required" });

    try {
        db.prepare("INSERT INTO moods (emoji, count) VALUES (?, 0)").run(cleaned);
    } catch (e) {
        return res.status(409).json({ error: "emoji already exists" });
    }

    res.json(getMoodCountsObject());
});

// Basic error handler (keeps crashes from killing the server)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "internal server error" });
});

app.listen(PORT, () => {
    console.log(`Emoji Mood Wall backend running on http://localhost:${PORT}`);
});
