import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';
import { AccordionItem } from '../../../interfaces/accordian-list.interface';

@Injectable({
  providedIn: 'root'
})
export class SearchAccordionService {
  // Track accordion open/closed state
  private firstAccordionExpandedState = new Map<string, boolean>();
  private systemAccordionExpandedState = new Map<string, boolean>();

  // Observable for expanded state changes
  private accordionStateChangedSubject = new BehaviorSubject<string>('');
  public accordionStateChanged$ = this.accordionStateChangedSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.loadAccordionState();
  }

  /**
   * Load saved accordion state from storage
   */
  private loadAccordionState(): void {
    const savedState = this.storageService.getObject<{
      firstAccordion: Record<string, boolean>,
      systemAccordion: Record<string, boolean>
    }>('savedAccordionState');

    if (savedState) {
      // Restore first accordion state
      if (savedState.firstAccordion) {
        for (const [id, isExpanded] of Object.entries(savedState.firstAccordion)) {
          this.firstAccordionExpandedState.set(id, isExpanded);
        }
      }

      // Restore system accordion state
      if (savedState.systemAccordion) {
        for (const [id, isExpanded] of Object.entries(savedState.systemAccordion)) {
          this.systemAccordionExpandedState.set(id, isExpanded);
        }
      }
    }
  }

  /**
   * Save current accordion state to storage
   */
  private saveAccordionState(): void {
    const stateToSave = {
      firstAccordion: Object.fromEntries(this.firstAccordionExpandedState),
      systemAccordion: Object.fromEntries(this.systemAccordionExpandedState)
    };

    this.storageService.setObject('savedAccordionState', stateToSave);
  }

  /**
   * Toggle the expanded state of an accordion item
   */
  toggleAccordionItem(id: string, isFirstAccordion: boolean, value: boolean): void {
    if (isFirstAccordion) {
      this.firstAccordionExpandedState.set(id, value);
    } else {
      this.systemAccordionExpandedState.set(id, value);
    }
    this.saveAccordionState();
    this.accordionStateChangedSubject.next(id);
  }

  /**
   * Get the expanded state of an accordion item
   */
  isExpanded(id: string, isFirstAccordion: boolean): boolean {
    if (isFirstAccordion) {
      return this.firstAccordionExpandedState.get(id) || false;
    } else {
      return this.systemAccordionExpandedState.get(id) || false;
    }
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
   * Set expanded state for all items in an accordion
   */
  private setExpandState(accordionData: AccordionItem[], isExpanded: boolean, isFirstAccordion: boolean): void {
    const processItems = (items: AccordionItem[]) => {
      items.forEach(item => {
        if (item.id) {
          if (isFirstAccordion) {
            this.firstAccordionExpandedState.set(item.id, isExpanded);
          } else {
            this.systemAccordionExpandedState.set(item.id, isExpanded);
          }
        }

        if (item.children && item.children.length > 0) {
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

    // More aggressive localStorage clearing for accordion state
    this.storageService.removeItem('savedAccordionState');

    // Clear any accordion section keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('accordion-') || key.includes('Accordion'))) {
        localStorage.removeItem(key);
      }
    }

    this.accordionStateChangedSubject.next('clear');
  }
}
