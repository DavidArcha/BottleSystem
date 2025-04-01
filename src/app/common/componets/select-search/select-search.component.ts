import { ChangeDetectorRef, Component, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { AccordionSectionComponent } from '../../custom/accordion/accordion-section/accordion-section.component';
import { AccordionItem } from '../../interfaces/accordian-list.interface';
import { finalize, Subject, takeUntil } from 'rxjs';
import { SelectedField } from '../../interfaces/selectedFields.interface';
import { DropdownItem } from '../../interfaces/table-dropdown.interface';
import { SearchCriteria } from '../../interfaces/search-criteria.interface';
import { SearchRequest } from '../../interfaces/search-request.interface';
import { TableDropdownComponent } from '../../custom/dropdowns/table-dropdown/table-dropdown.component';
import { LanguageService } from '../../services/language.service';
import { SearchProcessService } from './services/search-process.service';
import { SelectionService } from './services/selection.service';
import { StateManagementService } from './services/state-management.service';
import { FieldServiceService } from './services/field-service.service';
import { StorageService } from './services/storage.service';
import { SearchAccordionService } from './services/search-accordion.service';
import { isFieldValid, trackByFn } from './utils/search-utils';
import { SearchService } from '../../services/search.service';

@Component({
  selector: 'app-select-search',
  standalone: false,
  templateUrl: './select-search.component.html',
  styleUrl: './select-search.component.scss'
})
export class SelectSearchComponent implements OnInit, OnDestroy {
  // Lifecycle tracking
  private destroy$ = new Subject<void>();
  private loadingSubject = new Subject<boolean>();

  // ViewChildren references
  @ViewChildren(AccordionSectionComponent) accordionSections!: QueryList<AccordionSectionComponent>;
  @ViewChildren('firstAccordion') firstAccordionSections!: QueryList<AccordionSectionComponent>;
  @ViewChildren('systemAccordion') systemAccordionSections!: QueryList<AccordionSectionComponent>;
  @ViewChild('systemTypeDropdown') systemTypeDropdown!: TableDropdownComponent;
  @ViewChild('relationTable') relationTable: any;
  // Data properties
  public firstSystemFieldsData: AccordionItem[] = [];
  public systemFieldsAccData: AccordionItem[] = [];
  public systemTypeData: DropdownItem[] = [];
  public selectedFields: SelectedField[] = [];
  public selectedSystemTypeValueIds: string[] = [];
  public selectedSystemTypeValue: DropdownItem | DropdownItem[] | null = null;
  public searchCriteria: SearchCriteria[] = [];
  public currentGroupField: SearchRequest | null = null;

  // Saved search groups (from backend or local storage)
  public savedGroupFields: any[] = [];

  // UI state properties
  public isParentArray = false;
  public isLoading$ = this.loadingSubject.asObservable();
  public isLoading = false;
  public loadingSystemTypes = false;
  public hasError = false;
  public errorMessage = '';
  public showSaveContainer = false;
  public isEditMode = false;
  public isDeleteMode = false;
  public searchName = '';
  public searchNameId = '';
  public loadingSavedGroups = false;
  public currentLanguage = 'en';
  public operationsDDData: any;

  // Performance optimization
  trackByFn = trackByFn;

  // Computed property for group data display
  set showGroupDataOutside(value: boolean) {
    this.stateService.setShowGroupDataOutside(value);
    // If checkbox is checked and we don't have any saved groups loaded yet, load them
    if (value) {
      this.loadSavedSearches();
    }
  }

  get showGroupDataOutside(): boolean {
    return this.stateService.getShowGroupDataOutside();
  }

  public searchLocation: string = 'inArchival';
  public searchMethod: string = '1';
  public langDe: boolean = true;  // German selected by default
  public langEn: boolean = false; // English not selected by default
  public caseSensitive: boolean = false;

  // Replace the single searchOptionsDisabled with these variables:
  public intoSelectionDisabled = true;
  public intoResultDisabled = true;
  public replaceDisabled = true;
  public mergeDisabled = true;
  public currentResultDisabled = true;

  constructor(
    private changeDtr: ChangeDetectorRef,
    private languageService: LanguageService,
    private accordionService: SearchAccordionService,
    private searchProcessService: SearchProcessService,
    private selectionService: SelectionService,
    private stateService: StateManagementService,
    private fieldService: FieldServiceService,
    private storageService: StorageService,
    private searchService: SearchService,
  ) { }

  ngOnInit(): void {
    this.setupSubscriptions();
    this.loadSelectedSystemTypeValuesFromStorage();
    this.loadSelectedFieldsFromStorage();
  }

  /**
  * Load selected fields from storage
  */
  private loadSelectedFieldsFromStorage(): void {
    // This will trigger the selectionService to load and emit the stored selected fields
    this.selectionService.loadSelectedFieldsFromStorage(this.currentLanguage);
  }

  /**
   * Set up all component subscriptions
   */
  private setupSubscriptions(): void {
    // Language subscription
    this.languageService.language$
      .pipe(takeUntil(this.destroy$))
      .subscribe(this.handleLanguageChange.bind(this));

    // Data subscriptions
    this.subscribeToFieldServiceData();
    this.subscribeToStateData();
  }

  /**
   * Subscribe to all field service data streams
   */
  private subscribeToFieldServiceData(): void {
    this.fieldService.firstSystemFieldsData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.firstSystemFieldsData = data);

    this.fieldService.systemFieldsAccData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.systemFieldsAccData = data);

    this.fieldService.systemTypeData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.systemTypeData = data);

    this.fieldService.loadingSystemTypes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loadingSystemTypes = loading);

    this.fieldService.loadingFields$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
        this.loadingSubject.next(loading);
      });

    this.fieldService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.hasError = error.hasError;
        this.errorMessage = error.message;
      });
  }

  /**
   * Subscribe to state management data
   */
  private subscribeToStateData(): void {
    this.stateService.selectedSystemTypeValue$
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.selectedSystemTypeValue = value;
        this.updateSelectedSystemTypeValueIds();
      });

    this.selectionService.selectedFields$
      .pipe(takeUntil(this.destroy$))
      .subscribe(fields => this.selectedFields = fields);

    // Subscribe to saved group fields
    this.stateService.savedGroupFields$
      .pipe(takeUntil(this.destroy$))
      .subscribe(groups => this.savedGroupFields = groups);
  }

  /**
   * Handle language change
   */
  private handleLanguageChange(lang: string): void {
    this.currentLanguage = lang;
    this.loadDataForCurrentLanguage();
  }

  /**
   * Load data for current language
   */
  loadDataForCurrentLanguage(): void {
    this.fieldService.loadSystemTypeFields(this.currentLanguage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.handleSystemTypeFieldsLoaded(),
        error: () => this.setError('Failed to load data. Please try again.')
      });
  }

  /**
   * Handle system type fields loaded
   */
  private handleSystemTypeFieldsLoaded(): void {
    this.updateSelectedSystemTypeLabelsForLanguage();

    // Load first accordion data
    this.fieldService.loadFirstAccordionData(this.currentLanguage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.updateFieldLabelsForLanguage()
      });

    // Load system fields data if we have selected system types
    if (this.selectedSystemTypeValueIds.length > 0) {
      this.loadSystemFieldsData();
    }
  }

  /**
   * Load system fields data for selected system types
   */
  private loadSystemFieldsData(): void {
    this.fieldService.loadAccordionData(
      this.selectedSystemTypeValueIds,
      this.currentLanguage
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.updateFieldLabelsForLanguage()
      });
  }

  /**
   * Set error state
   */
  private setError(message: string): void {
    this.hasError = true;
    this.errorMessage = message;
  }

  /**
   * Update field labels when language changes
   */
  updateFieldLabelsForLanguage(): void {
    const firstSystemFieldsMap = this.fieldService.getFirstSystemFieldsMap();
    const systemFieldsMap = this.fieldService.getSystemFieldsMap();

    this.selectionService.updateFieldLabels(
      firstSystemFieldsMap,
      systemFieldsMap,
      this.systemTypeData,
      this.currentLanguage
    );
  }

  /**
   * Update system type labels for current language
   */
  private updateSelectedSystemTypeLabelsForLanguage(): void {
    if (!this.selectedSystemTypeValue) return;

    const systemTypeMap = new Map<string, DropdownItem>();
    this.systemTypeData.forEach(item => systemTypeMap.set(item.id, item));

    if (Array.isArray(this.selectedSystemTypeValue)) {
      this.selectedSystemTypeValue = this.selectedSystemTypeValue.map(item => {
        const updatedType = systemTypeMap.get(item.id);
        return updatedType ?
          { id: item.id, label: updatedType.label } :
          item;
      });
    } else {
      const updatedType = systemTypeMap.get(this.selectedSystemTypeValue.id);
      if (updatedType) {
        this.selectedSystemTypeValue = {
          id: this.selectedSystemTypeValue.id,
          label: updatedType.label
        };
      }
    }

    this.stateService.setSelectedSystemTypeValue(this.selectedSystemTypeValue);
  }

  /**
   * Load selected system type values from storage
   */
  loadSelectedSystemTypeValuesFromStorage(): void {
    this.selectedSystemTypeValue = this.stateService.getSelectedSystemTypeValue();
    this.updateSelectedSystemTypeValueIds();

    if (this.selectedSystemTypeValueIds.length > 0) {
      this.fieldService.loadAccordionData(
        this.selectedSystemTypeValueIds,
        this.currentLanguage
      )
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
  }

  /**
   * Update selected system type value IDs array
   */
  updateSelectedSystemTypeValueIds(): void {
    if (!this.selectedSystemTypeValue) {
      this.selectedSystemTypeValueIds = [];
      return;
    }

    this.selectedSystemTypeValueIds = Array.isArray(this.selectedSystemTypeValue) ?
      this.selectedSystemTypeValue.map(item => item.id) :
      [this.selectedSystemTypeValue.id];
  }

  /**
   * Handle system type selection change
   */
  onSelectedSystemTypeValueChange(event: any): void {
    this.stateService.setSelectedSystemTypeValue(event);
    this.updateSelectedSystemTypeValueIds();

    // Collapse all system accordion sections when system type changes
    if (this.systemAccordionSections) {
      this.systemAccordionSections.forEach(section => section.collapse());
    }

    if (this.selectedSystemTypeValueIds.length > 0) {
      this.fieldService.loadAccordionData(
        this.selectedSystemTypeValueIds,
        this.currentLanguage
      )
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    } else {
      this.fieldService.clearSystemFieldsAccData();
    }
  }

  /**
   * Handle accordion item selection from first accordion
   */
  onFirstAccFieldSelected(item: any): void {
    const field = this.searchProcessService.extractFieldFromItem(item);
    if (!field) return;

    this.isParentArray = true;
    const emptyParent = { id: '', label: '' };
    this.isEditMode = false;

    this.selectionService.addField(
      field,
      emptyParent,
      '',
      this.currentLanguage,
      this.isParentArray
    );
  }

  /**
   * Handle accordion item selection from system accordion
   */
  onFieldSelected(event: any): void {
    const field = this.searchProcessService.extractFieldFromItem(event);
    if (!field) return;

    const parentObj = this.getParentFromSystemType();
    this.isEditMode = false;
    this.isParentArray = false;

    this.selectionService.addField(
      field,
      parentObj,
      event?.path || '',
      this.currentLanguage,
      this.isParentArray
    );
  }

  /**
   * Get parent object from system type selection
   */
  private getParentFromSystemType(): { id: string, label: string } {
    if (!this.selectedSystemTypeValue) {
      return { id: '', label: '' };
    }

    if (Array.isArray(this.selectedSystemTypeValue)) {
      return this.selectedSystemTypeValue.length > 0 ?
        {
          id: this.selectedSystemTypeValue[0].id || '',
          label: this.selectedSystemTypeValue[0].label || ''
        } :
        { id: '', label: '' };
    }

    return {
      id: this.selectedSystemTypeValue.id || '',
      label: this.selectedSystemTypeValue.label || ''
    };
  }

  /**
   * Load saved searches from the server
   */
  loadSavedSearches(): void {
    this.loadingSavedGroups = true;
    this.searchService.getAllSavedSearches()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loadingSavedGroups = false)
      )
      .subscribe({
        next: (response: any) => {
          if (response && response.groupFields) {
            console.log('Saved searches loaded:', response);
            this.stateService.setSavedGroupFields(response);
          } else {
            this.stateService.setSavedGroupFields([]);
          }
          this.isLoading = false;
          this.loadingSavedGroups = false;

        },
        error: (error) => {
          console.error('Error loading saved searches:', error);
          this.errorMessage = 'Failed to load saved searches. Please try again later.';
          this.stateService.setSavedGroupFields([]);
        }
      });
  }

  /**
   * Handle saved field selection
   */
  onSavedFieldSelected(field: SearchCriteria): void {
    if (!field) return;
    // First clear existing fields and table data
    this.selectionService.clearFields();
    this.isEditMode = true;
    this.selectionService.addSavedGroupField(field);
  }

  /**
   * Handle saved group field title clicked
   */
  onSavedGroupFieldTitleClicked(groupField: SearchRequest): void {
    if (!groupField) return;

    this.selectionService.clearFields();
    // Check if the title and title.id exists
    if (groupField.title && groupField.title.id) {
      this.isEditMode = true;
      this.searchName = groupField.title.label;
      this.searchNameId = groupField.title.id;
    } else {
      console.log('Saved group field has no title ID');
    }
    this.selectionService.addSavedGroup(groupField);
  }



  // Handle delete field action in relation table
  onDeleteSelectedField(index: number): void {
    this.selectionService.deleteField(index);
  }

  // Handle search action from relation table
  onSearchSelectedField(event: any): void {
    console.log('Search for field', event);
  }

  /**
   * Clear the relation table
   */
  clearTable(): void {
    this.resetSelections();
    this.resetAccordionState();
    this.resetSystemTypeData();
    this.storageService.clearStorageData();
    this.resetErrorState();
    this.resetUIElements();

    // Reset all disabled states
    this.intoSelectionDisabled = true;
    this.intoResultDisabled = true;
    this.replaceDisabled = true;
    this.mergeDisabled = true;
    this.currentResultDisabled = true;

    // Reset to default selections
    this.searchLocation = 'inArchival';
    this.searchMethod = 'newSearch';
  }

  /**
   * Reset selections and state
   */
  private resetSelections(): void {
    this.selectionService.clearFields();
    this.stateService.resetAllState();
  }

  /**
   * Reset accordion state
   */
  private resetAccordionState(): void {
    this.accordionService.clearAccordionState();
  }

  /**
   * Reset system type data
   */
  private resetSystemTypeData(): void {
    this.selectedSystemTypeValue = null;
    this.selectedSystemTypeValueIds = [];
    this.fieldService.clearSystemFieldsAccData();
  }

  /**
   * Reset error state
   */
  private resetErrorState(): void {
    this.hasError = false;
    this.errorMessage = '';
  }

  /**
   * Reset UI elements
   */
  private resetUIElements(): void {
    if (this.firstAccordionSections) {
      this.firstAccordionSections.forEach(section => section.collapse());
    }

    if (this.systemAccordionSections) {
      this.systemAccordionSections.forEach(section => section.collapse());
    }

    if (this.systemTypeDropdown) {
      this.systemTypeDropdown.reset();
    }

    this.changeDtr.detectChanges();
  }

  // Handle search button click - matches searchTable() in HTML
  searchTable(): void {
    // Existing validation logic...
    const validationResult = this.relationTable.validateAllFields();
    if (!validationResult.isValid) {
      this.hasError = true;
      this.errorMessage = `Please complete all required fields: ${validationResult.invalidFields.join(', ')}`;
      return;
    }

    // Convert selected fields to search criteria format
    const searchCriteria = this.selectionService.convertSelectedFieldsToSearchCriteria(this.selectedFields);
    this.searchCriteria = searchCriteria;

    // Include search options in the search - use individual language variables
    const searchOptions = {
      location: this.searchLocation,
      method: this.searchMethod,
      languages: {
        de: this.langDe,  // Use the individual variable instead of the object property
        en: this.langEn   // Use the individual variable instead of the object property
      },
      caseSensitive: this.caseSensitive
    };

    console.log('Search criteria:', searchCriteria);
    console.log('Search options:', searchOptions);

    // Enable specific radio buttons based on conditions
    // For now, as per temporary test requirement:
    // - Enable "Into Selection" 
    // - Keep "Into Result" disabled
    this.intoSelectionDisabled = false;
    this.intoResultDisabled = true;

    // For radio-group-2, enable some options as an example
    this.replaceDisabled = false;
    this.mergeDisabled = false;
    this.currentResultDisabled = true;

    // Execute the search via the search service
    // ... existing search logic ...

    this.isLoading = false;
    this.loadingSubject.next(false);
    this.cancelSave();
  }

  // Handle store button click - matches storeTable() in HTML
  saveTable(): void {
    // Check if there are fields to save
    if (this.selectedFields.length === 0) {
      this.hasError = true;
      this.errorMessage = 'Please add fields before saving.';
      return;
    }

    const validationResult = this.relationTable.validateAllFields();
    if (!validationResult.isValid) {
      this.hasError = true;
      this.errorMessage = `Please complete all required fields: ${validationResult.invalidFields.join(', ')}`;
      return;
    }

    // Show the save container
    this.showSaveContainer = true;
    this.isDeleteMode = false;
    this.searchName = '';
    this.currentGroupField = null;
  }

  // Save the current search
  saveSearch(): void {
    // Show loading state
    this.isLoading = true;
    this.loadingSubject.next(true);
    this.saveFreshSearchData(this.searchName);
    this.cancelSave();
  }

  // Add this new method to handle fresh search data saving
  saveFreshSearchData(searchName: string): void {
    // Validate the search name
    if (!searchName || searchName.trim() === '') {
      this.hasError = true;
      this.errorMessage = 'Please enter a name for your search.';
      return;
    }

    // Validate selected fields
    if (this.selectedFields.length === 0) {
      this.hasError = true;
      this.errorMessage = 'Please add fields before saving.';
      return;
    }

    // Step 1: Convert selectedFields to searchCriteria
    const searchCriteria = this.selectionService.convertSelectedFieldsToSearchCriteria(this.selectedFields);

    // Step 2: Create a searchRequest object with the criteria
    const searchRequest: SearchRequest = {
      title: {
        id: '',
        label: searchName.trim()
      },
      fields: searchCriteria
    };

    console.log('Search criteria:', searchRequest);

    // Step 3: Save the search request
    this.searchService.saveSearchRequest(searchRequest);
    this.isLoading = false;
    this.loadingSubject.next(false);
    this.cancelSave();
  }

  // Cancel save/edit/delete operation
  cancelSave(): void {
    // Reset all state variables
    this.showSaveContainer = false;
    this.isEditMode = false;
    this.isDeleteMode = false;
    this.searchName = '';
    this.currentGroupField = null;
    this.hasError = false;
    this.errorMessage = '';
  }

  /**
   * Component cleanup
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.loadingSubject.complete();
  }
}