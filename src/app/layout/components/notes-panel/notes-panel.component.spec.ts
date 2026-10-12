import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Note } from '@app/core/models/note.model';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { NotesPanelComponent } from './notes-panel.component';

const NOTES: Note[] = [
    { oid: 'n-1', note_title: 'Call the supplier', note_text: 'About the late kurti batch', tags: ['supplier', 'important'], created_on: '2026-10-12T09:00:00.000', edited_on: null },
    { oid: 'n-2', note_title: null, note_text: 'Order courier bags\nTwo hundred, the large ones', tags: null, created_on: '2026-10-11T09:00:00.000', edited_on: null },
];

const open = async (notes: Note[] = NOTES) => {
    await TestBed.configureTestingModule({
        imports: [NotesPanelComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
    }).compileComponents();
    const fixture = TestBed.createComponent(NotesPanelComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_USER_NOTE_LIST)).flush({ code: 200, data: notes });
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http, element: fixture.nativeElement as HTMLElement };
};

const answer = (fixture: ComponentFixture<NotesPanelComponent>, yes = true) => vi.spyOn(fixture.debugElement.injector.get(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(yes) }) as unknown as NzModalRef);

describe('NotesPanelComponent', () => {
    it('lists the notes, heading a note with no title by its first line', async () => {
        const { element } = await open();
        const cards = [...element.querySelectorAll('[data-notes="card"]')].map((card) => card.textContent ?? '');
        expect(cards[0]).toContain('Call the supplier');
        expect(cards[1]).toContain('Order courier bags');
        expect(cards[1]).toContain('Two hundred, the large ones');
    });

    it('finds a note by any word in its title or text', async () => {
        const { page } = await open();
        page.query.set('KURTI');
        expect(page.visible().map((note) => note.oid)).toEqual(['n-1']);
        page.query.set('nothing like this');
        expect(page.visible()).toEqual([]);
    });

    it('says there are no notes yet, and what they are for', async () => {
        const { element } = await open([]);
        expect(element.querySelector('.sf-empty')?.textContent).toContain('shell.notes.empty');
    });

    it('saves a new note under the id it made, then reads the list again', async () => {
        const { page, http, fixture } = await open();
        page.startNew();
        fixture.detectChanges();
        expect(page.empty()).toBe(true);
        page.setText('  Ask about Eid stock  ');
        page.save();
        const sent = http.expectOne((r) => r.url.includes(APIEndpoint.CREATE_USER_NOTE));
        expect(sent.request.body).toEqual({ oid: page.draft()!.oid, note_title: null, note_text: 'Ask about Eid stock', tags: null });
        sent.flush({ code: 200, data: { oid: 'x' } });
        expect(page.draft()).toBeNull();
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_USER_NOTE_LIST)).flush({ code: 200, data: NOTES });
    });

    it('edits a note in place and keeps it open when the save fails', async () => {
        const { page, http } = await open();
        page.open(NOTES[0]);
        page.setTitle('Call the supplier today');
        page.save();
        http.expectOne((r) => r.url.includes(APIEndpoint.UPDATE_USER_NOTE)).flush({ code: 500 }, { status: 500, statusText: 'Server error' });
        expect(page.draft()?.title).toBe('Call the supplier today');
    });

    it('asks before leaving a changed note, and leaves an unchanged one at once', async () => {
        const { page, fixture } = await open();
        const confirm = answer(fixture, false);
        page.open(NOTES[0]);
        page.back();
        expect(page.draft()).toBeNull();
        expect(confirm).not.toHaveBeenCalled();
        page.open(NOTES[0]);
        page.setText('Changed');
        page.back();
        expect(confirm).toHaveBeenCalled();
        expect(page.draft()?.text).toBe('Changed');
    });

    it('deletes a note only after asking', async () => {
        const { page, http, fixture } = await open();
        answer(fixture);
        page.open(NOTES[1]);
        page.remove();
        http.expectOne((r) => r.url.includes(APIEndpoint.DELETE_USER_NOTE)).flush({ code: 200, data: { oid: 'n-2' } });
        expect(page.draft()).toBeNull();
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_USER_NOTE_LIST)).flush({ code: 200, data: [NOTES[0]] });
    });

    it('offers to try again when the notes cannot be loaded', async () => {
        await TestBed.configureTestingModule({ imports: [NotesPanelComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS] }).compileComponents();
        const fixture = TestBed.createComponent(NotesPanelComponent);
        const http = TestBed.inject(HttpTestingController);
        fixture.detectChanges();
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_USER_NOTE_LIST)).flush({ code: 500 }, { status: 500, statusText: 'Server error' });
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).querySelector('.sf-empty')?.textContent).toContain('shell.notes.loadFailed');
    });

    it('sends tags in the set\'s order, and none as nothing', async () => {
        const { page, http } = await open();
        page.open(NOTES[1]);
        page.toggleTag('payment');
        page.toggleTag('important');
        expect(page.changed()).toBe(true);
        page.save();
        expect(http.expectOne((r) => r.url.includes(APIEndpoint.UPDATE_USER_NOTE)).request.body.tags).toEqual(['important', 'payment']);
    });

    it('takes every tag off as null, and a tag toggled back is no change', async () => {
        const { page, http } = await open();
        page.open(NOTES[0]);
        page.toggleTag('supplier');
        page.toggleTag('supplier');
        expect(page.changed()).toBe(false);
        page.toggleTag('supplier');
        page.toggleTag('important');
        page.save();
        expect(http.expectOne((r) => r.url.includes(APIEndpoint.UPDATE_USER_NOTE)).request.body.tags).toBeNull();
    });

    it('filters by a tag the notes use, offers only those, and tapping it again shows every note', async () => {
        const { page } = await open();
        expect(page.usedTags()).toEqual(['important', 'supplier']);
        page.filterBy('supplier');
        expect(page.visible().map((note) => note.oid)).toEqual(['n-1']);
        page.filterBy('supplier');
        expect(page.visible().length).toBe(2);
    });

    it('shows a card\'s tags, and none on a note without', async () => {
        const { element } = await open();
        const cards = element.querySelectorAll('[data-notes="card"]');
        expect(cards[0].querySelectorAll('nz-tag').length).toBe(2);
        expect(cards[1].querySelectorAll('nz-tag').length).toBe(0);
    });
});
