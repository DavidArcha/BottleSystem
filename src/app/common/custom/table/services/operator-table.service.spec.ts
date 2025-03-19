import { TestBed } from '@angular/core/testing';

import { OperatorTableService } from './operator-table.service';

describe('OperatorTableService', () => {
  let service: OperatorTableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OperatorTableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
