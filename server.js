const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const port = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// API endpoint to add a new entry
app.post('/add-entry', (req, res) => {
  const { date, drinks, mindfulness, sleep, feeling, energy, satisfaction } = req.body;

  if (!drinks || !mindfulness || !sleep || !feeling || !energy || !satisfaction || !date) {
    return res.status(400).json({ error: 'Data and date are required' });
  }

  db.run(
    'INSERT OR REPLACE INTO entries (date, drinks, mindfulness, sleep, feeling, energy, satisfaction) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [date, drinks, mindfulness, sleep, feeling, energy, satisfaction],
    function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Failed to add entry' });
      }
      res.status(200).json({ id: this.lastID, date, drinks, mindfulness, sleep, feeling, energy, satisfaction });
    }
  );
});

// API endpoint to get all entries
app.get('/entries', (req, res) => {
  db.all('SELECT * FROM entries ORDER BY date DESC', [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to retrieve entries' });
    }
    else {
      console.log('entries retrieved.');
    }
    res.status(200).json(rows);
  });
});

// API endpoint to retrieve data on a selected date
app.post('/get-entry', (req, res) => {
  const date = req.body.date;
  console.log(req.body.date);
  console.log(`get-entry hit with date: ${date}`);

  db.get('SELECT * FROM entries WHERE date = ?', [date], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to find data for date' });
    }
    // return row data
    row ? console.log(`entry found for date ${date}`) : console.log(`No entry found for date ${date}`);
    console.log(`row data: ${row}`);
    res.status(200).json(row);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

