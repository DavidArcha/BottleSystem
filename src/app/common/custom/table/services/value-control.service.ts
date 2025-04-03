import { Injectable } from '@angular/core';
import { DropdownDataMapping, FieldType, FieldTypeMapping } from '../../../enums/field-types.enum';
import { DropdownItem } from '../../../interfaces/table-dropdown.interface';

import { DualOperators, NoValueOperators, OperatorType } from '../../../enums/operator-types.enum';
import { SelectedField } from '../../../interfaces/selectedFields.interface';

@Injectable({
  providedIn: 'root'
})
export class ValueControlService {
  // Cache for dropdown data
  private brandData: DropdownItem[] = [];
  private stateData: DropdownItem[] = [];

  // Private mapping with defaults from enum
  private dropdownDataMapping: { [key: string]: string } = {
    ...DropdownDataMapping
  };

  private brandDataLoading = false;
  private stateDataLoading = false;

  constructor() {
    // Initialize with empty arrays, data should be loaded elsewhere
  }

  /**
   * Set brand data for dropdowns
   */
  setBrandData(data: DropdownItem[]): void {
    this.brandData = data;
  }

  /**
   * Set state data for dropdowns
   */
  setStateData(data: DropdownItem[]): void {
    this.stateData = data;
  }

  /**
   * Set custom dropdown data mapping
   */
  setDropdownDataMapping(mapping: { [key: string]: string }): void {
    this.dropdownDataMapping = { ...this.dropdownDataMapping, ...mapping };
  }

  /**
   * Determine value control properties based on selected field and operator
   */
  getValueControl(selected: SelectedField): any {
    const control = {
      show: false,
      dual: false,
      type: FieldType.Text,
      dropdownData: [] as DropdownItem[],
      isSimilar: false,
      similarDropdownData: [] as DropdownItem[]
    };
    // console.log('Selected field:', selected);

    // Only show controls if a valid operator is selected
    if (!selected.operator?.id || selected.operator.id === 'select') {
      control.show = false;
      return control;
    }

    const operatorId = selected.operator.id.toLowerCase();

    // Scenario-1: No need to display any control
    if (NoValueOperators.includes(operatorId as OperatorType)) {
      control.show = false;
      return control;
    }

    // Special case for "similar" operator
    if (operatorId === OperatorType.Similar) {
      control.show = true;
      control.isSimilar = true;
      control.type = this.getControlType(this.getFieldType(selected));
      control.similarDropdownData = this.brandData;

      if (control.type === FieldType.Dropdown) {
        control.dropdownData = this.getDropdownDataForField(selected.field?.id || '');
      }

      return control;
    }

    // Scenario-2: Handle dual controls for specific operations
    if (DualOperators.includes(operatorId as OperatorType)) {
      control.show = true;
      control.dual = true;
      control.type = this.getControlType(this.getFieldType(selected));

      if (control.type === FieldType.Dropdown) {
        control.dropdownData = this.getDropdownDataForField(selected.field?.id || '');
      }

      return control;
    }

    // Scenario-3: Handle single controls for other operations
    control.show = true;
    control.type = this.getControlType(this.getFieldType(selected));

    if (control.type === FieldType.Dropdown) {
      control.dropdownData = this.getDropdownDataForField(selected.field?.id || '');
    }

    return control;
  }

  /**
   * Get dropdown data for a specific field
   */
  getDropdownDataForField(fieldId: string): DropdownItem[] {
    const dataSource = this.dropdownDataMapping[fieldId] || this.dropdownDataMapping['default'];
    switch (dataSource) {
      case 'brandData':
        return this.brandData;
      case 'stateData':
        return this.stateData;
      default:
        console.warn(`No data source found for ${dataSource}, returning empty array`);
        return [];
    }
  }

  /**
   * Convert field type to control type
   */
  private getControlType(fieldType: string): FieldType {
    // console.log('Field type:', fieldType);
    switch (fieldType) {
      case 'date':
        return FieldType.Date;
      case 'number':
        return FieldType.Number;
      case 'dropdown':
        return FieldType.Dropdown;
      case 'button':
        return FieldType.Button;
      default:
        return FieldType.Text;
    }
  }

