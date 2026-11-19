import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../utils/api';

/**
 * Fetches JSON from the API whenever the URL changes.
 * Returns the whole response body ({ status, data, pagination }) as `data`.
 * Pass null as the url to skip fetching.
 */
const useFetchData = (url, initialData = null) => {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(url));
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!url) return undefined;
    let ignore = false; // ignore responses for an old URL that arrive late

    setIsLoading(true);
    api
      .get(url)
      .then((res) => {
        if (ignore) return;
        setData(res.data);
        setError(null);
      })
      .catch((err) => {
        if (ignore) return;
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [url, reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return { data, error, isLoading, refetch, setData };
};

export default useFetchData;
