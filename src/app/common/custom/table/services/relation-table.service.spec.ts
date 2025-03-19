import { TestBed } from '@angular/core/testing';

import { RelationTableService } from './relation-table.service';

describe('RelationTableService', () => {
  let service: RelationTableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RelationTableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
