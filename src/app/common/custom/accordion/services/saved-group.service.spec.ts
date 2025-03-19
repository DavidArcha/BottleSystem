import { TestBed } from '@angular/core/testing';

import { SavedGroupService } from './saved-group.service';

describe('SavedGroupService', () => {
  let service: SavedGroupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SavedGroupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
