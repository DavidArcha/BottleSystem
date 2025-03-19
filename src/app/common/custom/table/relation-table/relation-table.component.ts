import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SelectedField } from '../../../interfaces/selectedFields.interface';
import { DropdownItem } from '../../../interfaces/table-dropdown.interface';
import { SearchService } from '../../../services/search.service';
import { LanguageService } from '../../../services/language.service';
import { RelationTableService } from '../services/relation-table.service';
import { FieldServiceService } from '../../../componets/select-search/services/field-service.service';
import { FieldType, FieldTypeMapping } from '../../../enums/field-types.enum';
import { DropdownDataService } from '../services/dropdown-data.service';
import { OperatorTableService } from '../services/operator-table.service';
import { ValueControlService } from '../services/value-control.service';
import { SearchCriteria } from '../../../interfaces/search-criteria.interface';

@Component({
  selector: 'app-relation-table',
  standalone: false,
  templateUrl: './relation-table.component.html',
  styleUrl: './relation-table.component.scss'
})
export class RelationTableComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() selectedFields: SelectedField[] = [];
  @Input() selectedLanguage: string = 'de';
  @Output() parentValueChange = new EventEmitter<{ selectedValues: DropdownItem[], index: number }>();
  @Output() operatorValueChange = new EventEmitter<{ selectedValue: DropdownItem, index: number }>();
  @Output() searchSelectedField = new EventEmitter<SelectedField>();
  @Output() deleteSelectedField = new EventEmitter<number>();

  systemTypeData: DropdownItem[] = [];
  isLoading = false;
  error = '';
  FieldType = FieldType;

  // Cache for operator data by field type
  private operatorDataCache: { [fieldType: string]: DropdownItem[] } = {};

  constructor(
    private relationTableService: RelationTableService,
    private languageService: LanguageService,
    private fieldService: FieldServiceService,
    private dropdownDataService: DropdownDataService,
    private operatorTableService: OperatorTableService,
    private valueControlService: ValueControlService,
    private searchService: SearchService
  ) { }

  ngOnInit(): void {
    // Initialize fields
    this.initializeFields();

    // Subscribe to language changes
    this.languageService.language$
      .pipe(takeUntil(this.destroy$))
      .subscribe(lang => {
        this.selectedLanguage = lang;
        this.loadSystemTypeFields();
        this.clearOperatorDataCache(); // Clear cache on language change
      });

    // Load initial data
    this.loadSystemTypeFields();

    // Subscribe to loading state
    this.relationTableService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.isLoading = loading);

    // Subscribe to error messages
    this.relationTableService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error = error);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
 * Initialize fields with default values if needed
 */
  private initializeFields(): void {
    this.selectedFields.forEach(field => {
      // Ensure parentSelected is initialized if isParentArray is true
      if (field.isParentArray === true && !field.parentSelected) {
        field.parentSelected = [];
      }
      // Always ensure operator is initialized
      field.operator = field.operator || { id: '', label: '' };
      // Always ensure operatorTouched is initialized
      field.operatorTouched = field.operatorTouched !== undefined ? field.operatorTouched : false;
      // Always ensure parentTouched is initialized
      field.parentTouched = field.parentTouched !== undefined ? field.parentTouched : false;
    });
  }

  /**
   * Clear operator data cache (used when language changes)
   */
  private clearOperatorDataCache(): void {
    this.operatorDataCache = {};
  }

  /**
   * Load system type fields for the current language
   */
  loadSystemTypeFields(): void {
    this.relationTableService.loadSystemTypeFields(this.selectedLanguage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fields) => {
          // Ensure all IDs are strings for consistent comparison
          this.systemTypeData = fields.map(item => ({
            ...item,
            id: String(item.id)
          }));

          this.relationTableService.updateSystemTypeData(this.systemTypeData);
          // Update existing selected fields with new language data
          if (fields.length > 0) {
            this.selectedFields = this.relationTableService.updateParentSelectedForLanguageChange(
              this.selectedFields,
              this.systemTypeData
            );

            // Now update field labels
            this.selectedFields = this.relationTableService.updateFieldLabels(
              this.selectedFields,
              this.fieldService.getFirstSystemFieldsMap(),
              this.fieldService.getSystemFieldsMap()
            );

            // Also ensure all parentSelected IDs are strings
            this.selectedFields.forEach(field => {
              if (field.parentSelected) {
                if (Array.isArray(field.parentSelected)) {
                  field.parentSelected = field.parentSelected.map(item => ({
                    ...item,
                    id: String(item.id)
                  }));
                } else {
                  field.parentSelected = {
                    ...field.parentSelected,
                    id: String(field.parentSelected.id)
                  };
                }
              }

              if (field.parent && field.parent.id) {
                field.parent = {
                  ...field.parent,
                  id: String(field.parent.id)
                };
              }
            });
          }
        },
        error: (err) => {
          console.error('Error loading system type fields:', err);
        }
      });
  }



  /**
   * Get operator data for a specific field
   */
  getOperatorDataForField(field: SelectedField, index: number): DropdownItem[] {
    const fieldType = this.valueControlService.getFieldType(field);
    // Check cache first
    if (this.operatorDataCache[fieldType]) {
      return this.operatorDataCache[fieldType];
    }

    // Get operators based on field type
    let operators: DropdownItem[] = [];
    switch (fieldType) {
      case 'boolean':
        operators = this.dropdownDataService.getBooleanOperators(this.selectedLanguage);
        break;
      case 'number':
        operators = this.dropdownDataService.getNumberOperators(this.selectedLanguage);
        break;
      case 'date':
        operators = this.dropdownDataService.getDateOperators(this.selectedLanguage);
        break;
      case 'time':
        operators = this.dropdownDataService.getDateOperators(this.selectedLanguage);
        break;
      case 'string':
      default:
        operators = this.dropdownDataService.getStringOperators(this.selectedLanguage);
    }

    // Cache results
    this.operatorDataCache[fieldType] = operators;

    return operators;
  }
  // Check if value is valid based on current operator
  isValueValid(selected: SelectedField): boolean {
    return this.valueControlService.isValueValid(selected);
  }

  /**
  * Get selected operator IDs for dropdown binding
  */
  getOperatorSelectedIds(field: SelectedField): string[] {
    // If operator is undefined or null, or id is empty, return empty array
    if (!field.operator || !field.operator.id) {
      return [];
    }

    return [field.operator.id];
  }

  /**
  * Check if operator selection is valid
  */
  isOperatorValid(field: SelectedField): boolean {
    // Explicitly check if operator exists and has a non-empty id
    return !!field.operator && !!field.operator.id;
  }

  /**
   * Handle operator selection change
   */
  onOperatorValueChange(selectedDropdownItems: DropdownItem[], index: number): void {
    const field = this.selectedFields[index];

    if (!field) {
      console.error('Field not found at index:', index);
      return;
    }

    // Get the selected item (should be only one since multiSelect is false)
    const selectedItem = selectedDropdownItems && selectedDropdownItems.length > 0 ? selectedDropdownItems[0] : null;

    if (selectedItem) {
      // Update the operator
      field.operator = {
        id: selectedItem.id,
        label: selectedItem.label || ''
      };
    } else {
      // Clear selection
      field.operator = { id: '', label: '' };
    }

    // Mark as touched for validation
    field.operatorTouched = true;

    // Emit for parent component handling
    this.operatorValueChange.emit({
      selectedValue: selectedItem || { id: '', label: '' },
      index
    });

    // Save changes
    this.saveToLocalStorage();
  }

  // Optional helper method to get the field label
  getFieldLabel(field: SelectedField): string {
    if (!field.field) return '';

    // If field label needs to be updated at display time
    if (field.field.id) {
      const updatedField = this.fieldService.findFieldById(
        field.field.id,
        !!field.isParentArray
      );

      if (updatedField) {
        return updatedField.label;
      }
    }

    return field.field.label || '';
  }

  /**
   * Save current selections to localStorage
   */
  saveToLocalStorage(): void {
    this.relationTableService.saveToLocalStorage(this.selectedFields);
  }

  /**
   * Check if parent dropdown should be shown
   */
  shouldShowParentDropdown(field: SelectedField): boolean {
    return this.relationTableService.shouldShowParentDropdown(field);
  }

  /**
   * Check if parent selection is valid
   */
  isParentValid(field: SelectedField): boolean {
    return this.relationTableService.isParentValid(field);
  }

  /**
   * Get parent selected values for dropdown binding
   */
  getParentSelectedIds(field: SelectedField): string[] {
    return this.relationTableService.getParentSelectedIds(field);
  }

  /**
   * Handle parent selection change
   */
  onParentValueChange(selectedDropdownItems: DropdownItem[], index: number): void {
    const field = this.selectedFields[index];

    // Create copies of the selected items to avoid reference issues
    const selectedItems = selectedDropdownItems.map(item => ({ ...item }));

    // Update parentSelected with the selected items
    field.parentSelected = selectedItems.length > 0 ? selectedItems : [];

    // Set isParentArray flag to true since we're using multi-select
    field.isParentArray = true;

    // Mark the field as touched for validation
    field.parentTouched = true;

    // If there are selected items, update the parent (for display when dropdown is hidden)
    if (selectedItems.length > 0) {
      field.parent = {
        id: selectedItems[0].id,
        label: selectedItems[0].label || ''
      };
    } else {
      // Clear parent when no selection
      field.parent = { id: '', label: '' };
    }
    // Emit for parent component handling
    this.parentValueChange.emit({ selectedValues: selectedItems, index });
    // Save changes
    this.saveToLocalStorage();
  }
  /**
 * Initialize data needed for value controls
 */
  private initializeValueControlData(): void {
    // Load brand data example
    // this.searchService.getBrandData().pipe(takeUntil(this.destroy$))
    //   .subscribe(data => {
    //     this.valueControlService.setBrandData(data);
    //   });

    // // Load state data example
    // this.searchService.getStateData().pipe(takeUntil(this.destroy$))
    //   .subscribe(data => {
    //     this.valueControlService.setStateData(data);
    //   });

    // Set dropdown data mapping
    this.valueControlService.setDropdownDataMapping({
      'brandField': 'brandData',
      'stateField': 'stateData',
      // Add other field mappings as needed
    });
  }

  /**
   * Get value control configuration for a field
   */
  getValueControl(field: SelectedField): any {
    return this.valueControlService.getValueControl(field);
  }

  /**
   * Check if value column should be displayed
   */
  shouldShowValueColumn(): boolean {
    return this.selectedFields.some(field => {
      const valueControl = this.getValueControl(field);
      return valueControl.show && this.isOperatorValid(field);
    });
  }
 // Update onSearchSelectedField to validate before emitting
 onSearchSelectedField(selected: SelectedField): void {
  // Mark fields as touched for validation
  selected.parentTouched = true;
  selected.operatorTouched = true;
  selected.valueTouched = true;

  // Validate all required fields
  if (!this.isParentValid(selected)) {
    console.error('Parent validation failed');
    return;
  }

  if (!this.isOperatorValid(selected)) {
    console.error('Operator validation failed');
    return;
  }

  if (!this.isValueValid(selected)) {
    console.error('Value validation failed');
    return;
  }

  // If all validations pass, create search criteria
  const searchCriteria: SearchCriteria = {
    parent: selected.parent,
    parentSelected: selected.parentSelected,
    field: {
      id: selected.field.id,
      label: selected.field.label
    },
    operator: {
      id: selected.operator?.id || '',
      label: selected.operator?.label || ''
    },
    value: selected.value || null
  };

  // Emit the selected field (with validation state)
  this.searchSelectedField.emit(selected);
}

