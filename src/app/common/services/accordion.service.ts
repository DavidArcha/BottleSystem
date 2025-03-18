import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AccordionItem } from '../interfaces/accordian-list.interface';

@Injectable({
  providedIn: 'root'
})
export class AccordionService {
  private accordionDataCache: { [lang: string]: AccordionItem[] } = {};
  private expandedStateCache: { [id: string]: boolean } = {};

  private expandedSections = new Map<string, boolean>();
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoadingSubject.asObservable();

  setAccordionData(lang: string, data: AccordionItem[]): void {
    this.accordionDataCache[lang] = data;
  }

  getAccordionData(lang: string): AccordionItem[] | undefined {
    return this.accordionDataCache[lang];
  }

  setExpandedState(key: string, expanded: boolean): void {
    this.expandedSections.set(key, expanded);
    // Also update localStorage for persistence
    localStorage.setItem(key, JSON.stringify(expanded));
  }

  getExpandedState(key: string): boolean | undefined {
    // Try localStorage first
    const storedState = localStorage.getItem(key);
    if (storedState !== null) {
      return JSON.parse(storedState);
    }
    // Fall back to in-memory state
    return this.expandedSections.get(key);
  }

  clearExpandedStates(): void {
    this.expandedSections.clear();
    // Also clear from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('accordion-')) {
        localStorage.removeItem(key);
      }
    }
  }

  setLoadingState(isLoading: boolean): void {
    this.isLoadingSubject.next(isLoading);
  }

  // Add this method to restore accordion state from localStorage
  restoreAccordionState(sectionType: string, sections: AccordionItem[]): void {
    sections.forEach(section => {
      const key = `accordion-${sectionType}-${section.id}`;
      const storedState = localStorage.getItem(key);
      if (storedState !== null) {
        this.expandedSections.set(key, JSON.parse(storedState));
      }
    });
  }

  constructor() { }

  // Add this method to clean up old localStorage entries
  cleanupLocalStorage(maxAgeDays: number = 30): void {
    const prefix = 'accordion-';
    const now = new Date().getTime();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    // Find all localStorage keys that match our accordion pattern
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        try {
          // Check if this is one of our accordion instance keys with timestamp
          if (key.includes('-')) {
            const parts = key.split('-');
            // Try to extract timestamp (assuming our uniqueId format)
            if (parts.length >= 3) {
              const possibleTimestamp = parseInt(parts[2], 10);
              if (!isNaN(possibleTimestamp) && (now - possibleTimestamp) > maxAge) {
                localStorage.removeItem(key);
              }
            }
          }
        } catch (e) {
          console.warn('Error processing localStorage item:', key, e);
        }
      }
    }
  }
}
