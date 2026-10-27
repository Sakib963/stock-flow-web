import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { ServerSearch } from './server-search';

interface Row {
    value: string;
    label: string;
}

const row = (i: number): Row => ({ value: `r-${i}`, label: `Row ${i}` });
const rows = (from: number, count: number): Row[] => Array.from({ length: count }, (_, i) => row(from + i));

/** A fake server: every ask is recorded and answered by hand, in any order. */
const server = () => {
    const asks: { term: string; offset: number; answer: Subject<Row[]> }[] = [];
    const fetch = (term: string, offset: number): Observable<Row[]> => {
        const answer = new Subject<Row[]>();
        asks.push({ term, offset, answer });
        return answer;
    };
    const reply = (ask: { answer: Subject<Row[]> }, data: Row[]) => {
        ask.answer.next(data);
        ask.answer.complete();
    };
    const fail = (ask: { answer: Subject<Row[]> }) => ask.answer.error(new Error('down'));
    return { asks, fetch, reply, fail };
};

describe('ServerSearch', () => {
    let fake: ReturnType<typeof server>;
    let picker: ServerSearch<Row>;

    beforeEach(() => {
        vi.useFakeTimers();
        fake = server();
        picker = TestBed.runInInjectionContext(() => new ServerSearch<Row>(fake.fetch, TestBed.inject(DestroyRef)));
    });

    afterEach(() => vi.useRealTimers());

    it('opens on the first fifty, brings the next fifty on scroll, and stops after a short page', () => {
        picker.start();
        fake.reply(fake.asks[0], rows(0, 50));

        picker.more();
        expect(fake.asks[1].offset).toBe(50);
        fake.reply(fake.asks[1], rows(50, 3));
        expect(picker.choices()).toHaveLength(53);

        picker.more();
        expect(fake.asks).toHaveLength(2);
    });

    it('shows it is searching from the first keystroke, asks once typing pauses, and an older answer cannot end it', () => {
        picker.start();
        picker.search('sil');
        fake.reply(fake.asks[0], rows(0, 50));
        expect(picker.loading()).toBe(true);
        expect(fake.asks).toHaveLength(1);

        vi.advanceTimersByTime(300);
        expect(fake.asks[1].term).toBe('sil');
        fake.reply(fake.asks[1], [row(7)]);
        expect(picker.loading()).toBe(false);
        expect(picker.choices()).toEqual([row(7)]);
    });

    it('drops a slower answer to an older search', () => {
        picker.start();
        picker.search('silk');
        vi.advanceTimersByTime(300);
        fake.reply(fake.asks[0], rows(0, 50));

        fake.reply(fake.asks[1], [row(1)]);
        expect(picker.choices()).toEqual([row(1)]);
    });

    it('lists the held choice only while nothing is typed, so a search can find nothing', () => {
        picker.hold(row(99));
        picker.start();
        fake.reply(fake.asks[0], [row(1)]);
        expect(picker.choices()).toEqual([row(99), row(1)]);

        picker.search('zzz');
        vi.advanceTimersByTime(300);
        fake.reply(fake.asks[1], []);
        expect(picker.choices()).toEqual([]);
    });

    it('says a search failed and Try again asks for the same words', () => {
        picker.search('garm');
        vi.advanceTimersByTime(300);
        fake.fail(fake.asks[0]);
        expect(picker.failed()).toBe(true);
        expect(picker.loading()).toBe(false);

        picker.retry();
        expect(fake.asks[1].term).toBe('garm');
        fake.reply(fake.asks[1], [row(1)]);
        expect(picker.failed()).toBe(false);
    });

    it('asks for a failed next page again when scrolled again, keeping what was shown', () => {
        picker.start();
        fake.reply(fake.asks[0], rows(0, 50));
        picker.more();
        fake.fail(fake.asks[1]);
        expect(picker.choices()).toHaveLength(50);
        expect(picker.failed()).toBe(false);

        picker.more();
        expect(fake.asks[2].offset).toBe(50);
    });

    it('reopens on the first page after a search, since the search box opens empty', () => {
        picker.search('silk');
        vi.advanceTimersByTime(300);
        fake.reply(fake.asks[0], [row(1)]);

        picker.opened(true);
        expect(fake.asks[1].term).toBe('');
    });
});
