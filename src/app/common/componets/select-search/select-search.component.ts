import { ChangeDetectorRef, Component, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { AccordionSectionComponent } from '../../custom/accordion/accordion-section/accordion-section.component';
import { AccordionItem } from '../../interfaces/accordian-list.interface';
import { BehaviorSubject, catchError, finalize, of, Subject, takeUntil } from 'rxjs';
import { SelectedField } from '../../interfaces/selectedFields.interface';
import { FieldType, FieldTypeMapping } from '../../enums/field-types.enum copy';
import { DropdownDataMapping } from '../../enums/field-types.enum';
import { SearchService } from '../../services/search.service';
import { LanguageService } from '../../services/language.service';
import { CustomAccordionService } from '../../custom/accordion/services/custom-accordion.service';
import { SearchCriteria } from '../../interfaces/search-criteria.interface';
import { DropdownItem } from '../../interfaces/table-dropdown.interface';
import { SearchProcessService } from './services/search-process.service';
import { SelectionService } from './services/selection.service';
import { faL } from '@fortawesome/free-solid-svg-icons';
import { SearchRequest } from '../../interfaces/search-request.interface';
import { TableDropdownComponent } from '../../custom/dropdowns/table-dropdown/table-dropdown.component';
import { StateManagementService } from './services/state-management.service';
import { trackByFn } from './utils/search-utils';
import { FieldServiceService } from './services/field-service.service';
import { StorageService } from './services/storage.service';
import { SearchAccordionService } from './services/search-accordion.service';

@Component({
  selector: 'app-select-search',
  standalone: false,
  templateUrl: './select-search.component.html',
  styleUrl: './select-search.component.scss'
})
export class SelectSearchComponent implements OnInit, OnDestroy {
  // Track component lifecycle
  private destroy$ = new Subject<void>();
  private loadingSubject = new Subject<boolean>();

  // ViewChildren to access accordion sections
  @ViewChildren(AccordionSectionComponent) accordionSections!: QueryList<AccordionSectionComponent>;
  @ViewChildren('firstAccordion') firstAccordionSections!: QueryList<AccordionSectionComponent>;
  @ViewChildren('systemAccordion') systemAccordionSections!: QueryList<AccordionSectionComponent>;
  @ViewChild('systemTypeDropdown') systemTypeDropdown!: TableDropdownComponent;

  // Use specific type if available
  // First System Fields Accordion Data
  public firstSystemFieldsData: AccordionItem[] = [];
  public isParentArray: boolean = false;

  // Loading state management
  public isLoading$ = this.loadingSubject.asObservable();
  public isLoading: boolean = false;
  public loadingSystemTypes: boolean = false;
  public hasError: boolean = false;
  public errorMessage: string = '';

  // System fields accordion data with state tracking
  public systemFieldsAccData: AccordionItem[] = [];

  // For table data fields storage
  public selectedFields: SelectedField[] = [];
  public operationsDDData: any;

  // System type data configuration
  public systemTypeData: DropdownItem[] = [];
  public currentLanguage = 'en';
  public selectedSystemTypeValueIds: string[] = [];
  public selectedSystemTypeValue: DropdownItem | DropdownItem[] | null = null;

  public searchCriteria: SearchCriteria[] = [];

  // UI state management
  public showSaveContainer: boolean = false;
  public isEditMode: boolean = false;
  public isDeleteMode: boolean = false;
  public searchName: string = '';
  public searchNameId: string = '';
  public currentGroupField: SearchRequest | null = null;
  // Add loading state for saved groups
  public loadingSavedGroups: boolean = false;

  // Computed property for group data display
  set showGroupDataOutside(value: boolean) {
    this.stateService.setShowGroupDataOutside(value);
  }

  get showGroupDataOutside(): boolean {
    return this.stateService.getShowGroupDataOutside();
  }

  // Track by function for ngFor performance optimization
  trackByFn = trackByFn;

  constructor(
    private searchService: SearchService,
    private changeDtr: ChangeDetectorRef,
    private languageService: LanguageService,
    private accordionService: SearchAccordionService,
    private searchProcessService: SearchProcessService,
    private selectionService: SelectionService,
    private stateService: StateManagementService,
    private fieldService: FieldServiceService,
    private storageService: StorageService,
  ) { }

  ngOnInit(): void {
    // Subscribe to language changes
    this.languageService.language$
      .pipe(takeUntil(this.destroy$))
      .subscribe(lang => {
        this.currentLanguage = lang;
        this.loadDataForCurrentLanguage();
      });



    // Subscribe to system fields data changes
    this.fieldService.firstSystemFieldsData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.firstSystemFieldsData = data;
      });

    // Subscribe to system fields accordion data changes
    this.fieldService.systemFieldsAccData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.systemFieldsAccData = data;
      });

    // Subscribe to system type data changes
    this.fieldService.systemTypeData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.systemTypeData = data;
      });

    // Subscribe to loading state changes
    this.fieldService.loadingSystemTypes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loadingSystemTypes = loading;
      });

    // Subscribe to field loading state changes
    this.fieldService.loadingFields$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
        this.loadingSubject.next(loading);
      });

    // Subscribe to error state changes
    this.fieldService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.hasError = error.hasError;
        this.errorMessage = error.message;
      });

    // Subscribe to system type value changes
    this.stateService.selectedSystemTypeValue$
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.selectedSystemTypeValue = value;
        this.updateSelectedSystemTypeValueIds();
      });

    // Subscribe to selected fields changes
    this.selectionService.selectedFields$
      .pipe(takeUntil(this.destroy$))
      .subscribe(fields => {
        this.selectedFields = fields;
      });

    // Load stored values from localStorage
    this.loadSelectedSystemTypeValuesFromStorage();
  }


  // Update field labels when language changes
  updateFieldLabelsForLanguage(): void {
    // Get maps with the latest data in the current language
    const firstSystemFieldsMap = this.fieldService.getFirstSystemFieldsMap();
    const systemFieldsMap = this.fieldService.getSystemFieldsMap();

    // Update all selected fields with the new language labels
    this.selectionService.updateFieldLabels(
      firstSystemFieldsMap,
      systemFieldsMap,
      this.systemTypeData,
      this.currentLanguage
    );
  }

  // Load data for current language
  loadDataForCurrentLanguage(): void {
    // Load system type fields
    this.fieldService.loadSystemTypeFields(this.currentLanguage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update selectedSystemTypeValue with the new language labels
          this.updateSelectedSystemTypeLabelsForLanguage();

          // After loading system types, load first accordion data
          this.fieldService.loadFirstAccordionData(this.currentLanguage)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                // Now that we have the first accordion data, update field labels
                this.updateFieldLabelsForLanguage();
              }
            });

          // Load system fields data if we have selected system types
          if (this.selectedSystemTypeValueIds.length > 0) {
            this.fieldService.loadAccordionData(
              this.selectedSystemTypeValueIds,
              this.currentLanguage
            )
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  // Now that we have the system fields data, update field labels again
                  this.updateFieldLabelsForLanguage();
                }
              });
          }
        },
        error: () => {
          this.hasError = true;
          this.errorMessage = 'Failed to load data. Please try again.';
        }
      });
  }

  // Add this new method to update the selectedSystemTypeValue labels
  private updateSelectedSystemTypeLabelsForLanguage(): void {
    if (!this.selectedSystemTypeValue) return;

    // Create a map for quick lookup of new labels
    const systemTypeMap = new Map<string, DropdownItem>();
    this.systemTypeData.forEach(item => systemTypeMap.set(item.id, item));

    if (Array.isArray(this.selectedSystemTypeValue)) {
      // Update the labels for each item in the array
      this.selectedSystemTypeValue = this.selectedSystemTypeValue.map(item => {
        const updatedType = systemTypeMap.get(item.id);
        if (updatedType) {
          return {
            id: item.id,
            label: updatedType.label
          };
        }
        return item;
      });
    } else {
      // Update the label for the single item
      const updatedType = systemTypeMap.get(this.selectedSystemTypeValue.id);
      if (updatedType) {
        this.selectedSystemTypeValue = {
          id: this.selectedSystemTypeValue.id,
          label: updatedType.label
        };
      }
    }

    // Make sure to update the state service too
    this.stateService.setSelectedSystemTypeValue(this.selectedSystemTypeValue);
  }

  // Load selected values from localStorage
  loadSelectedSystemTypeValuesFromStorage(): void {
    this.selectedSystemTypeValue = this.stateService.getSelectedSystemTypeValue();
    this.updateSelectedSystemTypeValueIds();

    // Load fields for the selected system types
    if (this.selectedSystemTypeValueIds.length > 0) {
      this.fieldService.loadAccordionData(this.selectedSystemTypeValueIds, this.currentLanguage)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
  }

  // Update the IDs array based on selected values
  updateSelectedSystemTypeValueIds(): void {
    if (!this.selectedSystemTypeValue) {
      this.selectedSystemTypeValueIds = [];
      return;
    }

    if (Array.isArray(this.selectedSystemTypeValue)) {
      this.selectedSystemTypeValueIds = this.selectedSystemTypeValue.map(item => item.id);
    } else {
      this.selectedSystemTypeValueIds = [this.selectedSystemTypeValue.id];
    }
  }

  // Handle system type selection change - matches the event in HTML
  onSelectedSystemTypeValueChange(event: any): void {
    this.stateService.setSelectedSystemTypeValue(event);
    this.updateSelectedSystemTypeValueIds();

    if (this.selectedSystemTypeValueIds.length > 0) {
      this.fieldService.loadAccordionData(this.selectedSystemTypeValueIds, this.currentLanguage)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    } else {
      this.fieldService.clearSystemFieldsAccData();
    }
  }

  // Handle accordion item selection from first accordion
  onFirstAccFieldSelected(item: any): void {
    const field = this.searchProcessService.extractFieldFromItem(item);
    if (!field) return;

    this.isParentArray = true; // Reset parent array state

    // First accordion items always have no parent
    const emptyParent = { id: '', label: '' };
    this.isEditMode = false;
    this.selectionService.addField(field, emptyParent, '', this.currentLanguage, this.isParentArray);
  }

  // Handle accordion item selection from system accordion
  onFieldSelected(event: any): void {
    const field = this.searchProcessService.extractFieldFromItem(event);
    if (!field) return;

    // For system fields, get the appropriate parent from the selectedSystemTypeValue
    let parentObj;

    // Use the selectedSystemTypeValue directly as the parent
    // This is the key change - use the actual system type rather than event.parent
    if (this.selectedSystemTypeValue) {
      // Handle both single and multiple selection
      if (Array.isArray(this.selectedSystemTypeValue)) {
        // If multiple system types are selected, use the first one as parent
        if (this.selectedSystemTypeValue.length > 0) {
          const firstItem = this.selectedSystemTypeValue[0];
          parentObj = {
            id: firstItem.id || '', // Add fallback for undefined id
            label: firstItem.label || '' // Add fallback for undefined label
          };
        } else {
          parentObj = { id: '', label: '' };
        }
      } else {
        // Single system type selection
        parentObj = {
          id: this.selectedSystemTypeValue.id || '', // Add fallback for undefined id
          label: this.selectedSystemTypeValue.label || '' // Add fallback for undefined label
        };
      }
    } else {
      // If no system type is selected, use empty parent
      parentObj = { id: '', label: '' };
    }

    this.isEditMode = false;

    this.selectionService.addField(
      field,
      parentObj,
      event?.path || '',
      this.currentLanguage
    );
  }
  // Clean up and prevent memory leaks
  ngOnDestroy(): void {
    // Complete all subjects
    this.destroy$.next();
    this.destroy$.complete();
    this.loadingSubject.complete();
  }

  // Clear the relation table - matches clearTable() in HTML
  clearTable(): void {
    // Clear selected fields in relation table
    this.selectionService.clearFields();
    // Clear accordion selections and state
    this.accordionService.clearAccordionState();
    // Reset all application state
    this.stateService.resetAllState();
    // Update component state to match
    this.selectedSystemTypeValue = null;
    this.selectedSystemTypeValueIds = [];
    // Clear system fields accordion data
    this.fieldService.clearSystemFieldsAccData();
    // Clear localStorage items to ensure persistence across page refreshes
    this.storageService.removeItem('selectedFields');
    this.storageService.removeItem('selectedSystemTypeValues');
    this.storageService.removeItem('savedAccordionState');
    // Clear saved-group-accordion's state
    localStorage.removeItem('savedAccordionState');
    // Force expansion state reset on accordion sections using ViewChildren reference
    if (this.firstAccordionSections) {
      this.firstAccordionSections.forEach(section => section.collapse());
    }
    if (this.systemAccordionSections) {
      this.systemAccordionSections.forEach(section => section.collapse());
    }
    // Reset the dropdown component if it exists
    if (this.systemTypeDropdown) {
      this.systemTypeDropdown.reset();
    }
    // Reset any error messages
    this.hasError = false;
    this.errorMessage = '';
    // Force change detection to ensure UI updates immediately
    this.changeDtr.detectChanges();
  }
}