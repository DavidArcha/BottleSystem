import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { DropdownItem } from '../../../interfaces/table-dropdown.interface';
import { SearchRequest } from '../../../interfaces/search-request.interface';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class StateManagementService {
  private destroy$ = new Subject<void>();

  // Group data display state
  private showGroupDataOutsideSubject = new BehaviorSubject<boolean>(false);
  public showGroupDataOutside$ = this.showGroupDataOutsideSubject.asObservable();

  // Selected system type value
  private selectedSystemTypeValueSubject = new BehaviorSubject<DropdownItem | DropdownItem[] | null>(null);
  public selectedSystemTypeValue$ = this.selectedSystemTypeValueSubject.asObservable();

  // Saved group fields
  private savedGroupFieldsSubject = new BehaviorSubject<SearchRequest[]>([]);
  public savedGroupFields$ = this.savedGroupFieldsSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.loadStateFromStorage();
  }


  /**
   * Loads all state values from storage
   */
  private loadStateFromStorage(): void {
    this.loadShowGroupDataOutsideFromStorage();
    this.loadSelectedSystemTypeValuesFromStorage();
  }

  /**
   * Loads group data display preference from storage
   */
  private loadShowGroupDataOutsideFromStorage(): void {
    const stored = this.storageService.getBoolPreference('showGroupDataOutside', false);
    this.showGroupDataOutsideSubject.next(stored);
  }

  /**
   * Loads selected system type values from storage
   */
  private loadSelectedSystemTypeValuesFromStorage(): void {
    const savedValue = this.storageService.getItem('selectedSystemTypeValues');
    if (savedValue) {
      try {
        const parsedValue = JSON.parse(savedValue);
        this.selectedSystemTypeValueSubject.next(parsedValue);
      } catch (e) {
        // Reset to default on error
        this.selectedSystemTypeValueSubject.next(null);
      }
    }
  }


  /**
   * Updates group data display preference
   */
  setShowGroupDataOutside(value: boolean): void {
    this.showGroupDataOutsideSubject.next(value);
    this.storageService.setBoolPreference('showGroupDataOutside', value);
  }

  /**
   * Gets current group data display preference
   */
  getShowGroupDataOutside(): boolean {
    return this.showGroupDataOutsideSubject.getValue();
  }

  /**
   * Updates selected system type value
   */
  setSelectedSystemTypeValue(value: DropdownItem | DropdownItem[] | null): void {
    this.selectedSystemTypeValueSubject.next(value);
    this.saveSelectedSystemTypeValuesToStorage(value);
  }

  /**
   * Gets current selected system type value
   */
  getSelectedSystemTypeValue(): DropdownItem | DropdownItem[] | null {
    return this.selectedSystemTypeValueSubject.getValue();
  }

  /**
   * Saves selected system type values to storage
   */
  private saveSelectedSystemTypeValuesToStorage(value: DropdownItem | DropdownItem[] | null): void {
    try {
      if (value === null) {
        this.storageService.removeItem('selectedSystemTypeValues');
      } else {
        const jsonValue = JSON.stringify(value);
        this.storageService.setItem('selectedSystemTypeValues', jsonValue);
      }
    } catch (error) {
      // Handle error silently - state is still maintained in memory
    }
  }




  /**
   * Resets all application state to default values
   * Used for the "Clear" operation
   */
  resetAllState(): void {
    // Reset system type selection
    this.setSelectedSystemTypeValue(null);

    // Don't reset group data display preference as it's a UI setting
    // Don't reset saved group fields as they should persist

    // Clear storage items for complete reset across page refreshes
    this.storageService.removeItem('selectedSystemTypeValues');
    this.storageService.removeItem('savedAccordionState');

    // Clear selection-related storage
    this.storageService.removeItem('selectedFields');

    // Find and clear any accordion localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('accordion-') ||
        key.includes('-system-') ||
        key.includes('-first-')
      )) {
        localStorage.removeItem(key);
      }
    }
  }
  /**
   * Clean up resources when service is destroyed
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
