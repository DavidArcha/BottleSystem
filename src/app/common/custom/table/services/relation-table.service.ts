import { Injectable } from '@angular/core';
import { DropdownItem } from '../../../interfaces/table-dropdown.interface';
import { BehaviorSubject, catchError, finalize, Observable, of } from 'rxjs';
import { SearchService } from '../../../services/search.service';
import { SelectedField } from '../../../interfaces/selectedFields.interface';
import { ValueControlService } from './value-control.service';
import { FieldTypeMapping } from '../../../enums/field-types.enum';
import { DefaultOperatorsByFieldType } from '../../../enums/operator-types.enum';

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

  constructor(private searchService: SearchService,
    private valueControlService: ValueControlService
  ) { }

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
    if (!saved) return [];

    try {
      const fields = JSON.parse(saved);

      // Ensure all dual values are properly initialized
      return fields.map((field: SelectedField) => {
        // Use the injected service
        const valueControl = this.valueControlService.getValueControl(field);
        if (valueControl && valueControl.dual && (!field.value || !Array.isArray(field.value))) {
          field.value = ['', ''];
        }
        return field;
      });
    } catch (e) {
      console.error('Error parsing saved fields:', e);
      return [];
    }
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
      // Make sure we're only returning valid IDs and convert to string
      const result = field.parentSelected
        .filter(item => item && item.id !== undefined && item.id !== null)
        .map(item => String(item.id)); // Ensure IDs are strings
      return result;
    }

    // If parentSelected is a single object, return its ID in an array
    return field.parentSelected.id !== undefined && field.parentSelected.id !== null
      ? [String(field.parentSelected.id)] // Ensure ID is a string
      : [];
  }

  /**
 * Update field labels based on language change
 * @param selectedFields Current selected fields
 * @param firstSystemFieldsMap Map of fields from first accordion
 * @param systemFieldsMap Map of fields from system accordion
 * @returns Updated fields with correct labels
 */
  updateFieldLabels(
    selectedFields: SelectedField[],
    firstSystemFieldsMap: Map<string, any>,
    systemFieldsMap: Map<string, any>
  ): SelectedField[] {
    return selectedFields.map(field => {
      if (!field.field || !field.field.id) return field;

      // Clone the field to avoid mutation
      const updatedField = { ...field };

      // Determine which map to use based on isParentArray
      const mapToUse = field.isParentArray ? firstSystemFieldsMap : systemFieldsMap;
      const updatedFieldData = mapToUse.get(field.field.id);

      // Update field label if found
      if (updatedFieldData) {
        updatedField.field = {
          id: field.field.id,
          label: updatedFieldData.label || field.field.label
        };
      }

      return updatedField;
    });
  }

  /**
 * Determines the default operator to use based on field type and available operators
 * @param field The selected field
 * @param availableOperators List of operators available for this field
 * @returns The default operator to select, or null if no match
 */
  findDefaultOperator(field: SelectedField, availableOperators: DropdownItem[]): DropdownItem | null {
    if (!field || !field.field || !availableOperators || availableOperators.length === 0) {
      return null;
    }

    // Get field type
    let fieldType: string;
    if (field.field.id && FieldTypeMapping[field.field.id]) {
      fieldType = FieldTypeMapping[field.field.id];
    } else {
      // Default to text if unknown field type
      fieldType = 'default';
    }

    // Get the list of default operators for this field type
    const defaultOperators = DefaultOperatorsByFieldType[fieldType] || DefaultOperatorsByFieldType['default'];

    // Find the first matching operator from the priority list
    for (const defaultOp of defaultOperators) {
      const matchingOperator = availableOperators.find(op => op.id === defaultOp);
      if (matchingOperator) {
        return matchingOperator;
      }
    }

    // If no match found, return null (will not pre-select anything)
    return null;
  }

}