import { TestBed } from '@angular/core/testing';

import { SavedGroupStateService } from './saved-group-state.service';

describe('SavedGroupStateService', () => {
  let service: SavedGroupStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SavedGroupStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
