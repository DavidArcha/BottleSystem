import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  AfterViewInit
} from '@angular/core';
import { Subscription } from 'rxjs';
import { Overlay, OverlayRef, OverlayPositionBuilder } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DropdownItem } from '../../../interfaces/table-dropdown.interface';
import { DropdownService } from '../../../services/dropdown.service';
import { LanguageService } from '../../../services/language.service';

@Component({
  selector: 'app-table-dropdown',
  standalone: false,
  templateUrl: './table-dropdown.component.html',
  styleUrl: './table-dropdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableDropdownComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input() data: DropdownItem[] = [];
  @Input() isTableView = false; // New simplified boolean for view type
  @Input() multiSelect = false;
  @Input() selectedLanguage = 'de';
  @Input() useTranslations = false;
  @Input() selectedValues: string[] = [];
  @Input() tableColumns?: string[];
  @Output() selectedValuesChange = new EventEmitter<DropdownItem[]>();

  isOpen = false;
  selectedOptions: DropdownItem[] = [];
  filteredData: DropdownItem[] = [];
  selectedOption = '';
  searchTerm = ''; // For search functionality

  // Generate deterministic ID using timestamp and counter for uniqueness
  private static idCounter = 0;
  readonly dropdownId = `dropdown-${Date.now()}-${TableDropdownComponent.idCounter++}`;
  overlayRef: OverlayRef | null = null; // Initialized to null
  @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>; // Non-null assertion added
  @ViewChild('dropdownToggle', { read: ElementRef }) dropdownToggle!: ElementRef; // Non-null assertion added

  private subscriptions = new Subscription();

  constructor(
    private cd: ChangeDetectorRef,
    private dropdownService: DropdownService,
    private languageService: LanguageService,
    private overlay: Overlay,
    private viewContainerRef: ViewContainerRef,
    private overlayPositionBuilder: OverlayPositionBuilder
  ) { }

  ngOnInit(): void {
    this.subscriptions.add(
      this.dropdownService.activeDropdown$.subscribe((id) => {
        const isActive = id === this.dropdownId;
        if (this.isOpen !== isActive) {
          this.isOpen = isActive;
          this.cd.detectChanges();
        }
      })
    );
    this.initializeSelection();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['data'] || changes['selectedValues']) && this.data) {
      this.filteredData = [...this.data];
      this.initializeSelection();
    }
  }

  ngAfterViewInit(): void {
    // Ensure dropdownTemplate and viewContainerRef are defined
    if (!this.dropdownTemplate || !this.viewContainerRef) {
      console.error('Dropdown template or view container ref is not defined');
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      this.isOpen = false;
      this.dropdownService.setActiveDropdown(null);
      this.cd.detectChanges();
    }
  }

  selectOption(item: DropdownItem): void {
    if (this.multiSelect) {
      const index = this.selectedOptions.findIndex(opt => opt.id === item.id);
      if (index === -1) {
        this.selectedOptions = [...this.selectedOptions, item];
      } else {
        this.selectedOptions = [
          ...this.selectedOptions.slice(0, index),
          ...this.selectedOptions.slice(index + 1)
        ];
      }
      this.selectedValuesChange.emit(this.selectedOptions);

    } else {
      this.selectedOption = this.getDisplayLabel(item);
      this.selectedOptions = [item];
      this.selectedValuesChange.emit([item]);
      this.isOpen = false;
      this.dropdownService.setActiveDropdown(null);
      this.closeDropdown(); // Ensure we call closeDropdown to properly clean up the overlay
    }
    this.cd.detectChanges();
  }

  isSelected(item: DropdownItem): boolean {
    return this.multiSelect
      ? this.selectedOptions.some(opt => opt.id === item.id)
      : this.selectedValues.includes(item.id);
  }

  /**
 * Checks if all filtered items are currently selected
 */
  isAllSelected(): boolean {
    if (this.filteredData.length === 0) {
      return false;
    }

    // Check if all filtered items are in the selected items
    return this.filteredData.every(item => this.isSelected(item));
  }

  getDisplayLabel(item: DropdownItem): string {
    if (this.useTranslations && item.translations) {
      return item.translations[this.selectedLanguage] || item.label || '';
    }
    return item.label || '';
  }

  getDisplayText(): string {
    if (this.multiSelect) {
      if (this.selectedOptions.length === 0) {
        return this.getPlaceholderText();
      }
      return this.selectedOptions
        .map(item => this.getDisplayLabel(item))
        .join(', ');
    }
    return this.selectedOption || this.getPlaceholderText();
  }

  private getPlaceholderText(): string {
    return this.selectedLanguage === 'de' ? 'Auswählen' : 'Select';
  }

  clearSelection(event: Event): void {
    event.stopPropagation();
    if (this.multiSelect) {
      this.selectedOptions = [];
    } else {
      this.selectedOption = '';
      this.selectedValues = [];
    }
    this.selectedValuesChange.emit([]);
    this.cd.detectChanges();
  }

  getTableHeaders(): string[] {
    if (!this.tableColumns && this.data.length > 0 && this.data[0]?.tableData) {
      return Object.keys(this.data[0].tableData);
    }
    return this.tableColumns || [];
  }

  getTableCellValue(item: DropdownItem, column: string): string {
    return item.tableData?.[column] || '';
  }

  /**
  * Toggles selection of all filtered items
  */
  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      // If all are selected, unselect all
      this.selectedOptions = this.selectedOptions.filter(
        selected => !this.filteredData.some(filtered => this.compareItems(filtered, selected))
      );
    } else {
      // Otherwise, select all filtered items
      const itemsToAdd = this.filteredData.filter(
        item => !this.selectedOptions.some(selected => this.compareItems(item, selected))
      );
      this.selectedOptions = [...this.selectedOptions, ...itemsToAdd];
    }

    this.emitSelectionChange();
  }

  /**
 * Emits the current selection to parent components
 */
  private emitSelectionChange(): void {
    this.selectedValuesChange.emit(this.selectedOptions);
    this.cd.detectChanges();
  }

  /**
 * Compares two dropdown items to determine if they represent the same item
 * @param item1 First dropdown item to compare
 * @param item2 Second dropdown item to compare
 * @returns True if the items are considered to be the same
 */
  private compareItems(item1: DropdownItem, item2: DropdownItem): boolean {
    // Compare by ID which is usually the most reliable identifier
    return item1.id === item2.id;
  }

  onSearchChange(): void {
    this.filterItems();
    this.cd.detectChanges();
  }

  filterItems(): void {
    if (!this.searchTerm.trim()) {
      this.filteredData = [...this.data];
      return;
    }

    const searchTermLower = this.searchTerm.toLowerCase();

    this.filteredData = this.data.filter(item => {
      const label = this.getDisplayLabel(item).toLowerCase();

      // Also search in table data if available
      if (this.isTableView && item.tableData) {
        const tableValues = Object.values(item.tableData)
          .map(val => String(val).toLowerCase());
        return label.includes(searchTermLower) ||
          tableValues.some(val => val.includes(searchTermLower));
      }

      return label.includes(searchTermLower);
    });
  }

  private initializeSelection(): void {
    if (this.multiSelect) {
      this.selectedOptions = this.data.filter(item =>
        this.selectedValues.includes(item.id)
      );
    } else if (this.selectedValues.length > 0) {
      const selected = this.data.find(item => item.id === this.selectedValues[0]);
      if (selected) {
        this.selectedOption = this.getDisplayLabel(selected);
        this.selectedOptions = [selected];
      }
    }
    this.cd.detectChanges();
  }

  getSearchPlaceholder(): string {
    return this.selectedLanguage === 'de' ? 'Suchen...' : 'Search...';
  }

  toggleDropdown() {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      // Ensure dropdownTemplate and viewContainerRef are defined
      if (!this.dropdownTemplate || !this.viewContainerRef) {
        console.error('Dropdown template or view container ref is not defined');
        return;
      }

      // Build a position strategy connected to the toggle button
      const positionStrategy = this.overlayPositionBuilder
        .flexibleConnectedTo(this.dropdownToggle)
        .withPositions([{
          originX: 'start',
          originY: 'bottom',
          overlayX: 'start',
          overlayY: 'top',
        }]);

      // Create the overlay with a transparent backdrop to catch outside clicks
      this.overlayRef = this.overlay.create({
        positionStrategy,
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
        hasBackdrop: true,
        backdropClass: 'transparent-backdrop'
      });

      // Close the dropdown if the backdrop is clicked
      this.overlayRef.backdropClick().subscribe(() => this.closeDropdown());

      // Attach the dropdown template to the overlay
      this.overlayRef.attach(new TemplatePortal(this.dropdownTemplate, this.viewContainerRef));
      this.isOpen = true;
    }
  }

  closeDropdown() {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef.dispose();
      this.overlayRef = null;
      this.isOpen = false;
    }
  }

  /**
 * Reset the dropdown to its initial state with no selection
 */
  public reset(): void {
    this.selectedValues = [];
    this.selectedOption = '';
    this.selectedOptions = [];
    this.selectedValuesChange.emit([]);
  }
}