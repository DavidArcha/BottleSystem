import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, HostListener, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { SearchCriteria } from '../../../interfaces/search-criteria.interface';
import { SearchRequest } from '../../../interfaces/search-request.interface';
import { SavedGroupService } from '../services/saved-group.service';
import { SavedGroupStateService } from '../services/saved-group-state.service';

@Component({
  selector: 'app-saved-group-accordion',
  standalone: false,
  templateUrl: './saved-group-accordion.component.html',
  styleUrl: './saved-group-accordion.component.scss'
})
export class SavedGroupAccordionComponent implements OnInit, OnDestroy {
  private _groups: any[] = [];
  private destroy$ = new Subject<void>();

  @Input() set groups(value: SearchRequest[] | any[] | any) {
    this._groups = this.savedGroupService.processGroups(value);

    // Update the selected field based on the updated groups
    const savedState = this.savedGroupService.getState();
    if (savedState?.selectedField) {
      this.selectedField = this.stateService.findField(savedState.selectedField, this._groups);
    }

    this.cdr.markForCheck();
  }

  get groups(): any[] {
    return this._groups;
  }

  @Input() selectedField: SearchCriteria | any = null;
  @Output() fieldSelected = new EventEmitter<SearchCriteria>();
  @Output() groupFieldTitleClicked = new EventEmitter<SearchRequest>();
  @Output() editGroupFieldTitle = new EventEmitter<SearchRequest>();
  @Output() deleteGroupFieldTitle = new EventEmitter<SearchRequest>();

  // State variables
  expandedGroups: Set<string> = new Set();
  expandedFields: Set<string> = new Set();
  isLoading = false;
  hasError = false;
  errorMessage: string | null = null;

