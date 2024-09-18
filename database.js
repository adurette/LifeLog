const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create or open the SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

// Create a table if it doesn't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      drinks INTEGER NOT NULL,
      mindfulness INTEGER NOT NULL,
      sleep INTEGER NOT NULL,
      feeling TEXT NOT NULL,
      energy INTEGER NOT NULL,
      satisfaction TEXT NOT NULL
    )
  `);
});

module.exports = db;
