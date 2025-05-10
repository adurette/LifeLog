// Server js
// Primary server file containing all API endpoints

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const initializeDatabase = require('./database'); // Import the async database initializer
const metricsRoutes = require('./routes/metrics'); // Import the metrics routes
// const db = require('./database');

const app = express();
const PORT = process.env.PORT || 8080;

let db; // Declare db variable to hold database instance

(async () => {
  db = await initializeDatabase(); // Initialize the database
  console.log('Database initialized');

  // Middleware
  app.use(bodyParser.json());
  app.use(cors());

  // Serve static files from the React app
  // This looks for the build folder in the client directory
  // to serve the React app from there.
  app.use(express.static(path.join(__dirname, '../client/build')));

  // Use metrics routes
  // Any request to /metrics will be handled by the routes defined in metrics.js
  // So when the client makes a request to /metrics/add-metric, it
  // will be handled by the add-metric route in metrics.js
  app.use('/metrics', metricsRoutes(db)); // Pass the db instance to the routes

  // Test API endpoint
  app.get('/', (req, res) => {
    res.send('Hello from our server!');
  });

  // API endpoint to add a new entry
  app.post('/add-entry', (req, res) => {
    const { date, drinks, mindfulness, sleep, feeling, energy, satisfaction } =
      req.body;

    if (
      !drinks ||
      !mindfulness ||
      !sleep ||
      !feeling ||
      !energy ||
      !satisfaction ||
      !date
    ) {
      return res.status(400).json({ error: 'Data and date are required' });
    }

    // If data exists, we want to replace that data so the user can over-write previous entries
    db.run(
      'INSERT OR REPLACE INTO metric_data (date, drinks, mindfulness, sleep, feeling, energy, satisfaction) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [date, drinks, mindfulness, sleep, feeling, energy, satisfaction],
      function (err) {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ error: 'Failed to add entry' });
        }
        res.status(200).json({
          id: this.lastID,
          date,
          drinks,
          mindfulness,
          sleep,
          feeling,
          energy,
          satisfaction,
        });
      }
    );
  });

  // API endpoint to get all entries
  app.get('/entries', (req, res) => {
    db.all('SELECT * FROM metric_data ORDER BY date DESC', [], (err, rows) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Failed to retrieve entries' });
      } else {
        console.log('entries retrieved.');
      }
      res.status(200).json(rows);
    });
  });

  // API endpoint (POST /get-entry) to retrieve data on a selected date
  app.post('/get-entry', (req, res) => {
    const date = req.body.date;
    console.log(req.body.date);
    console.log(`get-entry hit with date: ${date}`);

    db.get('SELECT * FROM metric_data WHERE date = ?', [date], (err, row) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Failed to find data for date' });
      }
      // return row data
      row
        ? console.log(`entry found for date ${date}`)
        : console.log(`No entry found for date ${date}`);
      console.log(`row data: ${row}`);
      res.status(200).json(row);
    });
  });

  // Catch-all route to serve the React app for any other request
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });

  // Start the server
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
})();
