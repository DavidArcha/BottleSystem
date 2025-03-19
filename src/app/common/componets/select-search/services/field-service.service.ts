import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, finalize, Observable, of } from 'rxjs';
import { AccordionItem } from '../../../interfaces/accordian-list.interface';
import { DropdownItem } from '../../../interfaces/table-dropdown.interface';
import { SearchService } from '../../../services/search.service';
import { extractFieldsToMap } from '../utils/search-utils';

@Injectable({
  providedIn: 'root'
})
export class FieldServiceService {
  // Loading state subjects
  private loadingSystemTypesSubject = new BehaviorSubject<boolean>(false);
  private loadingFieldsSubject = new BehaviorSubject<boolean>(false);

  // Data subjects
  private systemFieldsAccDataSubject = new BehaviorSubject<AccordionItem[]>([]);
  private firstSystemFieldsDataSubject = new BehaviorSubject<AccordionItem[]>([]);
  private systemTypeDataSubject = new BehaviorSubject<DropdownItem[]>([]);

  // Error subject
  private errorSubject = new BehaviorSubject<{ hasError: boolean, message: string }>({
    hasError: false, message: ''
  });

  // Public observables
  public loadingSystemTypes$ = this.loadingSystemTypesSubject.asObservable();
  public loadingFields$ = this.loadingFieldsSubject.asObservable();
  public systemFieldsAccData$ = this.systemFieldsAccDataSubject.asObservable();
  public firstSystemFieldsData$ = this.firstSystemFieldsDataSubject.asObservable();
  public systemTypeData$ = this.systemTypeDataSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  // Field maps for quick access
  private firstSystemFieldsMap = new Map<string, any>();
  private systemFieldsMap = new Map<string, any>();

  constructor(private searchService: SearchService) { }

  /**
   * Load system type fields
   */
  loadSystemTypeFields(lang: string): Observable<void> {
    this.loadingSystemTypesSubject.next(true);
    this.errorSubject.next({ hasError: false, message: '' });

    const result$ = new BehaviorSubject<void>(undefined);

    this.searchService.getSystemTypeFieldsByLang(lang)
      .pipe(
        finalize(() => this.loadingSystemTypesSubject.next(false)),
        catchError(err => {
          this.handleError('Failed to load system types. Please try again.');
          result$.error(err);
          return of([]);
        })
      )
      .subscribe({
        next: (fields) => {
          this.processSystemTypeFields(fields);
          result$.next();
          result$.complete();
        },
        error: (err) => result$.error(err)
      });

    return result$.asObservable();
  }

  /**
   * Process system type fields response
   */
  private processSystemTypeFields(fields: any[]): void {
    if (fields.length > 0) {
      this.systemTypeDataSubject.next(fields.map(field => ({
        id: field.id.toString(),
        label: field.label
      })));
    } else {
      this.systemTypeDataSubject.next([]);
    }
  }

  /**
   * Load first accordion data
   */
  loadFirstAccordionData(lang: string): Observable<void> {
    this.loadingFieldsSubject.next(true);
    this.errorSubject.next({ hasError: false, message: '' });

    const result$ = new BehaviorSubject<void>(undefined);

    this.searchService.getSystemFields(lang)
      .pipe(
        finalize(() => this.loadingFieldsSubject.next(false)),
        catchError(err => {
          this.handleError('Failed to load field data. Please try again.');
          result$.error(err);
          return of([]);
        })
      )
      .subscribe({
        next: (fields) => {
          this.firstSystemFieldsDataSubject.next(fields);
          this.firstSystemFieldsMap = extractFieldsToMap(fields);
          result$.next();
          result$.complete();
        },
        error: (err) => result$.error(err)
      });

    return result$.asObservable();
  }

  /**
   * Load accordion data for system type(s)
   */
  loadAccordionData(selectedSysType: string | string[], lang: string): Observable<void> {
    this.loadingFieldsSubject.next(true);
    this.errorSubject.next({ hasError: false, message: '' });
    this.systemFieldsMap.clear();

    const result$ = new BehaviorSubject<void>(undefined);
    const systemTypeIds = Array.isArray(selectedSysType) ? selectedSysType : [selectedSysType];

    if (this.shouldReturnEmptyResult(systemTypeIds)) {
      this.handleEmptySystemTypes(result$);
      return result$.asObservable();
    }

    this.loadSystemFieldsForTypes(systemTypeIds, lang, result$);
    return result$.asObservable();
  }

  /**
   * Check if we should return empty result
   */
  private shouldReturnEmptyResult(ids: string[]): boolean {
    return ids.length === 0 || (ids.length === 1 && !ids[0]);
  }

  /**
   * Handle case when no system types selected
   */
  private handleEmptySystemTypes(result$: BehaviorSubject<void>): void {
    this.systemFieldsAccDataSubject.next([]);
    this.loadingFieldsSubject.next(false);
    result$.next();
    result$.complete();
  }

  /**
   * Load system fields for multiple system types
   */
  private loadSystemFieldsForTypes(
    systemTypeIds: string[],
    lang: string,
    result$: BehaviorSubject<void>
  ): void {
    const allFields: AccordionItem[] = [];
    let completedRequests = 0;

    systemTypeIds.forEach(systemTypeId => {
      this.searchService.getSystemFieldsAccData(systemTypeId, lang)
        .pipe(catchError(() => of([])))
        .subscribe({
          next: (fields) => {
            allFields.push(...fields);
            this.updateSystemFieldsMap(fields);
          },
          complete: () => {
            completedRequests++;
            if (completedRequests === systemTypeIds.length) {
              this.systemFieldsAccDataSubject.next(allFields);
              this.loadingFieldsSubject.next(false);
              result$.next();
              result$.complete();
            }
          }
        });
    });
  }

  /**
   * Update system fields map with new fields
   */
  private updateSystemFieldsMap(fields: AccordionItem[]): void {
    const fieldsMap = extractFieldsToMap(fields);
    fieldsMap.forEach((value, key) => {
      this.systemFieldsMap.set(key, value);
    });
  }

  /**
   * Handle error
   */
  private handleError(message: string): void {
    this.errorSubject.next({
      hasError: true,
      message
    });
  }

  // Getters for current state
  get systemTypeData(): DropdownItem[] {
    return this.systemTypeDataSubject.getValue();
  }

  get firstSystemFieldsData(): AccordionItem[] {
    return this.firstSystemFieldsDataSubject.getValue();
  }

  get systemFieldsAccData(): AccordionItem[] {
    return this.systemFieldsAccDataSubject.getValue();
  }

  // Getters for field maps
  getFirstSystemFieldsMap(): Map<string, any> {
    return this.firstSystemFieldsMap;
  }

  getSystemFieldsMap(): Map<string, any> {
    return this.systemFieldsMap;
  }

  // Clear methods
  clearSystemFieldsAccData(): void {
    this.systemFieldsAccDataSubject.next([]);
    this.systemFieldsMap.clear();
  }

  clearError(): void {
    this.errorSubject.next({ hasError: false, message: '' });
  }

  /**
 * Find field by ID in the appropriate accordion data source
 * @param fieldId The ID of the field to find
 * @param isParentArray Whether to check in firstSystemFieldsData (true) or systemFieldsAccData (false)
 * @returns The found field or undefined
 */
  findFieldById(fieldId: string, isParentArray: boolean): any {
    if (!fieldId) return undefined;

    // Determine which map to search based on isParentArray
    const mapToSearch = isParentArray ? this.firstSystemFieldsMap : this.systemFieldsMap;
    return mapToSearch.get(fieldId);
  }
}