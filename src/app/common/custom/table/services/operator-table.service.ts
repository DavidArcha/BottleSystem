import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from '../../../componets/select-search/services/storage.service';
import { SearchService } from '../../../services/search.service';
import { DropdownDataMapping, FieldType, FieldTypeMapping } from '../../../enums/field-types.enum';

@Injectable({
  providedIn: 'root'
})
export class OperatorTableService {
  private operatorsDdDataSubject = new BehaviorSubject<any>(null);
  constructor(private storageService: StorageService,
    private searchService: SearchService) { }


 
    private loadOperatorsData(): void {
      // Get operators data from the SearchService
      this.searchService.getDropdownData().subscribe({
        next: (data) => {
          // Initialize with the structure we expect
          const operatorsData = {
            boolOperations: data?.boolOperations || [],
            stringOperations: data?.stringOperations || [],
            dateOperations: data?.dateOperations || [],
            numberOperations: data?.numberOperations || [],
            timeOperations: data?.timeOperations || []
          };
          this.operatorsDdDataSubject.next(operatorsData);
        },
        error: (err) => {
          // In case of an error, still provide a default structure
          const defaultOperatorsData = {
            boolOperations: [],
            stringOperations: [],
            dateOperations: [],
            numberOperations: [],
            timeOperations: []
          };
          this.operatorsDdDataSubject.next(defaultOperatorsData);
        }
      });
    }
  
    // Get operators data for a specific field
    getOperatorOptions(field: string): any[] {
      const operatorsData = this.operatorsDdDataSubject.getValue();
      if (!operatorsData) return [];
  
      const fieldLower = field.toLowerCase();
      switch (FieldTypeMapping[fieldLower]) {
        case FieldType.Bool:
          return operatorsData.boolOperations || [];
        case FieldType.Text:
          return operatorsData.stringOperations || [];
        case FieldType.Date:
          return operatorsData.dateOperations || [];
        case FieldType.Number:
          return operatorsData.numberOperations || [];
        case FieldType.Dropdown:
          return operatorsData.stringOperations || [];
        default:
          return operatorsData.stringOperations || []; // Default to string operations
      }
    }
  
    // Get dropdown data for a field
    getDropdownDataForField(fieldId: string): any[] {
      const dataSource = DropdownDataMapping[fieldId];
      // Implement dropdown data source mapping here
      return [];
    } 
}
