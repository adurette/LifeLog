// Database js
// Creates the database tables if they do not exist already

const sqlite = require('sqlite');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create or open the SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

async function initializeDatabase() {
  // Open the SQLite database
  const db = await sqlite.open({
    filename: path.join(__dirname, 'database.db'),
    driver: sqlite3.Database,
  });
  try {
    // Create the metric_data table if it doesn't exist
    await db.run(
      `
      CREATE TABLE IF NOT EXISTS metric_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        metric_id INTEGER NOT NULL,
        data TEXT NOT NULL,
        UNIQUE(date, metric_id)
      )
    `
    );

    // Create the metrics table if it doesn't exist
    await db.run(
      `
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        input_type INTEGER NOT NULL
      )
    `
    );
    console.log('metrics table created or already exists.');
  } catch (err) {
    console.error('Error initialization database:', err.message);
  }

  return db;
}

module.exports = initializeDatabase;

// // Create a table for the data if it doesn't exist
// db.serialize(() => {
//   db.run(
//     `
//     CREATE TABLE IF NOT EXISTS metric_data (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       date TEXT NOT NULL,
//       metric_id INTEGER NOT NULL,
//       data TEXT NOT NULL,
//       UNIQUE(date, metric_id)
//     )
//   `,
//     (err) => {
//       if (err) {
//         console.error('Error creating metric_data table:', err.message);
//       } else {
//         console.log('metric_data table created or already exists.');
//       }
//     }
//   );

//   // Create a table for the tracked metrics if it doesn't exist
//   db.run(
//     `
//     CREATE TABLE IF NOT EXISTS metrics (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       title TEXT NOT NULL,
//       input_type INTEGER NOT NULL
//     )
//   `,
//     (err) => {
//       if (err) {
//         console.error('Error creating metrics table:', err.message);
//       } else {
//         console.log('metrics table created or already exists.');
//       }
//     }
//   );
// });

// module.exports = db;