  // Context menu properties
  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  selectedFieldGroup: any = null;

  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
    private savedGroupService: SavedGroupService,
    private stateService: SavedGroupStateService
  ) { }

  ngOnInit(): void {
    // Subscribe to state changes
    this.stateService.expandedGroups$
      .pipe(takeUntil(this.destroy$))
      .subscribe(groups => {
        this.expandedGroups = groups;
        this.cdr.markForCheck();
      });

    this.stateService.expandedFields$
      .pipe(takeUntil(this.destroy$))
      .subscribe(fields => {
        this.expandedFields = fields;
        this.cdr.markForCheck();
      });

    this.stateService.selectedField$
      .pipe(takeUntil(this.destroy$))
      .subscribe(field => {
        if (field && field !== this.selectedField) {
          this.selectedField = field;
          this.cdr.markForCheck();
        }
      });

    this.stateService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
        this.cdr.markForCheck();
      });

    this.stateService.hasError$
      .pipe(takeUntil(this.destroy$))
      .subscribe(hasError => {
        this.hasError = hasError;
        this.cdr.markForCheck();
      });

    this.stateService.errorMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        this.errorMessage = message;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.savedGroupService.clearCache();
  }

  /**
   * Toggle a group's expanded state
   */
  toggleGroup(groupId: string): void {
    this.stateService.toggleGroup(groupId, this.groups);
    this.contextMenuVisible = false;
  }

  /**
   * Toggle a field's expanded state
   */
  toggleField(fieldGroupId: string): void {
    this.stateService.toggleField(fieldGroupId);
    this.contextMenuVisible = false;
  }

  /**
   * Handle click on a field
   */
  onFieldClick(field: SearchCriteria, event: Event): void {
    event.preventDefault();
    this.contextMenuVisible = false;
    this.selectedField = field;
    this.stateService.selectField(field);
    this.fieldSelected.emit(field);
  }

  /**
   * Handle click on a group field title
   */
  onGroupFieldTitleClick(fieldGroup: SearchRequest, event: Event): void {
    event.preventDefault();
    this.contextMenuVisible = false;
    this.groupFieldTitleClicked.emit(fieldGroup);
  }

  /**
   * Handle right-click on a group field title
   */
  onGroupFieldTitleRightClick(event: MouseEvent, fieldGroup: any): void {
    event.preventDefault();
    this.contextMenuVisible = true;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.contextMenuPosition = {
      x: rect.left,
      y: rect.bottom
    };

    this.selectedFieldGroup = fieldGroup;
    this.cdr.markForCheck();
  }

  /**
   * Collapse all groups and fields
   */
  public collapseAll(): void {
    this.stateService.reset();
    this.contextMenuVisible = false;
    this.cdr.markForCheck();
  }

  /**
   * Handle click on edit option in context menu
   */
  onEditGroupFieldTitle(): void {
    if (this.selectedFieldGroup) {
      this.editGroupFieldTitle.emit(this.selectedFieldGroup);
    }
    this.contextMenuVisible = false;
  }

  /**
   * Handle click on delete option in context menu
   */
  onDeleteGroupFieldTitle(): void {
    if (this.selectedFieldGroup) {
      this.deleteGroupFieldTitle.emit(this.selectedFieldGroup);
    }
    this.contextMenuVisible = false;
  }

  /**
   * Get the tooltip title for a field
   */
  getFieldTitle(field: SearchCriteria | any): string {
    if (!field) return '';

    if (field.field && typeof field.field === 'object' &&
      field.operator && typeof field.operator === 'object') {
      return `${field.field.label || ''} ${field.operator.label || ''} ${field.value || ''}`;
    } else if (typeof field.field === 'string' && typeof field.operator === 'string') {
      return `${field.field} ${field.operator} ${field.value || ''}`;
    }

    return '';
  }

  /**
   * Get the display label for a field
   */
  getFieldLabel(field: SearchCriteria | any): string {
    if (!field) return '';

    if (field.field && typeof field.field === 'object' &&
      field.operator && typeof field.operator === 'object') {
      return `${field.field.label || ''} ${field.operator.label || ''} ${field.value || ''}`;
    } else if (typeof field.field === 'string' && typeof field.operator === 'string') {
      return `${field.field} ${field.operator} ${field.value || ''}`;
    }

    return field.id || '';
  }

  /**
   * Check if a field is selected
   */
  isFieldSelected(field: SearchCriteria | any): boolean {
    if (!this.selectedField || !field) return false;

    // Use unique ID first
    if (field._uniqueId && this.selectedField._uniqueId) {
      return field._uniqueId === this.selectedField._uniqueId;
    }

    // Use rowId if available
    if (field.rowId && this.selectedField.rowId) {
      return field.rowId === this.selectedField.rowId;
    }

    // Use reference equality as a last resort
    return Object.is(field, this.selectedField);
  }

  /**
   * Clear the selected field
   */
  clearSelectedField(): void {
    this.stateService.clearSelectedField();
  }

  /**
   * Reset the accordion to its initial state
   */
  public reset(): void {
    this.stateService.reset();
    this.contextMenuVisible = false;
    this.cdr.markForCheck();
  }

  /**
   * Close context menu when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.contextMenuVisible) return;

    const contextMenu = this.elementRef.nativeElement.querySelector('.context-menu');
    if (contextMenu && !contextMenu.contains(event.target as Node)) {
      this.contextMenuVisible = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Close context menu on right-click outside
   */
  @HostListener('document:contextmenu', ['$event'])
  onDocumentRightClick(event: MouseEvent): void {
    if (!this.contextMenuVisible) return;

    const contextMenu = this.elementRef.nativeElement.querySelector('.context-menu');
    if (contextMenu && !contextMenu.contains(event.target as Node)) {
      this.contextMenuVisible = false;
      this.cdr.markForCheck();
    }
  }

  /**
 * Track groups by ID for ngFor
 */
  trackByGroupId(index: number, group: any): string {
    return group.groupTitle?.id || `group_${index}`;
  }

  /**
   * Track field groups by ID for ngFor
   */
  trackByFieldGroupId(index: number, fieldGroup: any): string {
    return fieldGroup.title?.id || `field_group_${index}`;
  }

  /**
   * Track fields by ID for ngFor
   */
  trackByFieldId(index: number, field: any): string {
    return field._uniqueId || field.rowId || `field_${index}`;
  }
}