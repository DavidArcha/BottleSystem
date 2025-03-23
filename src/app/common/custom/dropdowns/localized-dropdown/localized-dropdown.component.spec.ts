import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocalizedDropdownComponent } from './localized-dropdown.component';

describe('LocalizedDropdownComponent', () => {
  let component: LocalizedDropdownComponent;
  let fixture: ComponentFixture<LocalizedDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LocalizedDropdownComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocalizedDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
