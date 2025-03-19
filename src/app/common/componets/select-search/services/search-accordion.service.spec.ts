import { TestBed } from '@angular/core/testing';

import { SearchAccordionService } from './search-accordion.service';

describe('SearchAccordionService', () => {
  let service: SearchAccordionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchAccordionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
