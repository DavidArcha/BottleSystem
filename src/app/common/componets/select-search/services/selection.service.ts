import { Injectable } from '@angular/core';
import { SelectedField } from '../../../interfaces/selectedFields.interface';
import { BehaviorSubject } from 'rxjs';
import { DropdownDataMapping, FieldType, FieldTypeMapping } from '../../../enums/field-types.enum';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  private selectedFieldsSubject = new BehaviorSubject<SelectedField[]>([]);
  public selectedFields$ = this.selectedFieldsSubject.asObservable();

  private operatorsDdDataSubject = new BehaviorSubject<any>(null);

  constructor(private storageService: StorageService) { }


  // Get operators data for a specific field
  getOperatorOptions(field: string): any[] {
    const operatorsData = this.operatorsDdDataSubject.getValue();
    if (!operatorsData) return [];

    const fieldLower = field.toLowerCase();
    switch (FieldTypeMapping[fieldLower]) {
      case FieldType.Bool:
        return operatorsData.boolOperations || [];
      case FieldType.Text:
        return operatorsData.stringOperations || [];
      case FieldType.Date:
        return operatorsData.dateOperations || [];
      case FieldType.Number:
        return operatorsData.numberOperations || [];
      case FieldType.Dropdown:
        return operatorsData.stringOperations || [];
      default:
        return operatorsData.stringOperations || []; // Default to string operations
    }
  }

  // Get dropdown data for a field
  getDropdownDataForField(fieldId: string): any[] {
    const dataSource = DropdownDataMapping[fieldId];
    // Implement dropdown data source mapping here
    return [];
  }

  // Add field to selection
  addField(
    field: { id: string, label: string },
    parent: { id: string, label: string },
    path: string = '',
    currentLanguage: string = 'en',
    isParentArray: boolean = false
  ): void {

    const operatorOptions = this.getOperatorOptions(field.id);
    const defaultOperator = {
      id: 'select',
      label: currentLanguage === 'de' ? 'Auswählen' : 'Select'
    };
    const defaultValue = null;
    const dropdownData = this.getDropdownDataForField(field.id) || [];

    // Create a new SelectedField object with all required properties
    const selectedField: SelectedField = {
      rowid: '',
      parent: parent,
      parentSelected: [],
      field: field,
      operator: defaultOperator,
      operatorOptions: operatorOptions,
      value: defaultValue,
      dropdownData: dropdownData,
      parentTouched: false,
      operatorTouched: false,
      valueTouched: false,
      isParentArray: isParentArray,
    };
    // Get current fields and add the new one
    const currentFields = this.selectedFieldsSubject.getValue();
    const updatedFields = [...currentFields, selectedField];
    this.selectedFieldsSubject.next(updatedFields);
    console.log('Updated fields:', updatedFields);

    // Save to storage
    this.storageService.setItem('selectedFields', JSON.stringify(updatedFields));
  }

  /**
* Update field labels for language change
* This ensures all fields display in the correct language
*/
  updateFieldLabels(
    firstSystemFieldsMap: Map<string, any>,
    systemFieldsMap: Map<string, any>,
    systemTypeData: any[],
    currentLanguage: string
  ): void {
    const currentFields = this.selectedFieldsSubject.getValue();
    if (!currentFields || currentFields.length === 0) return;

    // Create a new array to avoid direct mutation
    const updatedFields = currentFields.map(field => {
      const updatedField = { ...field };

      // Update field label from maps, keeping ID the same
      if (updatedField.field.id) {
        // Try to find the field in firstSystemFieldsMap
        const firstSystemField = firstSystemFieldsMap.get(updatedField.field.id);
        if (firstSystemField && firstSystemField.label) {
          updatedField.field.label = firstSystemField.label;
        } else {
          // If not found, try systemFieldsMap
          const systemField = systemFieldsMap.get(updatedField.field.id);
          if (systemField && systemField.label) {
            updatedField.field.label = systemField.label;
          }
        }
      }

      // Update parent label if applicable
      if (updatedField.parent && updatedField.parent.id) {
        const parentId = updatedField.parent.id;

        // Look for the parent in system type data (system types are parents for second accordion)
        const systemTypeItem = systemTypeData.find(item => item.id === parentId);
        if (systemTypeItem && systemTypeItem.label) {
          updatedField.parent = {
            id: parentId,
            label: systemTypeItem.label
          };
        }
      }

      // Update operator label if needed
      if (updatedField.operator && updatedField.operator.id) {
        // Here we would need access to operators data in the correct language
        // For now, we'll just ensure the structure is maintained
        const operatorsData = this.operatorsDdDataSubject.getValue();

        if (operatorsData) {
          // Find the operator in all operator types
          const operatorTypes = [
            'stringOperations', 'numberOperations', 'dateOperations',
            'boolOperations', 'timeOperations'
          ];

          let found = false;
          for (const type of operatorTypes) {
            if (!operatorsData[type]) continue;

            const operator = operatorsData[type].find(
              (op: any) => op.id === updatedField.operator?.id
            );

            if (operator) {
              updatedField.operator = {
                id: operator.id,
                label: operator.label
              };
              found = true;
              break;
            }
          }

          // If not found, preserve the operator ID but update label with default text
          if (!found && updatedField.operator) {
            const defaultLabel = currentLanguage === 'de' ? 'Auswählen' : 'Select';
            updatedField.operator = {
              id: updatedField.operator.id,
              label: defaultLabel
            };
          }
        }
      }

      return updatedField;
    });

    // Update the BehaviorSubject with the new array
    this.selectedFieldsSubject.next(updatedFields);

    // Save the updated fields to storage
    this.saveFieldsToStorage(updatedFields);
  }

  /**
* Save fields to storage
*/
  private saveFieldsToStorage(fields: SelectedField[]): void {
    if (!fields) return;

    try {
      const fieldsJson = JSON.stringify(fields);
      this.storageService.setItem('selectedFields', fieldsJson);
    } catch (e) {
      console.error('Error saving fields to storage:', e);
    }
  }

  // Update fields using a map without changing parent values
  updateFieldLabelsWithMap(
    fieldsMap: Map<string, any>,
    currentFields: SelectedField[]
  ): void {
    if (currentFields.length === 0) return;

    const updatedFields = currentFields.map((selectedField) => {
      if (selectedField.field && selectedField.field.id) {
        const field = fieldsMap.get(selectedField.field.id);
        if (field) {
          selectedField.field = {
            id: selectedField.field.id,
            label: field.label || ''
          };
        }
      }
      return selectedField;
    });

    this.selectedFieldsSubject.next(updatedFields);
    this.storageService.setItem('selectedFields', JSON.stringify(updatedFields));
  }

  // Clear all fields
  // Clear fields and ensure proper cleanup
  clearFields(): void {
    // Update the subject with empty array
    this.selectedFieldsSubject.next([]);

    // Clear from storage to ensure persistence
    this.storageService.removeItem('selectedFields');
    this.storageService.removeItem('savedSearchFields'); // Clear legacy key too

  }

}
