import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SelectedField } from '../../../interfaces/selectedFields.interface';
import { DropdownItem } from '../../../interfaces/table-dropdown.interface';
import { SearchService } from '../../../services/search.service';
import { LanguageService } from '../../../services/language.service';
import { RelationTableService } from '../services/relation-table.service';
import { FieldServiceService } from '../../../componets/select-search/services/field-service.service';

@Component({
  selector: 'app-relation-table',
  standalone: false,
  templateUrl: './relation-table.component.html',
  styleUrl: './relation-table.component.scss'
})
export class RelationTableComponent {
  private destroy$ = new Subject<void>();

  @Input() selectedFields: SelectedField[] = [];
  @Input() selectedLanguage: string = 'de';
  @Output() parentValueChange = new EventEmitter<{ selectedValues: DropdownItem[], index: number }>();

  systemTypeData: DropdownItem[] = [];
  isLoading = false;
  error = '';

  constructor(
    private relationTableService: RelationTableService,
    private languageService: LanguageService, private fieldService: FieldServiceService
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
    });
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