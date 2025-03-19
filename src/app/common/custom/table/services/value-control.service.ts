import { Injectable } from '@angular/core';
import { FieldType } from '../../../enums/field-types.enum';
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

  // Dropdown data mapping
  private dropdownDataMapping: { [key: string]: string } = {
    'default': 'stateData',
    // Add field ID to data source mappings as needed
  };

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
  getValueControl(selected: SelectedField, fieldType: string): any {
    const control = {
      show: false,
      dual: false,
      type: FieldType.Text,
      dropdownData: [] as DropdownItem[],
      isSimilar: false,
      similarDropdownData: [] as DropdownItem[]
    };

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
      control.type = this.getControlType(fieldType);
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
      control.type = this.getControlType(fieldType);

      if (control.type === FieldType.Dropdown) {
        control.dropdownData = this.getDropdownDataForField(selected.field?.id || '');
      }

      return control;
    }

    // Scenario-3: Handle single controls for other operations
    control.show = true;
    control.type = this.getControlType(fieldType);

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
  shouldShowValueColumn(selectedFields: SelectedField[], isOperatorValidFn: (field: SelectedField) => boolean, getFieldTypeFn: (field: SelectedField) => string): boolean {
    return selectedFields.some(field => {
      // Get the field type for this specific field
      const fieldType = getFieldTypeFn(field);
      // Then use that field type with getValueControl
      const valueControl = this.getValueControl(field, fieldType);
      return valueControl.show && isOperatorValidFn(field);
    });
  }
}