import { useState, useEffect } from "react";
import EditMetricCard from "../components/EditMetricCard";
import AddMetricCard from "../components/AddMetricCard";
import useMetrics from "../hooks/useMetrics";
import * as api from "../api";

export function Edit() {
  const { metrics, loading, error } = useMetrics();

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error fetching metrics: {error.message}</p>;

  return (
    <>
      <h1>Edit page</h1>
      <div>
        {metrics.map((metric, index) => (
          <EditMetricCard
            key={metric.id}
            id={metric.id}
            currentTitle={metric.title}
            currentInputType={metric.input_type}
          />
        ))}
      </div>
      <AddMetricCard onClick={api.addMetric} />
    </>
  );
}
