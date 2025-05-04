// Database js
// Creates the database tables if they do not exist already

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create or open the SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

// Create a table for the data if it doesn't exist
/*db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS data (
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
});*/

// Create a table for the data if it doesn't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS metric_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      metric_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      UNIQUE(date, metric_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating metric_data table:', err.message);
    } else {
      console.log('metric_data table created or already exists.');
    }
  });


// Create a table for the tracked metrics if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      input_type INTEGER NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating metrics table:', err.message);
    } else {
      console.log('metrics table created or already exists.');
    }
  });

});

module.exports = db;
