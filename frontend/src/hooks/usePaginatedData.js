import { useState, useCallback } from 'react';
import { toast } from '../toast.js';

/**
 * Manages paginated data fetching boilerplate: rows, total, pages, page,
 * loading, and a loading-wrapped fetch function.
 *
 * @param {(page: number) => Promise<{ rows: any[], total: number, pages: number }>} fetchFn
 *   A stable callback (wrap in useCallback) that fetches one page of data.
 *   When fetchFn identity changes (filters changed), reset page to 1 in the
 *   caller so the effect re-fires with the right page number.
 *
 * @returns {{ rows, total, pages, page, setPage, loading, fetch }}
 */
export function usePaginatedData(fetchFn) {
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async (p) => {
    setLoading(true);
    try {
      const data = await fetchFn(p);
      setRows(data.rows);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  return { rows, setRows, total, pages, page, setPage, loading, fetch };
}
