import { TestBed } from '@angular/core/testing';

import { CustomAccordionService } from './custom-accordion.service';

describe('CustomAccordionService', () => {
  let service: CustomAccordionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomAccordionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
