// File: server/routes/metrics.js
// Module to handle all API calls related to metrics

const express = require('express');
// const router = express.Router();
// const db = require('../database');

module.exports = (db) => {
  const router = express.Router();

  // API endpoint to add a new metric
  router.post('/add-metric', async (req, res) => {
    console.log('made it to the server!');
    const { title, inputType } = req.body;
    console.log(`server - title: ${title}`);
    console.log(`server - input Type: ${inputType}`);

    if (!title || !inputType) {
      return res
        .status(400)
        .json({ error: 'Metric title and inputType are required' });
    }

    try {
      const result = await db.run(
        'INSERT INTO metrics (title, input_type) VALUES (?, ?)',
        [title, inputType]
      );
      res.status(200).json({ id: result.lastID, title, inputType });
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to add metric' });
    }
  });

  // API endpoint to delete a metric
  router.post('/delete-metric', async (req, res) => {
    console.log('delete metric server called');
    const { metricId } = req.body;
    console.log(`metric id to delete: ${JSON.stringify(metricId)}`);

    try {
      const result = await db.run('DELETE FROM metrics WHERE id = ?', [
        metricId,
      ]);
      console.log(`Row(s) deleted: ${result.changes}`);
      res.status(200).json({ metricId }); // probably an unneeded line?
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Failed to delete metric' });
    }
  });

  // API endpoit to get all metrics
  router.get('/get-metrics', async (req, res) => {
    console.log('reached get-metrics');
    try {
      const rows = await db.all('SELECT * FROM metrics', []);
      res.status(200).json(rows);
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  });

  // API endpoint to add metric data
  router.post('/add-data', async (req, res) => {
    console.log(req.body);
    const metricsData = req.body; // Expecting an array of metrics
    // replace any metrics that exist for the given date to update it's data
    try {
      const insert = await db.prepare(
        'INSERT OR REPLACE INTO metric_data (date, metric_id, data) VALUES (?, ?, ?)'
      );
      // get data for each metric in order they arrive
      for (const { id, value, date } of metricsData) {
        console.log(`id: ${id}, value: ${value}, date: ${date}`);
        // insert data into db in correct order as the table expects
        await insert.run(date, id, value);
      }
      await insert.finalize(); // Finalize the prepared statement
      console.log('Metrics added successfully!');
      res.status(200).json({ message: 'Metrics saved successfully' });
    } catch (error) {
      console.error('Error inserting metrics:', error);
      res.status(500).json({ error: 'Failed to save metrics' });
    }
  });

  // API endpoint (POST /get-data) to retrieve data on a selected date
  router.get('/get-data', async (req, res) => {
    const date = req.query.date;
    //console.log(`get-data hit with date: ${date}`);
    try {
      const rows = await db.all('SELECT * FROM metric_data WHERE date = ?', [
        date,
      ]);
      rows
        ? console.log(`entry found for date ${date}`)
        : console.log(`No entry found for date ${date}`);
      console.log(`data rows: ${JSON.stringify(rows)}`);
      // return data rows
      res.status(200).json(rows);
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to find data for date' });
    }
  });

  return router;
};
// Note: The above code assumes that you have a SQLite database set up with the necessary tables.
// The database connection and table creation should be handled in a separate module (e.g., database.js).
// The above code is a basic example and may need to be adjusted based on your specific requirements and database schema.
