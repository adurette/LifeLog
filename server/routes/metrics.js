// File: server/routes/metrics.js
// Module to handle all API calls related to metrics

const express = require('express');
const router = express.Router();
const db = require('../database');

// API endpoint to add a new metric
router.post('/add-metric', (req, res) => {
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
router.post('/delete-metric', (req, res) => {
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
router.get('/get-metrics', (req, res) => {
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
router.post('/add-data', (req, res) => {
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
router.get('/get-data', (req, res) => {
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

module.exports = router;
// Note: The above code assumes that you have a SQLite database set up with the necessary tables.
// The database connection and table creation should be handled in a separate module (e.g., database.js).
// The above code is a basic example and may need to be adjusted based on your specific requirements and database schema.