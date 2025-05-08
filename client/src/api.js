/**
 * File: script.js
 * Description: Main js for Life Log
 * Author: Andrew 
 * Date: 2024-09-19
 */

import axios from "axios";

const APIURL = 'http://localhost:8080';
const apiClient = axios.create( {
  baseURL: 'http://localhost:8080'
});

// helper method to alert user with error
const raiseError = (error) => {
  console.error(`Error: ${error}`);
  alert(`Error: ${error}`);
}

// Add new metric to database
export const addMetric = async (title, inputType) => {
    //debugger;
    console.log('Made it to the addMetric api call from react!')
    console.log(`title: ${title}`);
    console.log(`inputType: ${inputType}`);

    fetch(`${APIURL}/metrics/add-metric`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, inputType })
      })
      .then(response => response.json())
      .then(result => {
        console.log('Success:', result);
        alert('Metric added successfully!');
        //fetchEntries(); // Reload entries to include the new entry
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Failed to add metric.');
      });
};

// Delete metric
export const deleteMetric = async (metricId) => {
  console.log(`delete metric api called w/ id: ${metricId}`);
  try {
    await apiClient.post('/metrics/delete-metric', { metricId });
  } catch (error) {
    raiseError();
  }
};

// Fetch metrics
export const fetchMetrics = async () => {
  try {
    const response = await apiClient.get(`/metrics/get-metrics`);
    return response.data;
  } catch (error) {
    raiseError(error);
  }
};

// Save data for each metric
export const saveData = async (data) => {
  console.log(`Saved data: ${data}`);
  try {
    await apiClient.post(`/metrics/add-data`, data);
  } catch (error) {
    raiseError(error);
  }
};

// Fetch the data associated with a given date
export const fetchData = async (date) => {
  const response = await axios.get(`${APIURL}/metrics/get-data`,{ params: { date } });
  //console.log(`response: ${JSON.stringify(response.data)}`);
  return response.data;
};