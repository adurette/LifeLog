// Add Metric Card Component
// Empty template of a metric for the user to fill in the details and start tracking a new metric

import React, { useState } from "react";
import "./MetricCardStyle.css";
import { addMetric } from "../api";

function AddMetricCard(props) {
  // Create state for the title and inputType values
  const [title, setTitle] = useState("");
  const [inputType, setInputType] = useState("number");

  // Handle input changes
  const handleTitleChange = (event) => {
    setTitle(event.target.value);
  };
  const handleInputTypeChange = (event) => {
    setInputType(event.target.value);
  };

  const handleClick = (event) => {
    event.preventDefault(); // Prevent default form submission
    addMetric(title, inputType); // Call API to add metric
  };

  return (
    <div className="dataContainer">
      <h1>Add new metric:</h1>
      <form id="newMetric-form">
        {/* Title/Question of metric */}
        <label htmlFor="new-metric-title">Title/Question:</label>
        <input
          className="emptyMetricCardTitle"
          type="text"
          value={title}
          onChange={handleTitleChange}
          id="new-metric-title"
          name="new-metric-title"
          placeholder="Ex: Did you exercise today?"
          required
        />

        <br />

        {/* Input type of metric */}
        <label htmlFor="new-metric-input-type">Input type:</label>
        <select
          value={inputType}
          onChange={handleInputTypeChange}
          name="new-metric-input-type"
          id="new-metric-intput-type"
        >
          <option value="number">Number</option>
          <option value="text">Text</option>
          <option value="range">Range/Scale</option>
          <option value="boolean">Yes/No</option>
          <option value="checkbox">Checkboxs</option>
          <option value="radio">Multiple Choice</option>
        </select>

        {/** Call api endpoint to add the metric to the metrics database */}
        <button onClick={handleClick}>Add Metric</button>
      </form>
    </div>
  );
}

export default AddMetricCard;
