import { useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useHasHydrated } from "@/store/persistence";
import { useSearchStore } from "@/store/searchStore";

export const useSearch = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const { query, filters, results, loading, error, isFallback, setQuery, setFilters, fetchSearchResults } = useSearchStore();
  const hasHydrated = useHasHydrated(useSearchStore);

  // Read initial params from URL on mount
  useEffect(() => {
    if (!hasHydrated) return;
    
    const urlQuery = searchParams.get('q') || '';
    const category = searchParams.get('category') || 'All';
    const network = searchParams.get('network') || 'All';
    const verified = searchParams.get('verified') || '';
    const minRating = searchParams.get('minRating') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';

    setQuery(urlQuery);
    setFilters({ category, network, verified, minRating, minPrice, maxPrice });
  }, [hasHydrated]); // Run once on hydration

  // Update URL and fetch when state changes
  useEffect(() => {
    if (!hasHydrated) return;

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters.category && filters.category !== 'All') params.set('category', String(filters.category));
    if (filters.network && filters.network !== 'All') params.set('network', String(filters.network));
    if (filters.verified !== undefined && filters.verified !== '') params.set('verified', String(filters.verified));
    if (filters.minRating) params.set('minRating', String(filters.minRating));
    if (filters.minPrice) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));

    const currentQuery = params.toString();
    const newUrl = `${pathname}${currentQuery ? `?${currentQuery}` : ''}`;
    
    // Replace URL without reload
    router.replace(newUrl, { scroll: false });

    // Fetch results
    const debouncedSearch = window.setTimeout(() => {
      void fetchSearchResults({ query, filters });
    }, 300);

    return () => {
      window.clearTimeout(debouncedSearch);
    };
  }, [fetchSearchResults, filters, hasHydrated, query, pathname, router]);

  return { query, setQuery, filters, setFilters, results, loading, error, isFallback };
};
