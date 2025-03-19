import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SearchProcessService {

  constructor() { }

  /**
 * Extract field object from various input formats
 * @param item - The item from which to extract field data
 * @returns Field object or null if invalid
 */
  extractFieldFromItem(item: any): { id: string, label: string } | null {
    if (!item) return null;

    // Handle different item formats
    if (item.field) {
      return {
        id: item.field.id,
        label: item.field.label
      };
    } else if (item.item) {
      return {
        id: item.item.id,
        label: item.item.label
      };
    } else if (item.id) {
      return {
        id: item.id,
        label: item.label || item.id
      };
    }

    return null;
  }
}
