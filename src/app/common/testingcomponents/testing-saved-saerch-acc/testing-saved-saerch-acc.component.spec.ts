import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestingSavedSaerchAccComponent } from './testing-saved-saerch-acc.component';

describe('TestingSavedSaerchAccComponent', () => {
  let component: TestingSavedSaerchAccComponent;
  let fixture: ComponentFixture<TestingSavedSaerchAccComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestingSavedSaerchAccComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestingSavedSaerchAccComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
