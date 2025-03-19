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
  // Loading states
  private loadingSystemTypesSubject = new BehaviorSubject<boolean>(false);
  public loadingSystemTypes$ = this.loadingSystemTypesSubject.asObservable();

  private loadingFieldsSubject = new BehaviorSubject<boolean>(false);
  public loadingFields$ = this.loadingFieldsSubject.asObservable();

  // Data states
  private systemFieldsAccDataSubject = new BehaviorSubject<AccordionItem[]>([]);
  public systemFieldsAccData$ = this.systemFieldsAccDataSubject.asObservable();

  private firstSystemFieldsDataSubject = new BehaviorSubject<AccordionItem[]>([]);
  public firstSystemFieldsData$ = this.firstSystemFieldsDataSubject.asObservable();

  private systemTypeDataSubject = new BehaviorSubject<DropdownItem[]>([]);
  public systemTypeData$ = this.systemTypeDataSubject.asObservable();

  // Error state
  private errorSubject = new BehaviorSubject<{ hasError: boolean, message: string }>({
    hasError: false,
    message: ''
  });
  public error$ = this.errorSubject.asObservable();

  // Fields maps for quick access
  private firstSystemFieldsMap = new Map<string, any>();
  private systemFieldsMap = new Map<string, any>();

  constructor(private searchService: SearchService) { }

  loadSystemTypeFields(lang: string): Observable<void> {
    this.loadingSystemTypesSubject.next(true);
    this.errorSubject.next({ hasError: false, message: '' });

    const result$ = new BehaviorSubject<void>(undefined);

    this.searchService.getSystemTypeFieldsByLang(lang)
      .pipe(
        finalize(() => this.loadingSystemTypesSubject.next(false)),
        catchError(err => {
          this.errorSubject.next({
            hasError: true,
            message: 'Failed to load system types. Please try again.'
          });
          result$.error(err);
          return of([]);
        })
      )
      .subscribe({
        next: (fields) => {
          if (fields.length > 0) {
            const mappedFields = fields.map(field => ({
              id: field.id.toString(),
              label: field.label
            }));
            this.systemTypeDataSubject.next(mappedFields);
          } else {
            this.systemTypeDataSubject.next([]);
          }
          result$.next();
          result$.complete();
        },
        error: (err) => {
          result$.error(err);
        }
      });

    return result$.asObservable();
  }

  loadFirstAccordionData(lang: string): Observable<void> {
    this.loadingFieldsSubject.next(true);
    this.errorSubject.next({ hasError: false, message: '' });

    const result$ = new BehaviorSubject<void>(undefined);

    this.searchService.getSystemFields(lang)
      .pipe(
        finalize(() => this.loadingFieldsSubject.next(false)),
        catchError(err => {
          this.errorSubject.next({
            hasError: true,
            message: 'Failed to load field data. Please try again.'
          });
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
        error: (err) => {
          result$.error(err);
        }
      });

    return result$.asObservable();
  }

  loadAccordionData(selectedSysType: string | string[], lang: string): Observable<void> {
    this.loadingFieldsSubject.next(true);
    this.errorSubject.next({ hasError: false, message: '' });
    this.systemFieldsMap.clear();

    const result$ = new BehaviorSubject<void>(undefined);

    // Handle array of system types or single system type
    const systemTypeIds = Array.isArray(selectedSysType)
      ? selectedSysType
      : [selectedSysType];

    // If empty, return empty result
    if (systemTypeIds.length === 0 || (systemTypeIds.length === 1 && !systemTypeIds[0])) {
      this.systemFieldsAccDataSubject.next([]);
      this.loadingFieldsSubject.next(false);
      result$.next();
      result$.complete();
      return result$.asObservable();
    }

    const allFields: AccordionItem[] = [];
    let completedRequests = 0;

    // Load fields for each system type
    systemTypeIds.forEach(systemTypeId => {
      this.searchService.getSystemFieldsAccData(systemTypeId, lang)
        .pipe(
          catchError(err => {
            return of([]);
          })
        )
        .subscribe({
          next: (fields) => {
            allFields.push(...fields);

            // Update the fields map with these fields
            const fieldsMap = extractFieldsToMap(fields);
            fieldsMap.forEach((value, key) => {
              this.systemFieldsMap.set(key, value);
            });
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

    return result$.asObservable();
  }

  // Get current states
  get systemTypeData(): DropdownItem[] {
    return this.systemTypeDataSubject.getValue();
  }

  get firstSystemFieldsData(): AccordionItem[] {
    return this.firstSystemFieldsDataSubject.getValue();
  }

  get systemFieldsAccData(): AccordionItem[] {
    return this.systemFieldsAccDataSubject.getValue();
  }

  // Get maps for field lookup
  getFirstSystemFieldsMap(): Map<string, any> {
    return this.firstSystemFieldsMap;
  }

  getSystemFieldsMap(): Map<string, any> {
    return this.systemFieldsMap;
  }

  // Clear fields data
  clearSystemFieldsAccData(): void {
    this.systemFieldsAccDataSubject.next([]);
    this.systemFieldsMap.clear();
  }

  // Clear error state
  clearError(): void {
    this.errorSubject.next({ hasError: false, message: '' });
  }

}