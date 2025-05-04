// Server js
// Primary server file containing all API endpoints

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const port = 8080;
const cors = require('cors');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// TESTING W/ REACT APP
app.use(cors())

// Test API endpoint
app.get('/', (req, res) => {
  res.send('Hello from our server!')
})

// API endpoint to add a new metric
app.post('/add-metric', (req, res) => {
  console.log('made it to the server!');
  const { title, inputType} = req.body;
  console.log(`server - title: ${title}`);
  console.log(`server - input Type: ${inputType}`);

  if (!title || !inputType) {
    return res.status(400).json({ error: 'Metric title and inputType are required' });
  }

  db.run(
    'INSERT INTO metrics (title, input_type) VALUES (?, ?)',
    [title, inputType],
    function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Failed to add metric' });
      }
      res.status(200).json({ id: this.lastID, title, inputType });
    }
  );
});

// API endpoint to delete a metric
app.post('/delete-metric', (req, res) => {
  console.log('delete metric server called');
  const { metricId } = req.body;
  console.log(`metric id to delete: ${JSON.stringify(metricId)}`);

  db.run(
    'DELETE FROM metrics WHERE id = ?',
    [metricId],
    function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({error: 'Failed to delete metric' });
      }
      console.log(`Row(s) deleted: ${this.changes}`);
      res.status(200).json({metricId}); // probably an unneeded line?
    })
});

// API endpoit to get all metrics
app.get('/get-metrics', (req, res) => {
  console.log('reached get-metrics');
  db.all('SELECT * FROM metrics', [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
    else {
      console.log('metrics retrieved.');
    }
    res.status(200).json(rows);
  });
});

// API endpoint to add metric data
app.post('/add-data', (req, res) => {
  console.log(req.body);
  const metricsData = req.body; // Expecting an array of metrics
  // replace any metrics that exist for the given date to update it's data
  const insert = db.prepare('INSERT OR REPLACE INTO metric_data (date, metric_id, data) VALUES (?, ?, ?)');

  try {
    // get data for each metric in order they arrive
    for (const {id, value, date } of metricsData) {
      console.log(`id: ${id}, value: ${value}, date: ${date}`);
      // insert data into db in correct order as the table expects
      insert.run(date, id, value);
    }

    console.log("Metrics added successfully!");
    res.status(200).json({ message: 'Metrics saved successfully' });
  } catch (error) {
    console.error('Error inserting metrics:', error);
    res.status(500).json({ error: 'Failed to save metrics' });
  }
});


// API endpoint (POST /get-data) to retrieve data on a selected date
app.get('/get-data', (req, res) => {
  const date = req.query.date;
  //console.log(`get-data hit with date: ${date}`);

  db.all('SELECT * FROM metric_data WHERE date = ?', [date], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to find data for date' });
    }
    // return data rows
    rows ? console.log(`entry found for date ${date}`) : console.log(`No entry found for date ${date}`);
    console.log(`data rows: ${JSON.stringify(rows)}`);
    res.status(200).json(rows);
  });
});


// API endpoint to add a new entry
app.post('/add-entry', (req, res) => {
  const { date, drinks, mindfulness, sleep, feeling, energy, satisfaction } = req.body;

  if (!drinks || !mindfulness || !sleep || !feeling || !energy || !satisfaction || !date) {
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
      res.status(200).json({ id: this.lastID, date, drinks, mindfulness, sleep, feeling, energy, satisfaction });
    }
  );
});

// API endpoint to get all entries
app.get('/entries', (req, res) => {
  db.all('SELECT * FROM metric_data ORDER BY date DESC', [], (err, rows) => {
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
    row ? console.log(`entry found for date ${date}`) : console.log(`No entry found for date ${date}`);
    console.log(`row data: ${row}`);
    res.status(200).json(row);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

