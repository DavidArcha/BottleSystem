import { Injectable } from '@angular/core';

export interface FieldIdentifier {
  uniqueId?: string;
  fieldId?: string;
  operatorId?: string;
  value?: any;
  field?: string;
  operator?: string;
}

export interface AccordionState {
  expandedGroups: string[];
  expandedFields: string[];
  selectedField: FieldIdentifier | null;
}

@Injectable({
  providedIn: 'root'
})
export class SavedGroupService {
  private readonly STORAGE_KEY = 'savedAccordionState';
  private processedGroupsCache: Map<string, any[]> = new Map();
  
  constructor() {}
  
  /**
   * Process incoming groups data with minimal transformation
   */
  processGroups(input: any[] | any): any[] {
    if (!input) return [];
    
    // Generate cache key based on input structure
    const cacheKey = this.generateCacheKey(input);
    
    // Return cached result if available
    if (this.processedGroupsCache.has(cacheKey)) {
      return this.processedGroupsCache.get(cacheKey)!;
    }
    
    let result: any[] = [];
    
    // Check if input is a single group structure
    if (!Array.isArray(input) && input.groupTitle && Array.isArray(input.groupFields)) {
      result = [{
        groupTitle: input.groupTitle,
        groupFields: input.groupFields
      }];
    } else {
      // Process as array input
      const inputArray = Array.isArray(input) ? input : [input];
      result = inputArray.map(group => this.processGroup(group));
    }
    
    // Cache the result
    this.processedGroupsCache.set(cacheKey, result);
    
    return result;
  }
  
  /**
   * Generate a cache key for the input
   */
  private generateCacheKey(input: any): string {
    try {
      // Use a hash of the stringified input as the cache key
      // Limit the size to avoid excessive memory usage
      const inputStr = JSON.stringify(input);
      let hash = 0;
      for (let i = 0; i < Math.min(inputStr.length, 1000); i++) {
        const char = inputStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32-bit integer
      }
      return `group_${hash}`;
    } catch (e) {
      // Fallback if JSON stringify fails
      return `group_${Date.now()}`;
    }
  }
  
  /**
   * Process a single group
   */
  private processGroup(group: any): any {
    // Create a shallow copy to avoid modifying the original
    const processedGroup = { ...group };
    
    // Handle group title
    if (!processedGroup.groupTitle && processedGroup.title) {
      processedGroup.groupTitle = processedGroup.title;
    }
    
    if (!processedGroup.groupTitle) {
      processedGroup.groupTitle = {
        id: 'default-group',
        label: 'Saved Groups'
      };
    }
    
    // Handle group fields
    if (!processedGroup.groupFields) {
      if (Array.isArray(processedGroup.fields)) {
        processedGroup.groupFields = [{
          title: {
            id: 'default-field-group',
            label: 'Search Criteria'
          },
          fields: processedGroup.fields.map(this.addUniqueIdToField)
        }];
      } else {
        processedGroup.groupFields = [];
      }
    } else {
      processedGroup.groupFields = processedGroup.groupFields.map(this.processFieldGroup);
    }
    
    return processedGroup;
  }
  
  /**
   * Add a unique ID to a field
   */
  private addUniqueIdToField = (field: any, index: number): any => {
    return {
      ...field,
      _uniqueId: field.rowId || `field_auto_${index}_${Date.now()}`
    };
  }
  
  /**
   * Process a field group
   */
  private processFieldGroup = (fieldGroup: any, groupIndex: number): any => {
    const processedFieldGroup = { ...fieldGroup };
    
    // Ensure title exists
    if (!processedFieldGroup.title) {
      processedFieldGroup.title = {
        id: `group-${groupIndex}`,
        label: `Group ${groupIndex + 1}`
      };
    }
    
    // Ensure fields array exists and has unique IDs
    if (!Array.isArray(processedFieldGroup.fields)) {
      processedFieldGroup.fields = [];
    } else {
      processedFieldGroup.fields = processedFieldGroup.fields.map((field: any, fieldIndex: number) => {
        const groupId = fieldGroup.title?.id || `group-${groupIndex}`;
        return {
          ...field,
          _uniqueId: field.rowId || `field_${groupId}_${fieldIndex}`
        };
      });
    }
    
    return processedFieldGroup;
  }
  
  /**
   * Save accordion state to localStorage
   */
  saveState(state: AccordionState): void {
    try {
      const stateJson = JSON.stringify(state);
      localStorage.setItem(this.STORAGE_KEY, stateJson);
    } catch (err) {
      console.error('Error saving accordion state:', err);
    }
  }
  
  /**
   * Get accordion state from localStorage
   */
  getState(): AccordionState | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;
      
      return JSON.parse(stored) as AccordionState;
    } catch (err) {
      console.error('Error retrieving accordion state:', err);
      return null;
    }
  }
  
  /**
   * Clear the accordion state
   */
  clearState(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
  
  /**
   * Clear the cache to free up memory
   */
  clearCache(): void {
    this.processedGroupsCache.clear();
  }
  
  /**
   * Get a field identifier for state saving
   */
  getFieldIdentifier(field: any): FieldIdentifier {
    if (!field) return {};
    
    // Include the unique ID if available
    if (field._uniqueId) {
      return { uniqueId: field._uniqueId };
    }
    
    // Create a simplified identifier
    if (field.field?.id) {
      return {
        fieldId: field.field.id,
        operatorId: field.operator?.id,
        value: field.value
      };
    } 
    
    return {
      field: field.field,
      operator: field.operator,
      value: field.value
    };
  }
}