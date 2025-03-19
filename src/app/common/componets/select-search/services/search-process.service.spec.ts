import { TestBed } from '@angular/core/testing';

import { SearchProcessService } from './search-process.service';

describe('SearchProcessService', () => {
  let service: SearchProcessService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchProcessService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
