import { Injectable } from '@angular/core';
import { DropdownItem } from '../../../interfaces/table-dropdown.interface';
import { DROPDOWN_DATA } from '../../../utils/dropdown-data.constant';

// Define the interface for the dropdown data items
interface DropdownDataItem {
  id: string;
  en: string;
  de: string;
  [key: string]: string; // Index signature to allow any string property
}

@Injectable({
  providedIn: 'root'
})
export class DropdownDataService {


  constructor() { }

  getOperatorData(fieldType: string, language: string = 'en'): DropdownItem[] {
    let categoryKey: keyof typeof DROPDOWN_DATA;

    // Map field type to the appropriate operator category
    switch (fieldType) {
      case 'boolean':
        categoryKey = 'boolOperations';
        break;
      case 'number':
        categoryKey = 'numberOperations';
        break;
      case 'date':
        categoryKey = 'dateOperations';
        break;
      case 'button':
      case 'dropdown':
        categoryKey = 'tOperations';
        break;
      case 'string':
      default:
        categoryKey = 'stringOperations';
    }

    // Convert to DropdownItem format
    return DROPDOWN_DATA[categoryKey].map(item => {
      const dataItem = item as DropdownDataItem;
      return {
        id: dataItem.id,
        translations: {
          en: dataItem.en,
          de: dataItem.de
        },
        // Safely access the language property with fallback
        label: dataItem[language] || dataItem.en,
        selected: false
      };
    });
  }

  // Get operators for different field types
  getStringOperators(language: string = 'en'): DropdownItem[] {
    return this.getOperatorData('string', language);
  }

  getNumberOperators(language: string = 'en'): DropdownItem[] {
    return this.getOperatorData('number', language);
  }

  getDateOperators(language: string = 'en'): DropdownItem[] {
    return this.getOperatorData('date', language);
  }

  getBooleanOperators(language: string = 'en'): DropdownItem[] {
    return this.getOperatorData('boolean', language);
  }

  getButtonOperators(language: string = 'en'): DropdownItem[] {
    return this.getOperatorData('button', language);
  }

  getDropdownOperators(language: string = 'en'): DropdownItem[] {
    return this.getOperatorData('dropdown', language);
  }
}