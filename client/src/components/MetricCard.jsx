// Metric Card Component
// Currently tracked metric where user can enter in their data for this metric

import React, { useState } from "react";
import "./MetricCardStyle.css";

/*  Uncomment when testing material UI library
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import CardActions from "@mui/material/CardActions";
*/

// input type switch to display more specific input configurations for each type
function InputTypeSwitch({ inputType, value, onInputChange }) {
  //const [range, setRange] = useState(5);

  const handleChange = (event) => {
    onInputChange(event.target.value);
  };

  switch (inputType) {
    case "number":
      return (
        <input
          type="number"
          value={value}
          onChange={handleChange}
          placeholder="0"
          min="0"
          step="1"
          required
        />
      );
    case "text":
      return (
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Type here..."
          required
        />
      );
    case "range":
      return (
        <div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={value}
            onChange={handleChange}
            placeholder="5"
            required
          />
          <p>{value}</p>
        </div>
      );
    default:
      console.log(
        `No valid inputType defined. inputType received: ${inputType}`
      );
      return null; // Return null to avoid rendering anything
  }
}

function MetricCard({ id, title, inputType, value, onInputChange }) {
  return (
    <section>
      <div className="dataContainer">
        <h1>{title}</h1>
        <form id={id}>
          <InputTypeSwitch
            inputType={inputType}
            value={value || ""}
            onInputChange={onInputChange}
          />
          {/**  {InputTypeSwitch(inputType, onInputChange)} */}
        </form>
      </div>

      {/* *******  Testing with material UI library  ************

      <Card>
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            {props.cardDetails.title}
          </Typography>
        </CardContent>
        <CardActions>
          <input type={props.cardDetails.inputType} />
        </CardActions>
      </Card>
      */}
    </section>
  );
}

export default MetricCard;