  /**
   * Determine if value column should be shown
   */
  shouldShowValueColumn(selectedFields: SelectedField[], isOperatorValidFn: (field: SelectedField) => boolean): boolean {
    return selectedFields.some(field => {
      // Then use that field type with getValueControl
      const valueControl = this.getValueControl(field);
      return valueControl.show && isOperatorValidFn(field);
    });
  }

  /**
 * Get field type for a selected field
 */
  getFieldType(field: SelectedField): string {
    if (!field.field || !field.field.id) return 'string'; // Default to string

    const fieldId = String(field.field.id); // Ensure it's a string for comparison

    // Check field type mapping
    for (const [key, value] of Object.entries(FieldTypeMapping)) {
      // Use exact equality instead of includes
      if (key === fieldId) {
        // Map FieldType enum to string type
        switch (value) {
          case FieldType.Bool:
            return 'boolean';
          case FieldType.Number:
            return 'number';
          case FieldType.Date:
            return 'date';
          case FieldType.Time:
            return 'time';
          case FieldType.Button:
            return 'button';
          case FieldType.Text:
            return 'string';
          case FieldType.Dropdown:
            return 'dropdown';
          default:
            return 'string';
        }
      }
    }

    return 'string'; // Default to string if type not found
  }

  // Check if value is valid based on current operator
  isValueValid(selected: SelectedField): boolean {
    // No validation needed if operator doesn't require a value
    const operatorId = selected.operator?.id?.toLowerCase() || '';
    if (!operatorId || operatorId === 'select' || NoValueOperators.includes(operatorId as OperatorType)) {
      return true;
    }

    // Special validation for similar operator
    if (operatorId === 'similar') {
      return Array.isArray(selected.value) &&
        selected.value.length === 2 &&
        !!selected.value[0] &&  // First part must have a value
        !!selected.value[1];    // Brand selection must have a value
    }

    // Get field type
    const fieldType = this.getFieldType(selected);

    // Special handling for Button type
    if (fieldType === FieldType.Button) {
      // For dual operators with buttons
      if (DualOperators.includes(operatorId as OperatorType)) {
        return Array.isArray(selected.value) &&
          selected.value.length === 2 &&
          !!selected.value[0] &&
          !!selected.value[1];
      }

      // For single button - check if value is not empty/null
      return !!selected.value;
    }

    // Check for dual value operators
    if (DualOperators.includes(operatorId as OperatorType)) {
      // Must have an array with both values
      if (!Array.isArray(selected.value) || selected.value.length !== 2) {
        return false;
      }

      // For number fields, ensure both values are valid numbers
      if (fieldType === FieldType.Number) {
        return selected.value[0] !== undefined &&
          selected.value[0] !== null &&
          selected.value[0] !== '' &&
          !isNaN(Number(selected.value[0])) &&
          selected.value[1] !== undefined &&
          selected.value[1] !== null &&
          selected.value[1] !== '' &&
          !isNaN(Number(selected.value[1]));
      }

      // For dropdown fields, check both values are selected
      if (fieldType === FieldType.Dropdown) {
        return !!selected.value[0] && !!selected.value[1];
      }

      // For other field types, just check they're not empty
      return selected.value[0] !== undefined &&
        selected.value[0] !== null &&
        selected.value[0] !== '' &&
        selected.value[1] !== undefined &&
        selected.value[1] !== null &&
        selected.value[1] !== '';
    }

    // For number fields, ensure value is a valid number
    if (fieldType === FieldType.Number) {
      return selected.value !== undefined &&
        selected.value !== null &&
        selected.value !== '' &&
        !isNaN(Number(selected.value));
    }

    // For dropdown fields, check value exists
    if (fieldType === FieldType.Dropdown) {
      return !!selected.value;
    }

    // For other fields, just check that value exists
    return selected.value !== undefined &&
      selected.value !== null &&
      selected.value !== '';
  }
}