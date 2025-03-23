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

  // State subjects
  private showGroupDataOutsideSubject = new BehaviorSubject<boolean>(false);
  private selectedSystemTypeValueSubject = new BehaviorSubject<DropdownItem | DropdownItem[] | null>(null);
  private savedGroupFieldsSubject = new BehaviorSubject<SearchRequest[]>([]);

  // Public observables
  public showGroupDataOutside$ = this.showGroupDataOutsideSubject.asObservable();
  public selectedSystemTypeValue$ = this.selectedSystemTypeValueSubject.asObservable();
  public savedGroupFields$ = this.savedGroupFieldsSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.loadStateFromStorage();
  }

  /**
   * Load all state from storage
   */
  private loadStateFromStorage(): void {
   // First load the showGroupDataOutside preference
   const showGroupData = this.storageService.getBoolPreference('showGroupDataOutside', false);
   this.showGroupDataOutsideSubject.next(showGroupData);
   
   // Always load selected system type values, as they're needed for basic functionality
   this.loadSelectedSystemTypeValues();
   
   // Only load saved group fields if showGroupDataOutside is true
   if (showGroupData) {
     this.loadSavedGroupFields();
   }
  }

  /**
   * Load selected system type values
   */
  private loadSelectedSystemTypeValues(): void {
    const savedValue = this.storageService.getItem('selectedSystemTypeValues');
    if (!savedValue) return;

    try {
      this.selectedSystemTypeValueSubject.next(JSON.parse(savedValue));
    } catch {
      this.selectedSystemTypeValueSubject.next(null);
    }
  }

  /**
   * Load saved group fields from storage
   */
  private loadSavedGroupFields(): void {
    const savedGroups = this.storageService.getObject<SearchRequest[]>('savedGroupFields');
    console.log('Loaded saved groups from storage:', savedGroups);
    if (savedGroups) {
      this.savedGroupFieldsSubject.next(savedGroups);
    }
  }


  /**
   * Set show group data outside preference
   */
  setShowGroupDataOutside(value: boolean): void {
    this.showGroupDataOutsideSubject.next(value);
    this.storageService.setBoolPreference('showGroupDataOutside', value);
  }

  /**
   * Get current show group data outside preference
   */
  getShowGroupDataOutside(): boolean {
    return this.showGroupDataOutsideSubject.getValue();
  }

  /**
   * Get saved group fields
   */
  getSavedGroupFields(): SearchRequest[] {
    return this.savedGroupFieldsSubject.getValue();
  }

  /**
   * Set saved group fields
   */
  setSavedGroupFields(groups: SearchRequest[]): void {
    this.savedGroupFieldsSubject.next(groups);
    this.storageService.setObject('savedGroupFields', groups);
  }

  /**
   * Set selected system type value
   */
  setSelectedSystemTypeValue(value: DropdownItem | DropdownItem[] | null): void {
    this.selectedSystemTypeValueSubject.next(value);
    this.saveSelectedSystemTypeValues(value);
  }

  /**
   * Get current selected system type value
   */
  getSelectedSystemTypeValue(): DropdownItem | DropdownItem[] | null {
    return this.selectedSystemTypeValueSubject.getValue();
  }

  /**
   * Save selected system type values to storage
   */
  private saveSelectedSystemTypeValues(value: DropdownItem | DropdownItem[] | null): void {
    if (value === null) {
      this.storageService.removeItem('selectedSystemTypeValues');
      return;
    }

    try {
      this.storageService.setItem('selectedSystemTypeValues', JSON.stringify(value));
    } catch {
      // Silent error handling - state maintained in memory
    }
  }

  /**
    * Reset all application state
    */
  resetAllState(): void {
    // Reset system type selection
    this.setSelectedSystemTypeValue(null);

    // Reset saved group fields
    this.setSavedGroupFields([]);

    // Clear storage
    this.storageService.removeItem('selectedSystemTypeValues');
    this.storageService.removeItem('savedAccordionState');
    this.storageService.removeItem('selectedFields');
    this.storageService.removeItem('savedGroupFields');

    // Clear accordion-related local storage items
    this.clearAccordionStorage();
  }

  /**
   * Clear accordion storage items
   */
  private clearAccordionStorage(): void {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && this.isAccordionKey(key)) {
        localStorage.removeItem(key);
      }
    }
  }

  /**
   * Check if a key is related to accordion state
   */
  private isAccordionKey(key: string): boolean {
    return key.startsWith('accordion-') ||
      key.includes('-system-') ||
      key.includes('-first-');
  }

  /**
   * Cleanup resources
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
