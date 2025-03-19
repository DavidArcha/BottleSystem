import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavedGroupAccordionComponent } from './saved-group-accordion.component';

describe('SavedGroupAccordionComponent', () => {
  let component: SavedGroupAccordionComponent;
  let fixture: ComponentFixture<SavedGroupAccordionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SavedGroupAccordionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SavedGroupAccordionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
