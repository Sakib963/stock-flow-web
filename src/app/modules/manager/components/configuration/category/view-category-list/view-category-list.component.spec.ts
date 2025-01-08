import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewCategoryListComponent } from './view-category-list.component';

describe('ViewCategoryListComponent', () => {
  let component: ViewCategoryListComponent;
  let fixture: ComponentFixture<ViewCategoryListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ViewCategoryListComponent]
    });
    fixture = TestBed.createComponent(ViewCategoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
