import { Injectable } from '@angular/core';
import { DropdownItem } from '../../../interfaces/table-dropdown.interface';
import { BehaviorSubject, catchError, finalize, Observable, of } from 'rxjs';
import { SearchService } from '../../../services/search.service';
import { SelectedField } from '../../../interfaces/selectedFields.interface';

@Injectable({
  providedIn: 'root'
})
export class RelationTableService {
  private systemTypeDataSubject = new BehaviorSubject<DropdownItem[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string>('');

  public systemTypeData$ = this.systemTypeDataSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(private searchService: SearchService) { }

  /**
   * Load system type fields by language
   */
  loadSystemTypeFields(lang: string): Observable<DropdownItem[]> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next('');

    return this.searchService.getSystemTypeFieldsByLang(lang).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      catchError(error => {
        const errorMsg = 'Error loading system types';
        this.errorSubject.next(errorMsg);
        console.error(errorMsg, error);
        return of([]);
      })
    );
  }

  /**
   * Update system type data cache
   */
  updateSystemTypeData(data: DropdownItem[]): void {
    this.systemTypeDataSubject.next(data);
  }

  /**
  * Update parent selected values based on language change
  */
  updateParentSelectedForLanguageChange(
    selectedFields: SelectedField[],
    newSystemTypeData: DropdownItem[]
  ): SelectedField[] {
    // Create lookup map for quick access to new system type data by ID
    const systemTypeMap = new Map<string, DropdownItem>();
    newSystemTypeData.forEach(item => systemTypeMap.set(item.id, item));

    // Create a new array with updated fields
    return selectedFields.map(field => {
      const updatedField = { ...field };

      if (updatedField.parentSelected) {
        if (Array.isArray(updatedField.parentSelected)) {
          // Update each item in the array with the new language label
          updatedField.parentSelected = updatedField.parentSelected.map(item => {
            const updatedItem = systemTypeMap.get(item.id);
            return updatedItem || item; // Keep original if not found
          });
        } else {
          // Update single item
          const updatedItem = systemTypeMap.get(updatedField.parentSelected.id);
          if (updatedItem) {
            updatedField.parentSelected = updatedItem;
          }
        }
      }

      // Also update parent if it exists
      if (updatedField.parent && updatedField.parent.id) {
        const updatedItem = systemTypeMap.get(updatedField.parent.id);
        if (updatedItem && updatedItem.label !== undefined) {
          // Ensure label is not undefined before assigning
          updatedField.parent = {
            id: updatedItem.id,
            label: updatedItem.label || '' // Default to empty string if somehow undefined
          };
        }
      }

      return updatedField;
    });
  }

  /**
   * Save selected fields to local storage
   */
  saveToLocalStorage(selectedFields: SelectedField[]): void {
    localStorage.setItem('selectedFields', JSON.stringify(selectedFields));
  }

  /**
   * Get selected fields from local storage
   */
  getFromLocalStorage(): SelectedField[] {
    const saved = localStorage.getItem('selectedFields');
    return saved ? JSON.parse(saved) : [];
  }
  /**
   * Check if parent field should display dropdown
   */
  shouldShowParentDropdown(field: SelectedField): boolean {
    // Show dropdown ONLY if:
    // 1. isParentArray is true (multi-select mode)
    // OR
    // 2. Parent is empty/invalid AND isParentArray is not explicitly false
    return field.isParentArray === true ||
      ((!field.parent?.id) && field.isParentArray !== false);
  }

  /**
   * Check if parent selection is valid
   */
  isParentValid(field: SelectedField): boolean {
    // Valid if parent has ID
    if (field.parent && field.parent.id) {
      return true;
    }

    // Valid if parentSelected has been chosen
    if (field.parentSelected) {
      if (Array.isArray(field.parentSelected)) {
        return field.parentSelected.length > 0;
      }
      return !!field.parentSelected.id;
    }

    return false;
  }

 /**
 * Get parent selected IDs for dropdown binding
 */
getParentSelectedIds(field: SelectedField): string[] {
  // If parentSelected is undefined or null, return empty array
  if (!field.parentSelected) {
    return [];
  }
  
  // If parentSelected is an array, extract the IDs
  if (Array.isArray(field.parentSelected)) {
    // Make sure we're only returning valid IDs
    return field.parentSelected
      .filter(item => item && item.id) // Filter out null or undefined items
      .map(item => item.id);
  }
  
  // If parentSelected is a single object, return its ID in an array
  return field.parentSelected.id ? [field.parentSelected.id] : [];
}
}