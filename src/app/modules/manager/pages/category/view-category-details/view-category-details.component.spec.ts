import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewCategoryDetailsComponent } from './view-category-details.component';

describe('ViewCategoryDetailsComponent', () => {
  let component: ViewCategoryDetailsComponent;
  let fixture: ComponentFixture<ViewCategoryDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ViewCategoryDetailsComponent]
    });
    fixture = TestBed.createComponent(ViewCategoryDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
