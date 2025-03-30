import { Injectable } from '@angular/core';
import { SelectedField } from '../../../interfaces/selectedFields.interface';
import { BehaviorSubject } from 'rxjs';
import { DropdownDataMapping, FieldType, FieldTypeMapping } from '../../../enums/field-types.enum';
import { StorageService } from './storage.service';
import { SearchCriteria } from '../../../interfaces/search-criteria.interface';
import { SearchRequest } from '../../../interfaces/search-request.interface';
import { DefaultOperatorsByFieldType } from '../../../enums/operator-types.enum';
import { DROPDOWN_DATA } from '../../../utils/dropdown-data.constant';
import { DropdownDataService } from '../../../custom/table/services/dropdown-data.service';

@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  private selectedFieldsSubject = new BehaviorSubject<SelectedField[]>([]);
  public selectedFields$ = this.selectedFieldsSubject.asObservable();
  private operatorsDdDataSubject = new BehaviorSubject<any>(null);

  constructor(private storageService: StorageService, private dropdownDataService: DropdownDataService) { }

  /**
   * Get operators data for a specific field type
   */
  getOperatorOptions(field: string): any[] {
    const operatorsData = this.operatorsDdDataSubject.getValue();
    if (!operatorsData) return [];

    const fieldType = this.getFieldType(field);
    return this.getOperationsForFieldType(fieldType, operatorsData);
  }

  /**
   * Get field type from field ID
   */
  private getFieldType(field: string): FieldType {
    return FieldTypeMapping[field.toLowerCase()] || FieldType.Text;
  }

  /**
   * Get operations based on field type
   */
  private getOperationsForFieldType(type: FieldType, operatorsData: any): any[] {
    switch (type) {
      case FieldType.Bool: return operatorsData.boolOperations || [];
      case FieldType.Date: return operatorsData.dateOperations || [];
      case FieldType.Number: return operatorsData.numberOperations || [];
      default: return operatorsData.stringOperations || [];
    }
  }

  /**
   * Get dropdown data for a field
   */
  getDropdownDataForField(fieldId: string): any[] {
    return DropdownDataMapping[fieldId] ? [] : [];
  }

  /**
   * Add field to selected fields
   */
  addField(
    field: { id: string, label: string },
    parent: { id: string, label: string },
    path: string = '',
    currentLanguage: string = 'en',
    isParentArray: boolean = false
  ): void {
    // Create selected field with basic info
    const selectedField = this.createSelectedField(field, parent, currentLanguage, isParentArray);

    // Set default operator based on field type
    this.setDefaultOperator(selectedField);

    // Add to selected fields
    const currentFields = this.selectedFieldsSubject.getValue();
    const updatedFields = [...currentFields, selectedField];
    this.updateSelectedFields(updatedFields);
  }
  /**
   * Create a new selected field object
   */
  private createSelectedField(
    field: { id: string, label: string },
    parent: { id: string, label: string },
    currentLanguage: string,
    isParentArray: boolean
  ): SelectedField {
    const defaultLabel = currentLanguage === 'de' ? 'Auswählen' : 'Select';

    return {
      rowid: '',
      parent,
      parentSelected: [],
      field,
      operator: { id: 'select', label: defaultLabel },
      value: null,
      parentTouched: false,
      operatorTouched: false,
      valueTouched: false,
      isParentArray: isParentArray,
      currentLanguage: currentLanguage,
    };
  }

  /**
   * Set default operator based on field type
   * @param field The field to set default operator for
   */
  private setDefaultOperator(field: SelectedField): void {
    if (!field || !field.field || !field.field.id) {
      return;
    }

    // Get field type
    const fieldType = this.getFieldType(field.field.id);

    // Map FieldType enum to string for DropdownDataService
    const fieldTypeString = this.mapFieldTypeToString(fieldType);

    // Get the default operators for this field type from the enum
    const defaultOperators = DefaultOperatorsByFieldType[fieldType] || DefaultOperatorsByFieldType['default'];

    // If we have default operators for this field type, use the first available one
    if (defaultOperators && defaultOperators.length > 0) {
      // Get all operators for this field type using the existing service
      const operatorData = this.dropdownDataService.getOperatorData(fieldTypeString, field.currentLanguage);

      // Find the first matching default operator that exists in operator data
      for (const defaultOp of defaultOperators) {
        // Ensure defaultOp is a string before comparing
        const operatorId = String(defaultOp);
        const matchedOperator = operatorData.find(op => op.id === operatorId);

        if (matchedOperator) {
          field.operator = {
            id: matchedOperator.id,
            // Use non-null assertion or provide a default value if label might be undefined
            label: matchedOperator.label || operatorId
          };
          field.operatorTouched = true;
          break;
        }
      }
    }
  }

  /**
   * Map FieldType enum to string representation for dropdown service
   */
  private mapFieldTypeToString(fieldType: FieldType): string {
    switch (fieldType) {
      case FieldType.Bool:
        return 'boolean';
      case FieldType.Number:
        return 'number';
      case FieldType.Date:
        return 'date';
      case FieldType.Time:
        return 'time';
      case FieldType.Text:
      case FieldType.Dropdown:
      case FieldType.Button:
      case FieldType.Unknown:
      default:
        return 'string';
    }
  }


  /**
   * Update selected fields and save to storage
   */
  private updateSelectedFields(fields: SelectedField[]): void {
    this.selectedFieldsSubject.next(fields);
    this.saveFieldsToStorage(fields);
  }

  /**
   * Update field labels for language change
   */
  updateFieldLabels(
    firstSystemFieldsMap: Map<string, any>,
    systemFieldsMap: Map<string, any>,
    systemTypeData: any[],
    currentLanguage: string
  ): void {
    const currentFields = this.selectedFieldsSubject.getValue();
    if (!currentFields?.length) return;

    const updatedFields = currentFields.map(field => {
      const updatedField = { ...field };

      this.updateFieldLabel(updatedField, firstSystemFieldsMap, systemFieldsMap);
      this.updateParentLabel(updatedField, systemTypeData);
      this.updateOperatorLabel(updatedField, currentLanguage);

      return updatedField;
    });

    this.updateSelectedFields(updatedFields);
  }

  /**
   * Update field label
   */
  private updateFieldLabel(field: SelectedField, firstMap: Map<string, any>, systemMap: Map<string, any>): void {
    if (!field.field?.id) return;

    const firstSystemField = firstMap.get(field.field.id);
    if (firstSystemField?.label) {
      field.field.label = firstSystemField.label;
      return;
    }

    const systemField = systemMap.get(field.field.id);
    if (systemField?.label) {
      field.field.label = systemField.label;
    }
  }

  /**
   * Update parent label
   */
  private updateParentLabel(field: SelectedField, systemTypeData: any[]): void {
    if (!field.parent?.id) return;

    const systemTypeItem = systemTypeData.find(item => item.id === field.parent.id);
    if (systemTypeItem?.label) {
      field.parent = {
        id: field.parent.id,
        label: systemTypeItem.label
      };
    }
  }

  /**
   * Update operator label
   */
  private updateOperatorLabel(field: SelectedField, language: string): void {
    if (!field.operator?.id) return;

    const operatorsData = this.operatorsDdDataSubject.getValue();
    if (!operatorsData) return;

    const operatorTypes = [
      'stringOperations', 'numberOperations', 'dateOperations',
      'boolOperations', 'timeOperations'
    ];

    // Try to find operator in all operation types
    for (const type of operatorTypes) {
      if (!operatorsData[type]) continue;

      const operator = operatorsData[type].find(
        (op: any) => op.id === field.operator?.id
      );

      if (operator) {
        field.operator = { id: operator.id, label: operator.label };
        return;
      }
    }

    // Default label if not found
    const defaultLabel = language === 'de' ? 'Auswählen' : 'Select';
    field.operator = { id: field.operator.id, label: defaultLabel };
  }

  /**
   * Save fields to storage
   */
  private saveFieldsToStorage(fields: SelectedField[]): void {
    if (!fields) return;
    try {
      this.storageService.setItem('selectedFields', JSON.stringify(fields));
    } catch (e) {
      console.error('Error saving fields to storage:', e);
    }
  }

  /**
   * Update field labels using a map without changing parent values
   */
  updateFieldLabelsWithMap(fieldsMap: Map<string, any>, currentFields: SelectedField[]): void {
    if (!currentFields.length) return;

    const updatedFields = currentFields.map(selectedField => {
      if (selectedField.field?.id) {
        const field = fieldsMap.get(selectedField.field.id);
        if (field) {
          selectedField.field = { id: selectedField.field.id, label: field.label || '' };
        }
      }
      return selectedField;
    });

    this.updateSelectedFields(updatedFields);
  }

  /**
   * Clear all fields
   */
  clearFields(): void {
    this.selectedFieldsSubject.next([]);
    this.storageService.removeItem('selectedFields');
    this.storageService.removeItem('savedSearchFields');
  }

  // Add field from saved group
  addSavedGroupField(field: SearchCriteria): void {
    if (!field) return;

    const selectedField = this.convertSavedFieldToSelectedField(field);
    if (selectedField) {
      const currentFields = this.selectedFieldsSubject.getValue();
      const updatedFields = [...currentFields, selectedField];
      this.selectedFieldsSubject.next(updatedFields);
      this.storageService.setItem('selectedFields', JSON.stringify(updatedFields));
    }
  }

  // Add all fields from a saved group
  addSavedGroup(groupField: SearchRequest): void {
    if (!groupField || !groupField.fields || !Array.isArray(groupField.fields)) return;

    // Convert each field in the group
    const newSelectedFields = groupField.fields
      .map(field => this.convertSavedFieldToSelectedField(field))
      .filter(field => field !== null) as SelectedField[];
    if (newSelectedFields.length > 0) {
      const currentFields = this.selectedFieldsSubject.getValue();
      const updatedFields = [...currentFields, ...newSelectedFields];
      this.selectedFieldsSubject.next(updatedFields);
      this.storageService.setItem('selectedFields', JSON.stringify(updatedFields));
    }
  }

  private convertSavedFieldToSelectedField(field: SearchCriteria): SelectedField | null {
    if (!field || !field.field) return null;

    // Logic for isParentArray:
    // 1. If parent has empty ID AND parentSelected has values, isParentArray should be true
    // 2. If parent has non-empty ID AND parentSelected is empty, isParentArray should be false
    const hasEmptyParentId = !field.parent?.id;
    const hasParentSelected = Array.isArray(field.parentSelected) && field.parentSelected.length > 0;

    // Determine isParentArray based on the specific conditions
    let isParentArray: boolean;

    // Case 1: Empty parent ID and has parentSelected values
    if (hasEmptyParentId && hasParentSelected) {
      isParentArray = true;
    }
    // Case 2: Non-empty parent ID and empty parentSelected
    else if (!hasEmptyParentId && !hasParentSelected) {
      isParentArray = false;
    }
    // For other cases, determine based on whether we have multiple parents
    else {
      isParentArray = hasParentSelected;
    }

    const selectedField: SelectedField = {
      rowid: field.rowId || '',
      parent: field.parent || { id: '', label: '' },
      parentSelected: field.parentSelected || [],
      field: {
        id: field.field.id || '',
        label: field.field.label || ''
      },
      operator: {
        id: field.operator?.id || '',
        label: field.operator?.label || ''
      },
      value: field.value || null,
      isParentArray: isParentArray,
      parentTouched: true,
      operatorTouched: true,
      valueTouched: true
    };
    return selectedField;
  }

  /**
  * Load selected fields from storage
  * @param currentLanguage The current language to use for labels
  */
  loadSelectedFieldsFromStorage(currentLanguage: string): void {
    try {
      // Get fields from storage service
      const storedFieldsStr = this.storageService.getItem('selectedFields');

      if (storedFieldsStr) {
        // Parse the JSON string
        const storedFields = JSON.parse(storedFieldsStr) as SelectedField[];

        if (storedFields && storedFields.length > 0) {
          // Update current language for each field
          const updatedFields = storedFields.map(field => ({
            ...field,
            currentLanguage: currentLanguage
          }));

          // Update the selected fields with the stored values
          this.selectedFieldsSubject.next(updatedFields);
        }
      }
    } catch (error) {
      console.error('Error loading selected fields from storage:', error);
      // In case of error, initialize with empty array
      this.selectedFieldsSubject.next([]);
    }
  }

  // Delete field
  deleteField(index: number): void {
    const currentFields = this.selectedFieldsSubject.getValue();
    if (index < 0 || index >= currentFields.length) return;

    currentFields.splice(index, 1);
    this.selectedFieldsSubject.next([...currentFields]);
    this.storageService.setItem('selectedFields', JSON.stringify(currentFields));
    localStorage.removeItem('savedAccordionState');
  }

  // Convert selected fields to search criteria for backend submission
  convertSelectedFieldsToSearchCriteria(selectedFields: SelectedField[]): SearchCriteria[] {
    if (selectedFields.length === 0) return [];

    return selectedFields.map(field => {
      // Format the value - if it's an array, join with "-"
      let formattedValue = field.value;

      // Check if value is an array and convert to hyphenated string
      if (Array.isArray(field.value)) {
        // Get values from the array - handle both primitive and object values
        const values = field.value.map(item => {
          // If item is an object with id/label (like dropdown items)
          if (item && typeof item === 'object' && 'id' in item) {
            return item.id;
          }
          // Otherwise return the item itself
          return item;
        });

        // Join the values with "-"
        formattedValue = values.join('-');
      } else if (field.value && typeof field.value === 'object' && 'id' in field.value) {
        // For single dropdown items that are objects
        formattedValue = field.value.id;
      }


      // Return the search criteria with proper parent handling and rowId
      return {
        rowId: field.rowid || '', // Include rowId, empty if not exists
        parent: field.parent,
        parentSelected: field.parentSelected,
        field: {
          id: field.field.id,
          label: field.field.label
        },
        operator: {
          id: field.operator?.id || '',
          label: field.operator?.label || ''
        },
        value: formattedValue
      };
    });
  }
}
