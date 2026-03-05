const Database = require("better-sqlite3");

const db = new Database("moods.db");

// Create tables if they don't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS moods (
                                         emoji TEXT PRIMARY KEY,
                                         count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS votes (
                                         voter_id TEXT NOT NULL,
                                         vote_date TEXT NOT NULL,
                                         PRIMARY KEY (voter_id, vote_date)
        );
`);

// Seed default moods only if empty
const row = db.prepare("SELECT COUNT(*) AS count FROM moods").get();

if (row.count === 0) {
    const initialMoods = [
        "(＾▽＾)",
        "(・・?)",
        "(╥﹏╥)",
        "(◉‿◉)",
        "(✖﹏╖)",
        "(☉_☉)",
        "(^～^)",
        "( ゜o゜)",
        "(＃`Д´)",
    ];

    const insert = db.prepare("INSERT INTO moods (emoji, count) VALUES (?, 0)");
    const txn = db.transaction(() => {
        for (const emoji of initialMoods) insert.run(emoji);
    });
    txn();
}

module.exports = db;