// Add this method to the class
validateAllFields(): { isValid: boolean, invalidFields: string[] } {
  const invalidFieldsMessages: string[] = [];

  // Loop through each field and check for validation issues
  this.selectedFields.forEach((field, index) => {
    // Check parent validation
    field.parentTouched = true;
    if (!this.isParentValid(field)) {
      invalidFieldsMessages.push(`Row ${index + 1}: Parent selection`);
    }

    // Check operator validation
    field.operatorTouched = true;
    if (!this.isOperatorValid(field)) {
      invalidFieldsMessages.push(`Row ${index + 1}: Operator selection`);
    }

    // Check value validation if needed based on operator
    const valueControl = this.getValueControl(field);
    if (valueControl.show && this.isOperatorValid(field)) {
      field.valueTouched = true;
      if (!this.isValueValid(field)) {
        const fieldName = field.field?.label || `Field ${index + 1}`;
        invalidFieldsMessages.push(`Row ${index + 1}: Value for ${fieldName}`);
      }
    }
  });

  return {
    isValid: invalidFieldsMessages.length === 0,
    invalidFields: invalidFieldsMessages
  };
}

onDeleteSelectedField(index: number): void {
  this.deleteSelectedField.emit(index);
}

// Add these methods for numeric validation

// Validate single number input field
validateNumberInput(event: Event, selected: SelectedField): void {
  const input = event.target as HTMLInputElement;
  const value = input.value;

  // If empty, allow it (will be caught by required validation if needed)
  if (!value) {
    return;
  }

  // Check if value is numeric
  if (!/^-?\d*\.?\d*$/.test(value)) {
    // If not numeric, revert to previous valid value or empty string
    input.value = selected.value || '';
    selected.value = input.value;
  }
}

