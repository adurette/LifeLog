import { useState, useEffect } from "react";

import DateInput from "../components/DateInput";
import MetricCard from "../components/MetricCard";
import SaveDataButton from "../components/SaveDataButton";
import MetricsList from "../components/MetricsList";

import useMetrics from "../hooks/useMetrics";

import * as api from "../api";

import { exampleMetricCardDetails } from "../ExampleMetricCardData";

export function Home() {
  const { metrics, loading, error } = useMetrics();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [inputValues, setInputValues] = useState([]);

  // fetch metric data for current date on initial load
  useEffect(() => {
    fetchMetricData(date);
  }, []);

  const fetchMetricData = async (date) => {
    try {
      const responseData = await api.fetchData(date);
      // update each metric with the retrieved value for the new date
      console.log("Response data:", responseData);
      if (!Array.isArray(responseData)) {
        console.error("Invalid response data format, expected an array");
        throw new Error("Invalid response data format");
      }
      const data = responseData.map((item) => item.data);
      setInputValues(data);
    } catch (error) {
      console.error("Error fetching metric data:", error);
      alert(`Error: ${error}`);
    }
  };

  // retrieve data for given date when the date input changes
  const handleDateChange = async (date) => {
    setDate(date);
    console.log(`date: ${date}`);
    fetchMetricData(date);
  };

  // handle if a metric value changes
  const handleInputChange = (index, value) => {
    const updatedValues = [...inputValues];
    updatedValues[index] = value;
    setInputValues(updatedValues);
  };

  // saving metric data
  const handleSave = async () => {
    const dataToSend = metrics.map((metric, index) => ({
      id: metric.id,
      value: inputValues[index],
      date: date,
    }));

    console.log(`data to send: ${dataToSend}`);

    try {
      await api.saveData(dataToSend); // Call your save API method
      console.log("Metrics saved:", dataToSend);
    } catch (error) {
      console.error("Error saving metrics:", error);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error fetching metrics: {error.message}</p>;

  return (
    <>
      <h1>Home page</h1>
      <DateInput value={date} onDateChange={handleDateChange} />

      {/* Display each metric card */}
      {/* 
      {exampleMetricCardDetails.map((cardDetail) => (
        <MetricCard
          key={cardDetail.id}
          id={cardDetail.id}
          title={cardDetail.title}
          inputType={cardDetail.inputType}
        />
      ))}

      <button onClick={api.fetchMetrics}>Load Metrics</button>
      */}

      <MetricsList
        metrics={metrics} // Pass down metrics
        inputValues={inputValues} // Pass down current input values for each metric
        onInputChange={handleInputChange}
        //setMetricIds={setMetricIds}
      />

      <SaveDataButton onClick={handleSave} />
    </>
  );
}
