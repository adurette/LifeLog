// Edit Metric Card Component
// Metric card that is editable

import React, { useState, useEffect } from "react";
import "./MetricCardStyle.css";
import { addMetric, deleteMetric } from "../api";

function EditMetricCard({ id, currentTitle, currentInputType }) {
  // Create state for the title and inputType values
  const [title, setTitle] = useState("");
  const [inputType, setInputType] = useState("number");
  //const [id, setId] = useState();

  useEffect(() => {
    const setInitialValues = () => {
      setTitle(currentTitle);
      setInputType(currentInputType);
      //setId(id);
    };
    setInitialValues();
  }, []);

  // Handle input changes
  const handleTitleChange = (event) => {
    setTitle(event.target.value);
  };

  const handleInputTypeChange = (event) => {
    setInputType(event.target.value);
  };

  const handleSaveClick = (event) => {
    event.preventDefault(); // Prevent default form submission
    addMetric(title, inputType); // Call API to add metric
  };

  const handleDeleteClick = (event) => {
    console.log(`handle delete click called w/ id: ${id}`);
    event.preventDefault(); // prevent default form submission
    deleteMetric(id);
  };

  return (
    <div className="dataContainer">
      <form id={id}>
        {/* Title/Question of metric */}
        <label htmlFor="edit-metric-title">Title/Question:</label>
        <input
          className="emptyMetricCardTitle"
          type="text"
          value={title || "test"}
          onChange={handleTitleChange}
          id="edit-metric-title"
          name="edit-metric-title"
          //   placeholder="Ex: Did you exercise today?"
          required
        />

        <br />

        {/* Input type of metric */}
        <label htmlFor="edit-metric-input-type">Input type:</label>
        <select
          value={inputType || ""}
          onChange={handleInputTypeChange}
          name="edit-metric-input-type"
          id="edit-metric-intput-type"
        >
          <option value="number">Number</option>
          <option value="text">Text</option>
          <option value="range">Range/Scale</option>
          <option value="boolean">Yes/No</option>
          <option value="checkbox">Checkboxs</option>
          <option value="radio">Multiple Choice</option>
        </select>

        {/** Call api endpoint to add the metric to the metrics database */}
        <button onClick={handleSaveClick}>Save</button>
        <button onClick={handleDeleteClick}>Delete</button>
      </form>
    </div>
  );
}

export default EditMetricCard;