// Validate dual number input fields
validateDualNumberInput(event: Event, selected: SelectedField, index: number): void {
  const input = event.target as HTMLInputElement;
  const value = input.value;

  // If empty, allow it (will be caught by required validation if needed)
  if (!value) {
    return;
  }

  // Check if value is numeric
  if (!/^-?\d*\.?\d*$/.test(value)) {
    // If not numeric, revert to previous valid value or empty string
    if (Array.isArray(selected.value)) {
      input.value = selected.value[index] || '';
      selected.value[index] = input.value;
    } else {
      // Handle case where value isn't an array yet
      selected.value = ['', ''];
      input.value = '';
    }
  }
}

// Get text to display when button is clicked
getButtonDisplayText(selected: SelectedField, index?: number): string {
  // You can customize what text appears after the button is clicked
  // This could come from the field data or be generated dynamically
  const fieldLabel = selected.field.label || 'Selected';
  const timestamp = new Date().toLocaleTimeString();

  if (index === undefined) {
    return `${fieldLabel} selected at ${timestamp}`;
  } else {
    return `Option ${index + 1} - ${fieldLabel} selected at ${timestamp}`;
  }
}

// Handle button click
onFieldButtonClick(selected: SelectedField, index?: number): void {
  selected.valueTouched = true;

  // Generate display text
  const displayText = this.getButtonDisplayText(selected, index);

  if (index === undefined) {
    // For single button, store the display text instead of boolean
    // Before storing text, check if it was already set (toggle behavior)
    selected.value = selected.value ? null : displayText;
  } else {
    // For dual buttons, ensure we have an array and store text at specific index
    if (!Array.isArray(selected.value)) {
      selected.value = [null, null];
    }
    // Toggle behavior - set to null if already has text, otherwise set the text
    selected.value[index] = selected.value[index] ? null : displayText;
  }
}

