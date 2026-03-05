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

// Vote (UNLIMITED voting)
app.post("/api/moods", (req, res) => {
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ error: "emoji is required" });

    // Check emoji exists
    const exists = db.prepare("SELECT 1 FROM moods WHERE emoji = ?").get(emoji);
    if (!exists) return res.status(400).json({ error: "emoji not supported" });

    // Increment mood count
    db.prepare("UPDATE moods SET count = count + 1 WHERE emoji = ?").run(emoji);

    res.json(getMoodCountsObject());
});

// Add a new mood (emoji)
app.post("/api/moods/add", (req, res) => {
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ error: "emoji is required" });

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