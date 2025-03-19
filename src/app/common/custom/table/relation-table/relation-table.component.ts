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

  systemTypeData: DropdownItem[] = [];
  isLoading = false;
  error = '';

  // Cache for operator data by field type
  private operatorDataCache: { [fieldType: string]: DropdownItem[] } = {};

  constructor(
    private relationTableService: RelationTableService,
    private languageService: LanguageService,
    private fieldService: FieldServiceService,
    private dropdownDataService: DropdownDataService,
    private operatorTableService: OperatorTableService
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
   * Get field type for a selected field
   */
  getFieldType(field: SelectedField): string {
    if (!field.field || !field.field.id) return 'string'; // Default to string

    const fieldId = field.field.id;

    // Check field type mapping
    for (const [key, value] of Object.entries(FieldTypeMapping)) {
      if (key.includes(fieldId)) {
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
          case FieldType.Text:
            return 'string';
          case FieldType.Dropdown:
          default:
            return 'string';
        }
      }
    }

    return 'string'; // Default to string if type not found
  }

  /**
   * Get operator data for a specific field
   */
  getOperatorDataForField(field: SelectedField, index: number): DropdownItem[] {
    const fieldType = this.getFieldType(field);
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
}