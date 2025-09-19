
import { useState, useEffect, useCallback } from 'react';

export default function useFetch(path, options = {}, auto = true) {
  const apiUrl = import.meta.env.VITE_API_URL;
  const url = apiUrl + path;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(auto);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (body = null, customOptions = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        ...options,
        ...customOptions,
        body: body ? JSON.stringify(body) : options.body,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
          ...(customOptions.headers || {})
        }
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error en la petición');
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    if (auto && options.method === 'GET') fetchData();
  }, [fetchData, auto, options.method]);

  return { data, loading, error, fetchData };
}