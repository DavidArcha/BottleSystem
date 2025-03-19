import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelationTableComponent } from './relation-table.component';

describe('RelationTableComponent', () => {
  let component: RelationTableComponent;
  let fixture: ComponentFixture<RelationTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RelationTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RelationTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
