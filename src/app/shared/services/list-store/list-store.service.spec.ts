import { LIST_TIMING } from '@app/shared/constants/list-timing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ListStore } from '@app/shared/services/list-store/list-store.service';

const ROWS = [
    { oid: 'c-1', name: 'Saree' },
    { oid: 'c-2', name: 'Kurti' },
];

describe('ListStore', () => {
    let http: HttpTestingController;
    let store: ListStore;

    beforeEach(() => {
        vi.useFakeTimers();
        sessionStorage.clear();
        TestBed.configureTestingModule({ providers: [ListStore, provideHttpClient(), provideHttpClientTesting()] });
        http = TestBed.inject(HttpTestingController);
        store = TestBed.inject(ListStore);
    });

    afterEach(() => {
        http.verify();
        vi.useRealTimers();
    });

    const pending = () => http.match((r) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST));
    const answer = (request: TestRequest, rows: object[] = ROWS, total = rows.length) => request.flush({ code: 200, message: 'ok', data: { rows }, total });

    function start() {
        store.configure({ source: { endpoint: APIEndpoint.GET_CATEGORY_LIST, params: { status: 'Active' } }, pageSize: 20 });
        vi.advanceTimersByTime(0);
    }

    async function loaded() {
        start();
        answer(pending()[0]);
        await vi.advanceTimersByTimeAsync(400);
    }

    it('asks for the first page straight away, with its fixed params', () => {
        start();
        const [request] = pending();

        expect(request.request.params.get('offset')).toBe('0');
        expect(request.request.params.get('limit')).toBe('20');
        expect(request.request.params.get('status')).toBe('Active');
        answer(request);
    });

    it('shows loading from the first frame, before any request has gone out', () => {
        expect(store.state()).toBe('loading');
    });

    it('keeps a fast response behind the loading state for 400ms, so it never flashes', async () => {
        start();
        answer(pending()[0]);

        await vi.advanceTimersByTimeAsync(399);
        expect(store.state()).toBe('loading');

        await vi.advanceTimersByTimeAsync(1);
        expect(store.state()).toBe('data');
        expect(store.rows()).toEqual(ROWS);
        expect(store.total()).toBe(2);
    });

    it('sends one request for "Rahim" when someone types, pauses briefly, and types on', async () => {
        await loaded();

        store.setSearch('Ra');
        vi.advanceTimersByTime(200);
        store.setSearch('Rahim');
        vi.advanceTimersByTime(LIST_TIMING.searchDebounceMs - 1);
        expect(pending().length).toBe(0);

        vi.advanceTimersByTime(1);
        const requests = pending();
        expect(requests.length).toBe(1);
        expect(requests[0].request.params.get('search')).toBe('Rahim');
        answer(requests[0]);
        await vi.advanceTimersByTimeAsync(400);
    });

    it('drops a slow page 2 when page 3 is asked for, so page 3 is what shows', async () => {
        await loaded();

        store.setPage(2);
        vi.advanceTimersByTime(150);
        const [slow] = pending();
        store.setPage(3);
        vi.advanceTimersByTime(150);

        expect(slow.cancelled).toBe(true);
        const [fast] = pending();
        expect(fast.request.params.get('offset')).toBe('40');
        answer(fast, [{ oid: 'c-41', name: 'Panjabi' }], 60);
        await vi.advanceTimersByTimeAsync(400);
        expect(store.rows()).toEqual([{ oid: 'c-41', name: 'Panjabi' }]);
    });

    it('dims the rows it has during a refetch instead of emptying them', async () => {
        await loaded();

        store.setSort({ key: 'name', order: 'desc' });
        vi.advanceTimersByTime(150);

        expect(store.state()).toBe('refreshing');
        expect(store.rows()).toEqual(ROWS);
        const [request] = pending();
        expect(request.request.params.get('sort')).toBe('name');
        expect(request.request.params.get('order')).toBe('desc');
        answer(request);
        await vi.advanceTimersByTimeAsync(400);
    });

    it('tells "nothing yet" from "nothing matching"', async () => {
        start();
        answer(pending()[0], []);
        await vi.advanceTimersByTimeAsync(400);
        expect(store.state()).toBe('empty');

        store.setFilters({ status: 'Inactive' });
        vi.advanceTimersByTime(150);
        answer(pending()[0], []);
        await vi.advanceTimersByTimeAsync(400);
        expect(store.state()).toBe('no-match');
    });

    it('tells a refusal, a network failure and a server fault apart', async () => {
        start();
        pending()[0].flush({}, { status: 403, statusText: 'Forbidden' });
        await vi.advanceTimersByTimeAsync(400);
        expect(store.state()).toBe('error');
        expect(store.failure()).toBe('forbidden');

        store.retry();
        vi.advanceTimersByTime(0);
        pending()[0].error(new ProgressEvent('error'), { status: 0 });
        await vi.advanceTimersByTimeAsync(400);
        expect(store.failure()).toBe('network');

        store.retry();
        vi.advanceTimersByTime(0);
        pending()[0].flush({}, { status: 500, statusText: 'Server Error' });
        await vi.advanceTimersByTimeAsync(400);
        expect(store.failure()).toBe('server');
    });

    it('keeps the page and filters after a failure, so a retry asks for the same thing', async () => {
        await loaded();
        store.setFilters({ status: 'Inactive' });
        store.setPage(2);
        vi.advanceTimersByTime(150);
        pending()[0].flush({}, { status: 500, statusText: 'Server Error' });
        await vi.advanceTimersByTimeAsync(400);

        store.retry();
        vi.advanceTimersByTime(0);
        const [request] = pending();
        expect(request.request.params.get('offset')).toBe('20');
        expect(request.request.params.get('status')).toBe('Inactive');
        answer(request, ROWS, 22);
        await vi.advanceTimersByTimeAsync(400);
    });

    it('reads an endpoint that still answers data as a plain array', async () => {
        start();
        pending()[0].flush({ code: 200, message: 'ok', data: ROWS, total: 2 });
        await vi.advanceTimersByTimeAsync(400);

        expect(store.rows()).toEqual(ROWS);
    });

    it('opens where it was left, without any of it reaching the URL', async () => {
        const where = window.location.href;
        store.configure({ key: 'test.list', source: { endpoint: APIEndpoint.GET_CATEGORY_LIST }, pageSize: 20 });
        vi.advanceTimersByTime(0);
        answer(pending()[0]);
        await vi.advanceTimersByTimeAsync(400);

        store.setFilters({ status: 'Inactive' });
        store.setSize(50);
        store.setSort({ key: 'name', order: 'desc' });
        store.setPage(3);
        vi.advanceTimersByTime(150);
        answer(pending()[0], ROWS, 200);
        await vi.advanceTimersByTimeAsync(400);

        expect(window.location.href).toBe(where);

        // A reload, or the way back from a record: a second store over the same table key.
        const next = TestBed.runInInjectionContext(() => new ListStore());
        next.configure({ key: 'test.list', source: { endpoint: APIEndpoint.GET_CATEGORY_LIST }, pageSize: 20 });
        vi.advanceTimersByTime(0);

        const [request] = pending();
        expect(request.request.params.get('offset')).toBe('100');
        expect(request.request.params.get('limit')).toBe('50');
        expect(request.request.params.get('sort')).toBe('name');
        expect(request.request.params.get('order')).toBe('desc');
        expect(request.request.params.get('status')).toBe('Inactive');
        answer(request, ROWS, 200);
        await vi.advanceTimersByTimeAsync(400);
    });

    it('forgets a remembered sort the server now refuses, rather than leaving the tab stuck on it', async () => {
        sessionStorage.setItem('sf.list.test.list', JSON.stringify({ page: 2, size: 20, sort: { key: 'gone', order: 'asc' }, search: '', filters: {} }));
        store.configure({ key: 'test.list', source: { endpoint: APIEndpoint.GET_CATEGORY_LIST }, pageSize: 20 });
        vi.advanceTimersByTime(0);

        pending()[0].flush({ code: 400, message: 'bad' }, { status: 400, statusText: 'Bad Request' });
        await vi.advanceTimersByTimeAsync(401);

        const [retried] = pending();
        expect(retried.request.params.has('sort')).toBe(false);
        expect(retried.request.params.get('offset')).toBe('0');
        answer(retried);
        await vi.advanceTimersByTimeAsync(400);

        expect(store.state()).toBe('data');
        expect(sessionStorage.getItem('sf.list.test.list')).toBeNull();
    });

    it('starts a table that names no key at its config position, remembering nothing', async () => {
        sessionStorage.setItem('sf.list.test.list', JSON.stringify({ page: 4, size: 50, sort: null, search: 'sar', filters: {} }));
        await loaded();

        expect(store.page()).toBe(1);
        expect(store.search()).toBe('');
    });

    it('steps back to the last page when a filter leaves the current one past the end', async () => {
        await loaded();
        store.setPage(5);
        vi.advanceTimersByTime(150);
        answer(pending()[0], [], 30);
        await vi.advanceTimersByTimeAsync(400);

        expect(store.page()).toBe(2);
        await vi.advanceTimersByTimeAsync(1);
        const [request] = pending();
        expect(request.request.params.get('offset')).toBe('20');
        answer(request, ROWS, 30);
        await vi.advanceTimersByTimeAsync(400);
    });
});
