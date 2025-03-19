import { TestBed } from '@angular/core/testing';

import { DropdownDataService } from './dropdown-data.service';

describe('DropdownDataService', () => {
  let service: DropdownDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DropdownDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
