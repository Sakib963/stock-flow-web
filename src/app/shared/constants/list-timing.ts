/**
 * How every list paces its requests, in one place so tuning one number tunes every list.
 * Contract: stock-flow-documents/docs/list-page/list-page.md, REQ-14 and REQ-15.
 */
export const LIST_TIMING = {
    /** Quiet time after the last key before a search is sent. */
    searchDebounceMs: 500,
    /** Page, size, sort, a filter or a chip: rapid changes collapse into one request. */
    triggerDebounceMs: 150,
    /** Once shown, a loading state stays this long, so a fast response never flashes. */
    minLoadingMs: 400,
} as const;

export const LIST_DEFAULT_PAGE_SIZE = { default: 20, options: [10, 20, 50, 100] } as const;
