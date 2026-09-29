import { renderHook, act } from '@testing-library/react';
import { useSearch } from '../hooks/useSearch';
import { useSearchStore } from '@/store/searchStore';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/store/persistence', () => ({
  useHasHydrated: () => true,
}));

describe('useSearch', () => {
  let mockRouterReplace: jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    useSearchStore.setState({
      query: '',
      filters: {},
      results: [],
      loading: false,
      error: null,
      isFallback: false,
      hasHydrated: true,
    });
    
    mockRouterReplace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ replace: mockRouterReplace });
    (usePathname as jest.Mock).mockReturnValue('/marketplace');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
  });

  it('initializes from URL params', () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('?q=crypto&category=DeFi&verified=true'));
    
    renderHook(() => useSearch());
    
    const state = useSearchStore.getState();
    expect(state.query).toBe('crypto');
    expect(state.filters.category).toBe('DeFi');
    expect(state.filters.verified).toBe('true');
  });

  it('updates URL when query or filters change', () => {
    const { result } = renderHook(() => useSearch());
    
    act(() => {
      result.current.setQuery('AI agents');
    });

    expect(mockRouterReplace).toHaveBeenCalledWith('/marketplace?q=AI+agents', { scroll: false });

    act(() => {
      result.current.setFilters({ category: 'NFT', minPrice: 100 });
    });

    expect(mockRouterReplace).toHaveBeenCalledWith('/marketplace?q=AI+agents&category=NFT&minPrice=100', { scroll: false });
  });

  it('triggers search after debounce', () => {
    jest.useFakeTimers();
    
    const mockFetch = jest.spyOn(useSearchStore.getState(), 'fetchSearchResults').mockResolvedValue();
    const { result } = renderHook(() => useSearch());
    
    act(() => {
      result.current.setQuery('test search');
    });

    expect(mockFetch).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(300);
    
    expect(mockFetch).toHaveBeenCalledWith({
      query: 'test search',
      filters: {}
    });

    jest.useRealTimers();
  });
});
