// Date Input Component
// User can select which date they would like to save/edit their data for.

import React, { useState } from "react";
import "./DateInputStyle.css";

function DateInput({ value, onDateChange }) {
  // set initial date value to today's date
  //const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const handleChange = (event) => {
    onDateChange(event.target.value);
  };

  return (
    <div className="dateContainer">
      <form id="date-form">
        <label htmlFor="date">Date to log:</label>
        <input
          type="date"
          id="date"
          name="date"
          value={value}
          onChange={handleChange}
        />
      </form>
    </div>
  );
}

export default DateInput;
