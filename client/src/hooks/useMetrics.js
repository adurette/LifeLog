// Custom hook to handle the metrics state

import { useEffect, useState } from 'react';
import * as api from '../api';

const useMetrics = () => {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await api.fetchMetrics();
        setMetrics(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return { metrics, loading, error };
};

export default useMetrics;
