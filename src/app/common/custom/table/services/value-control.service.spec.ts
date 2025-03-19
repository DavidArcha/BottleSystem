import { TestBed } from '@angular/core/testing';

import { ValueControlService } from './value-control.service';

describe('ValueControlService', () => {
  let service: ValueControlService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ValueControlService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
