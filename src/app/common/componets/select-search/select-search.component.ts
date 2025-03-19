import { ChangeDetectorRef, Component, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { AccordionSectionComponent } from '../../custom/accordion/accordion-section/accordion-section.component';
import { AccordionItem } from '../../interfaces/accordian-list.interface';
import { Subject, takeUntil } from 'rxjs';
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
import { trackByFn } from './utils/search-utils';

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

  // Data properties
  public firstSystemFieldsData: AccordionItem[] = [];
  public systemFieldsAccData: AccordionItem[] = [];
  public systemTypeData: DropdownItem[] = [];
  public selectedFields: SelectedField[] = [];
  public selectedSystemTypeValueIds: string[] = [];
  public selectedSystemTypeValue: DropdownItem | DropdownItem[] | null = null;
  public searchCriteria: SearchCriteria[] = [];
  public currentGroupField: SearchRequest | null = null;

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
  }

  get showGroupDataOutside(): boolean {
    return this.stateService.getShowGroupDataOutside();
  }

  constructor(
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
    this.setupSubscriptions();
    this.loadSelectedSystemTypeValuesFromStorage();
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

    this.selectionService.addField(
      field,
      parentObj,
      event?.path || '',
      this.currentLanguage
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
   * Clear the relation table
   */
  clearTable(): void {
    this.resetSelections();
    this.resetAccordionState();
    this.resetSystemTypeData();
    this.storageService.clearStorageData();
    this.resetErrorState();
    this.resetUIElements();
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

  /**
   * Component cleanup
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.loadingSubject.complete();
  }
}