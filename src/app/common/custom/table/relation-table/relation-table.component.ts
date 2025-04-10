import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, SimpleChanges } from '@angular/core';
import { filter, finalize, Subject, takeUntil } from 'rxjs';
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
  private ngOnChanges$ = new Subject<SimpleChanges>();

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
        this.clearOperatorDataCache();
        this.initializeValueControlData();// Clear cache on language change
        this.updateArchivalTypeLabels();
      });

    // Load initial data
    this.loadSystemTypeFields();
    // Load saved fields from storage
    const savedFields = this.relationTableService.getFromLocalStorage();
    if (savedFields && savedFields.length > 0) {
      // Merge with any fields already set (from inputs)
      if (this.selectedFields.length === 0) {
        this.selectedFields = savedFields;
      } else {
        // Update existing fields with saved values
        this.selectedFields = this.selectedFields.map(field => {
          const savedField = savedFields.find(sf => sf.rowid === field.rowid);
          return savedField || field;
        });
      }
    }

    // Subscribe to loading state
    this.relationTableService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.isLoading = loading);

    // Subscribe to error messages
    this.relationTableService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error = error);

    // Add this block to handle changes to selectedFields
    if (this.selectedFields && this.selectedFields.length > 0) {
      // Initialize fields on component load if they already exist
      this.initializeFields();
    }

    // Watch for changes to selectedFields input
    this.ngOnChanges$
      .pipe(
        takeUntil(this.destroy$),
        filter(changes => !!changes['selectedFields'])
      )
      .subscribe(changes => {
        const newFields = changes['selectedFields'].currentValue as SelectedField[];
        if (newFields && newFields.length > 0) {
          newFields.forEach((field, index) => {
            if (!field.operator || field.operator.id === 'select') {
              console.log('Field detected without proper operator, setting default operator:', field);
            }
          });
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.ngOnChanges$.next(changes);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
 * Update Archival type labels for all fields when language changes
 */
  private updateArchivalTypeLabels(): void {
    let updated = false;

    this.selectedFields.forEach(field => {
      if (field.parentSelected) {
        if (Array.isArray(field.parentSelected)) {
          // Find all "Archival type [all]" entries and update their labels
          const hasArchivalType = field.parentSelected.some(item => item.id === "0");

          if (hasArchivalType) {
            field.parentSelected = field.parentSelected.map(item => {
              if (item.id === "0") {
                return { id: "0", label: this.getArchivalTypeLabel() };
              }
              return item;
            });
            updated = true;
          }
        } else if (field.parentSelected.id === "0") {
          // Update single selection
          field.parentSelected.label = this.getArchivalTypeLabel();
          updated = true;
        }
      }
    });

    if (updated) {
      this.saveToLocalStorage();
    }
  }

  /**
   * Initialize fields with default values if needed
   */
  private initializeFields(): void {
    if (!this.selectedFields) return;

    let fieldChanged = false;

    this.selectedFields.forEach((field, index) => {
      const valueControl = this.getValueControl(field);

      // Initialize dual values if needed
      if (valueControl && valueControl.dual) {
        if (!Array.isArray(field.value)) {
          field.value = ['', ''];
          fieldChanged = true;
        }
      }

      if (!field.parentSelected ||
        (Array.isArray(field.parentSelected) && field.parentSelected.length === 0)) {
        field.parentSelected = [{
          id: "0",
          label: this.getArchivalTypeLabel()
        }];
        fieldChanged = true;
      } else if (Array.isArray(field.parentSelected) &&
        field.parentSelected.some(item => item.id === "0")) {
        // Update the archival type label if language changed
        field.parentSelected = field.parentSelected.map(item => {
          if (item.id === "0") {
            return {
              id: "0",
              label: this.getArchivalTypeLabel()
            };
          }
          return item;
        });
        fieldChanged = true;
      }

      // Initialize other field properties if needed
      if (field.isParentArray === true && !field.parentSelected) {
        field.parentSelected = [];
        fieldChanged = true;
      }

      // Initialize operator with default
      if (!field.operator || !field.operator.id) {
        this.setDefaultOperator(field, index);
        fieldChanged = true;
      }

      // Initialize operator if needed
      if (!field.operator) {
        field.operator = { id: '', label: '' };
        fieldChanged = true;
      }

      // Initialize touched flags if needed
      if (field.operatorTouched === undefined) {
        field.operatorTouched = false;
        fieldChanged = true;
      }

      if (field.parentTouched === undefined) {
        field.parentTouched = false;
        fieldChanged = true;
      }

      if (field.valueTouched === undefined) {
        field.valueTouched = false;
        fieldChanged = true;
      }
    });

    // Only save if changes were made
    if (fieldChanged) {
      this.relationTableService.saveToLocalStorage(this.selectedFields);
    }
  }

  /**
   * Clear operator data cache (used when language changes)
   */
  private clearOperatorDataCache(): void {
    this.operatorDataCache = {};
  }

  /**
   * Initialize dual value array if it doesn't exist
   * @param value The current value
   * @returns An initialized array with the current values or empty strings
   */
  initDualValue(value: any): any[] {
    if (!value || !Array.isArray(value)) {
      return ['', ''];
    }
    return value;
  }

  /**
 * Handle dual text input value changes
 * @param value The new input value
 * @param field The field being updated
 * @param index The array index (0 for first input, 1 for second input)
 */
  onDualTextValueChange(value: any, field: SelectedField, index: number): void {
    // Make sure the field.value is initialized as an array
    if (!Array.isArray(field.value)) {
      field.value = ['', ''];
    }

    // Update the value at the specific index
    field.value[index] = value;

    // Mark as touched and save to localStorage
    field.valueTouched = true;
    this.saveToLocalStorage();
  }

  /**
 * Handle date input value changes
 * @param value The new value
 * @param field The field being updated
 * @param index Optional index for dual inputs
 */
  onDateValueChange(value: any, field: SelectedField, index?: number): void {
    if (index !== undefined) {
      field.value = this.initDualValue(field.value);
      field.value[index] = value;
    } else {
      field.value = value;
    }
    field.valueTouched = true;
    this.saveToLocalStorage(); // Save to localStorage on each change
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
   * Gets system type data for the dropdown, only including "Archival type [all]" 
   * when nothing is selected
   */
  getSystemTypeDataForDropdown(field: SelectedField): DropdownItem[] {
    // If nothing is selected or only "Archival type [all]" is selected, 
    // include the "Archival type [all]" option
    if (!field.parentSelected ||
      (Array.isArray(field.parentSelected) && field.parentSelected.length === 0) ||
      (Array.isArray(field.parentSelected) && field.parentSelected.length === 1 &&
        field.parentSelected[0].id === "0")) {

      const archivalType: DropdownItem = {
        id: "0",
        label: this.getArchivalTypeLabel(),
        isSpecial: true  // Mark as special to handle differently in the dropdown component if needed
      };

      return [archivalType, ...this.systemTypeData];
    }

    // Otherwise just return the regular system type data
    return this.systemTypeData;
  }

  /**
 * Gets the language-specific label for the "Archival type [all]" option
 */
  private getArchivalTypeLabel(): string {
    // Return different labels based on selected language
    switch (this.selectedLanguage.toLowerCase()) {
      case 'de':
        return 'Archival type [allDE]';
      case 'en':
        return 'Archival type [all]';
      // Add more language cases as needed
      default:
        return 'Archival type [all]';
    }
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
      case 'button':
        operators = this.dropdownDataService.getButtonOperators(this.selectedLanguage);
        break;
      case 'dropdown':
        operators = this.dropdownDataService.getDropdownOperators(this.selectedLanguage);
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
    const control = this.getValueControl(selected);
    if (!control || !control.show) return true;

    if (control.dual) {
      // Check if field.value is properly initialized and has valid values
      if (!Array.isArray(selected.value)) return false;

      if (control.type === this.FieldType.Number) {
        // For number fields, validate both values are valid numbers and not empty
        if (selected.value.length < 2) return false;

        const firstValue = selected.value[0];
        const secondValue = selected.value[1];

        // Use regex to validate actual numbers (requires at least one digit)
        const numRegex = /^-?\d*\.?\d+$/;

        return numRegex.test(String(firstValue)) && numRegex.test(String(secondValue));
      }

      // For other field types
      return selected.value.length >= 2 &&
        !!selected.value[0] && !!selected.value[1];
    }

    // For regular single values
    if (control.type === this.FieldType.Number) {
      if (selected.value === null || selected.value === undefined || selected.value === '')
        return false;

      // Use regex to validate actual numbers (requires at least one digit)
      const numRegex = /^-?\d*\.?\d+$/;
      return numRegex.test(String(selected.value));
    }

    // For other single inputs
    return selected.value !== null && selected.value !== undefined && selected.value !== '';
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
    // Make sure all field values are properly formatted before saving
    const fieldsToSave = this.selectedFields.map(field => {
      const savedField = { ...field };

      // Special handling for object values like dropdown selections
      if (typeof field.value === 'object' && field.value !== null && !Array.isArray(field.value)) {
        // Store both id and label to ensure complete restoration
        savedField.value = { ...field.value };
      }

      return savedField;
    });

    this.relationTableService.saveToLocalStorage(fieldsToSave);
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
    if (field.parentSelected) {
      if (Array.isArray(field.parentSelected)) {
        if (field.parentSelected.some(item => item.id === "0")) {
          return true;
        }
      } else if (field.parentSelected.id === "0") {
        return true;
      }
    }
    return this.relationTableService.isParentValid(field);
  }

  /**
   * Get parent selected values for dropdown binding
   */
  getParentSelectedIds(field: SelectedField): string[] {
    // If no parent is selected, show "Archival type [all]" as selected
    if (!field.parentSelected ||
      (Array.isArray(field.parentSelected) && field.parentSelected.length === 0)) {
      return ["0"];  // Default to "Archival type [all]"
    }

    // If only real options are selected, return those
    if (Array.isArray(field.parentSelected) &&
      !field.parentSelected.some(item => item.id === "0")) {
      return field.parentSelected.map(item => item.id);
    }

    // Otherwise use the regular method
    return this.relationTableService.getParentSelectedIds(field);
  }

  /**
   * Handle parent selection change
   */
  onParentValueChange(selectedDropdownItems: DropdownItem[], index: number): void {
    const field = this.selectedFields[index];

    // Create copies of the selected items to avoid reference issues
    let selectedItems = selectedDropdownItems.map(item => ({ ...item }));

    // Check if user selected some actual options (not "Archival type [all]")
    const hasRealSelections = selectedItems.some(item => item.id !== "0");

    // If real selections exist, remove "Archival type [all]" if it's there
    if (hasRealSelections) {
      selectedItems = selectedItems.filter(item => item.id !== "0");
    }
    // If no real selections but "Archival type [all]" isn't selected, add it
    else if (selectedItems.length === 0) {
      selectedItems = [{
        id: "0",
        label: this.getArchivalTypeLabel()
      }];
    }

    // Update parentSelected with the selected items
    field.parentSelected = selectedItems.length > 0 ? selectedItems : [];

    // Set isParentArray flag to true since we're using multi-select
    field.isParentArray = true;

    // Mark the field as touched for validation
    field.parentTouched = true;

    // Only update the parent object if isParentArray is false
    // For isParentArray=true, keep parent as empty object
    if (!field.isParentArray) {
      if (selectedItems.length > 0) {
        field.parent = {
          id: selectedItems[0].id,
          label: selectedItems[0].label || ''
        };
      } else {
        field.parent = { id: '', label: '' };
      }
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
    this.searchService.getBrandsData(this.selectedLanguage).pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.valueControlService.setBrandData(data);
      });

    // // Load state data example
    this.searchService.getStateData(this.selectedLanguage).pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.valueControlService.setStateData(data);
      });

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
      // if (!this.isParentValid(field)) {
      //   invalidFieldsMessages.push(`Row ${index + 1}: Parent selection`);
      // }

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

  /**
   * Validate number input and ensure it contains only numeric values
   * @param event The input event
   * @param field The field being updated
   */
  validateNumberInput(event: Event, field: SelectedField): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Allow empty value, digits, decimal point, and minus sign (for negative numbers)
    const regex = /^-?\d*\.?\d*$/;

    if (!regex.test(value)) {
      // If invalid, remove the last character
      input.value = value.substring(0, value.length - 1);
      // Update the model
      field.value = input.value;
    }

    // Save to localStorage on each valid change
    this.saveToLocalStorage();
  }

  /**
   * Validate dual number input fields
   * @param event The input event
   * @param field The field being updated
   * @param index The index of the dual input (0 or 1)
   */
  validateDualNumberInput(event: Event, field: SelectedField, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Allow empty value, digits, decimal point, and minus sign (for negative numbers)
    const regex = /^-?\d*\.?\d*$/;

    if (!regex.test(value)) {
      // If invalid, remove the last character
      input.value = value.substring(0, value.length - 1);
      // Update the model
      if (!field.value) field.value = ['', ''];
      field.value[index] = input.value;
    }

    // Save to localStorage on each valid change
    this.saveToLocalStorage();
  }
  /**
   * Handle text input value changes
   * @param value The new value from the input
   * @param field The field being updated
   */
  onTextValueChange(value: any, field: SelectedField): void {
    field.value = value;
    field.valueTouched = true;
    this.saveToLocalStorage(); // Save to localStorage on each change
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
    if (index !== undefined) {
      // Dual button case
      // Ensure field.value is an array
      if (!Array.isArray(selected.value)) {
        selected.value = ['', ''];
      }

      // Set the value at the specified index
      selected.value[index] = 'Selected Item ' + (index + 1);
    } else {
      // Single button case
      selected.value = 'Selected Item';
    }

    selected.valueTouched = true;

    // Save changes to localStorage
    this.relationTableService.saveToLocalStorage(this.selectedFields);
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
  getDualSelectedDropdownValues(field: SelectedField, index: number): string[] {
    // Ensure field.value is an array
    if (!Array.isArray(field.value) || !field.value[index]) {
      return [];
    }

    // Return the ID in an array format for the dropdown
    return field.value[index].id ? [field.value[index].id] : [];
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
    this.saveToLocalStorage();
  }

  // Handle dual dropdown value change
  onDualDropdownValueChange(selectedItems: DropdownItem[], index: number, dualIndex: number): void {
    if (!this.selectedFields[index]) return;

    // Ensure field.value is an array
    if (!Array.isArray(this.selectedFields[index].value)) {
      this.selectedFields[index].value = ['', ''];
    }

    if (selectedItems && selectedItems.length > 0) {
      this.selectedFields[index].value[dualIndex] = selectedItems[0];
    } else {
      this.selectedFields[index].value[dualIndex] = null;
    }

    this.selectedFields[index].valueTouched = true;

    // Save changes to localStorage
    this.relationTableService.saveToLocalStorage(this.selectedFields);
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
    this.saveToLocalStorage();
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
    this.saveToLocalStorage();
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
    this.saveToLocalStorage();
  }

  /**
 * Sets default operator when a field is first added to the table
 * @param field The field to set default operator for
 * @param index The index of the field in the selectedFields array
 */
  setDefaultOperator(field: SelectedField, index: number): void {
    // Skip if operator is already set
    if (field.operator && field.operator.id) {
      return;
    }

    // Get available operators for this field
    const availableOperators = this.getOperatorDataForField(field, index);

    // Find the default operator based on field type
    const defaultOperator = this.relationTableService.findDefaultOperator(field, availableOperators);

    // If a default operator is found, set it
    if (defaultOperator) {
      field.operator = {
        id: defaultOperator.id,
        label: defaultOperator.label || ''
      };

      // Mark as touched to avoid validation errors
      field.operatorTouched = true;

      // Emit the change so parent components can react
      this.operatorValueChange.emit({
        selectedValue: defaultOperator,
        index
      });

      // Save changes
      this.saveToLocalStorage();
    }
  }

  /**
 * Format date from ISO format to display format (DD/MM/yyyy)
 * @param isoDate The date in ISO format
 * @returns Formatted date string
 */
  public formatDateForDisplay(isoDate: string): string {
    if (!isoDate) return '';

    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return ''; // Invalid date

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (e) {
      console.error('Error formatting date:', e);
      return '';
    }
  }

  /**
   * Parse a date from display format (DD/MM/yyyy) to ISO format
   * @param displayDate The date in display format
   * @returns ISO date string
   */
  private parseDisplayDate(displayDate: string): string {
    if (!displayDate) return '';

    try {
      const [day, month, year] = displayDate.split('/');
      if (!day || !month || !year) return '';

      const date = new Date(Number(year), Number(month) - 1, Number(day));
      if (isNaN(date.getTime())) return ''; // Invalid date

      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    } catch (e) {
      console.error('Error parsing date:', e);
      return '';
    }
  }
}