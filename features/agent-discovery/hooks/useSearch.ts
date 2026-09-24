import { useEffect } from "react";
import { useSearchStore } from "@/store/searchStore";

export const useSearch = (initialQuery = "", initialFilters = {}) => {
  const { query, filters, results, loading, error, setQuery, setFilters, fetchSearchResults } =
    useSearchStore();

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
    if (Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters as Record<string, string | number | boolean>);
    }
  }, [initialFilters, initialQuery, setFilters, setQuery]);

  useEffect(() => {
    const debouncedSearch = window.setTimeout(() => {
      void fetchSearchResults({ query, filters });
    }, 300);

    return () => {
      window.clearTimeout(debouncedSearch);
    };
  }, [fetchSearchResults, filters, query]);

  return { query, setQuery, filters, setFilters, results, loading, error };
};
