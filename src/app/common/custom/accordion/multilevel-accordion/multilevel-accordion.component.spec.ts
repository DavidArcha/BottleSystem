import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultilevelAccordionComponent } from './multilevel-accordion.component';

describe('MultilevelAccordionComponent', () => {
  let component: MultilevelAccordionComponent;
  let fixture: ComponentFixture<MultilevelAccordionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MultilevelAccordionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultilevelAccordionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
