import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

// From: https://v5.reactrouter.com/web/example/query-parameters
// A custom hook that builds on useLocation to parse
// the query string for you.
export function useQuery() {
  const { search } = useLocation();

  return useMemo(() => new URLSearchParams(search), [search]);
}