getSelectedDropdownValues(selected: SelectedField): string[] {
  if (!selected.value) return [];

  // If the value is already an object with id, extract the id
  if (typeof selected.value === 'object' && selected.value !== null && 'id' in selected.value) {
    return [selected.value.id];
  }

  // If it's an array of objects, map to ids
  if (Array.isArray(selected.value) && selected.value.length > 0 &&
    typeof selected.value[0] === 'object' && 'id' in selected.value[0]) {
    return selected.value.map(item => item.id);
  }

  // If it's a simple string, wrap in array
  if (typeof selected.value === 'string') {
    return [selected.value];
  }

  return [];
}

// Get selected values for dual dropdown at specific index
getDualSelectedDropdownValues(selected: SelectedField, index: number): string[] {
  if (!selected.value || !Array.isArray(selected.value) || !selected.value[index]) {
    return [];
  }

  const value = selected.value[index];

  // If the value is already an object with id
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return [value.id];
  }

  // If it's a simple string
  if (typeof value === 'string') {
    return [value];
  }

  return [];
}

// Handle single dropdown value change
onDropdownValueChange(selectedItems: DropdownItem[], index: number): void {
  const selected = this.selectedFields[index];

  if (!selectedItems || selectedItems.length === 0) {
    selected.value = null;
  } else if (selectedItems.length === 1) {
    // Store the complete object to preserve language information
    selected.value = selectedItems[0];
  } else {
    // Store array of objects for multi-select
    selected.value = selectedItems;
  }

  // Mark as touched for validation
  selected.valueTouched = true;
}

