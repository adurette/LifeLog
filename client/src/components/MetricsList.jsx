import React from "react";
import MetricCard from "./MetricCard";

function MetricsList({ metrics, inputValues, onInputChange }) {
  return (
    <div>
      {metrics.map((metric, index) => (
        <MetricCard
          key={metric.id}
          id={metric.id}
          title={metric.title}
          inputType={metric.input_type}
          value={inputValues[index]} // Pass current input value
          onInputChange={(value) => onInputChange(index, value)} // Pass handler
        />
      ))}
    </div>
  );
}

export default MetricsList;
