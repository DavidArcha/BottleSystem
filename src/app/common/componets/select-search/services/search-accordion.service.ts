import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';
import { AccordionItem } from '../../../interfaces/accordian-list.interface';

@Injectable({
  providedIn: 'root'
})
export class SearchAccordionService {
  // Accordion state tracking
  private firstAccordionExpandedState = new Map<string, boolean>();
  private systemAccordionExpandedState = new Map<string, boolean>();

  // State change notification
  private accordionStateChangedSubject = new BehaviorSubject<string>('');
  public accordionStateChanged$ = this.accordionStateChangedSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.loadAccordionState();
  }

  /**
   * Load saved accordion state
   */
  private loadAccordionState(): void {
    const savedState = this.storageService.getObject<{
      firstAccordion: Record<string, boolean>,
      systemAccordion: Record<string, boolean>
    }>('savedAccordionState');

    if (!savedState) return;

    // Load first accordion state
    if (savedState.firstAccordion) {
      Object.entries(savedState.firstAccordion)
        .forEach(([id, isExpanded]) => this.firstAccordionExpandedState.set(id, isExpanded));
    }

    // Load system accordion state
    if (savedState.systemAccordion) {
      Object.entries(savedState.systemAccordion)
        .forEach(([id, isExpanded]) => this.systemAccordionExpandedState.set(id, isExpanded));
    }
  }

  /**
   * Save current accordion state
   */
  private saveAccordionState(): void {
    const stateToSave = {
      firstAccordion: Object.fromEntries(this.firstAccordionExpandedState),
      systemAccordion: Object.fromEntries(this.systemAccordionExpandedState)
    };

    this.storageService.setObject('savedAccordionState', stateToSave);
  }

  /**
   * Toggle accordion item expanded state
   */
  toggleAccordionItem(id: string, isFirstAccordion: boolean, value: boolean): void {
    const targetMap = isFirstAccordion ?
      this.firstAccordionExpandedState :
      this.systemAccordionExpandedState;

    targetMap.set(id, value);
    this.saveAccordionState();
    this.accordionStateChangedSubject.next(id);
  }

  /**
   * Check if an accordion item is expanded
   */
  isExpanded(id: string, isFirstAccordion: boolean): boolean {
    const targetMap = isFirstAccordion ?
      this.firstAccordionExpandedState :
      this.systemAccordionExpandedState;

    return targetMap.get(id) || false;
  }

  /**
   * Expand all accordion items
   */
  expandAll(accordionData: AccordionItem[], isFirstAccordion: boolean): void {
    this.setExpandState(accordionData, true, isFirstAccordion);
    this.saveAccordionState();
    this.accordionStateChangedSubject.next('all');
  }

  /**
   * Collapse all accordion items
   */
  collapseAll(accordionData: AccordionItem[], isFirstAccordion: boolean): void {
    this.setExpandState(accordionData, false, isFirstAccordion);
    this.saveAccordionState();
    this.accordionStateChangedSubject.next('all');
  }

  /**
   * Set expanded state for all accordion items
   */
  private setExpandState(
    accordionData: AccordionItem[],
    isExpanded: boolean,
    isFirstAccordion: boolean
  ): void {
    const processItems = (items: AccordionItem[]) => {
      items.forEach(item => {
        if (item.id) {
          const targetMap = isFirstAccordion ?
            this.firstAccordionExpandedState :
            this.systemAccordionExpandedState;

          targetMap.set(item.id, isExpanded);
        }

        if (item.children?.length > 0) {
          processItems(item.children);
        }
      });
    };

    processItems(accordionData);
  }

  /**
   * Clear accordion state
   */
  clearAccordionState(): void {
    this.firstAccordionExpandedState.clear();
    this.systemAccordionExpandedState.clear();
    this.storageService.removeItem('savedAccordionState');
    this.clearAccordionLocalStorage();
    this.accordionStateChangedSubject.next('clear');
  }

  /**
   * Clear accordion-related items from localStorage
   */
  private clearAccordionLocalStorage(): void {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && this.isAccordionStorageKey(key)) {
        localStorage.removeItem(key);
      }
    }
  }

  /**
   * Check if a key is related to accordion storage
   */
  private isAccordionStorageKey(key: string): boolean {
    return key.startsWith('accordion-') || key.includes('Accordion');
  }
}