// Handle dual dropdown value change
onDualDropdownValueChange(selectedItems: DropdownItem[], index: number, dualIndex: number): void {
  const selected = this.selectedFields[index];

  // Ensure value is an array of length 2
  if (!Array.isArray(selected.value) || selected.value.length !== 2) {
    selected.value = [null, null];
  }

  if (!selectedItems || selectedItems.length === 0) {
    selected.value[dualIndex] = null;
  } else if (selectedItems.length === 1) {
    // Store the complete object to preserve language information
    selected.value[dualIndex] = selectedItems[0];
  } else {
    // For multiple selections (unusual case)
    selected.value[dualIndex] = selectedItems[0];
  }

  // Mark as touched for validation
  selected.valueTouched = true;
}

// For similar operator field dropdown values
getSimilarFieldDropdownValues(selected: SelectedField): string[] {
  if (!selected.value || !Array.isArray(selected.value) || !selected.value[0]) {
    return [];
  }

  const value = selected.value[0];

  // If the value is already an object with id
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return [value.id];
  }

  // If it's a simple string
  if (typeof value === 'string') {
    return [value];
  }

  return [];
}

// For similar operator brand dropdown values
getSimilarBrandDropdownValues(selected: SelectedField): string[] {
  if (!selected.value || !Array.isArray(selected.value) || !selected.value[1]) {
    return [];
  }

  const value = selected.value[1];

  // If the value is already an object with id
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return [value.id];
  }

  // If it's a simple string
  if (typeof value === 'string') {
    return [value];
  }

  return [];
}

// Handle change of the field value in similar operator
onSimilarFieldDropdownChange(selectedItems: DropdownItem[], index: number): void {
  const selected = this.selectedFields[index];

  // Ensure value is an array
  if (!Array.isArray(selected.value)) {
    selected.value = [null, null];
  }

  if (!selectedItems || selectedItems.length === 0) {
    selected.value[0] = null;
  } else if (selectedItems.length === 1) {
    selected.value[0] = selectedItems[0];
  } else {
    selected.value[0] = selectedItems[0];
  }

  // Mark as touched for validation
  selected.valueTouched = true;
}

// Handle change of the brand dropdown in similar operator
onSimilarBrandDropdownChange(selectedItems: DropdownItem[], index: number): void {
  const selected = this.selectedFields[index];

  // Ensure value is an array
  if (!Array.isArray(selected.value)) {
    selected.value = [null, null];
  }

  if (!selectedItems || selectedItems.length === 0) {
    selected.value[1] = null;
  } else if (selectedItems.length === 1) {
    selected.value[1] = selectedItems[0];
  } else {
    selected.value[1] = selectedItems[0];
  }

  // Mark as touched for validation
  selected.valueTouched = true;
}

// Handle click of button in similar operator case
onSimilarButtonClick(selected: SelectedField): void {
  // Ensure value is an array
  if (!Array.isArray(selected.value)) {
    selected.value = [null, null];
  }

  // Toggle the button selection
  const displayText = this.getButtonDisplayText(selected);
  selected.value[0] = selected.value[0] ? null : displayText;

  // Mark as touched for validation
  selected.valueTouched = true;
}
}