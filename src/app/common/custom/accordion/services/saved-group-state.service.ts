import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SavedGroupService, AccordionState } from './saved-group.service';

@Injectable({
  providedIn: 'root'
})
export class SavedGroupStateService {
  private expandedGroups = new BehaviorSubject<Set<string>>(new Set<string>());
  private expandedFields = new BehaviorSubject<Set<string>>(new Set<string>());
  private selectedField = new BehaviorSubject<any>(null);
  private isLoading = new BehaviorSubject<boolean>(false);
  private hasError = new BehaviorSubject<boolean>(false);
  private errorMessage = new BehaviorSubject<string | null>(null);

  // Observable streams
  expandedGroups$ = this.expandedGroups.asObservable();
  expandedFields$ = this.expandedFields.asObservable();
  selectedField$ = this.selectedField.asObservable();
  isLoading$ = this.isLoading.asObservable();
  hasError$ = this.hasError.asObservable();
  errorMessage$ = this.errorMessage.asObservable();

  constructor(private savedGroupService: SavedGroupService) {
    this.restoreState();
  }

  /**
   * Toggle a group's expanded state
   */
  toggleGroup(groupId: string, groups: any[]): void {
    if (!groupId) return;

    const currentGroups = this.expandedGroups.getValue();
    const updatedGroups = new Set(currentGroups);

    if (updatedGroups.has(groupId)) {
      updatedGroups.delete(groupId);

      // Also collapse child fields
      const group = groups.find(g => (g.groupTitle?.id || 'default') === groupId);
      if (group && group.groupFields) {
        const currentFields = this.expandedFields.getValue();
        const updatedFields = new Set(currentFields);
        let clearSelection = false;

        // If there's a selected field, check if it belongs to the collapsed group
        const currentSelectedField = this.selectedField.getValue();
        if (currentSelectedField) {
          // Check if the selected field is within this group
          for (const fieldGroup of group.groupFields) {
            if (fieldGroup.fields) {
              for (const field of fieldGroup.fields) {
                if (this.areFieldsEqual(field, currentSelectedField)) {
                  // Field is in this group, so clear selection when collapsing
                  clearSelection = true;
                  break;
                }
              }
              if (clearSelection) break;
            }
          }
        }

        group.groupFields.forEach((fieldGroup: any) => {
          const fieldGroupId = fieldGroup.title?.id || 'unnamed';
          updatedFields.delete(fieldGroupId);
        });

        this.expandedFields.next(updatedFields);

        // Clear the selected field if it was in the collapsed group
        if (clearSelection) {
          this.clearSelectedField();
        }
      }
    } else {
      updatedGroups.add(groupId);
    }

    this.expandedGroups.next(updatedGroups);
    this.saveState();
  }

  /**
   * Helper method to compare two fields for equality
   * @private
   */
  private areFieldsEqual(field1: any, field2: any): boolean {
    if (!field1 || !field2) return false;

    // Compare by unique ID if available
    if (field1._uniqueId && field2._uniqueId) {
      return field1._uniqueId === field2._uniqueId;
    }

    // Compare by rowId if available
    if (field1.rowId && field2.rowId) {
      return field1.rowId === field2.rowId;
    }

    // Compare field properties
    if (field1.field && field2.field) {
      const field1Id = typeof field1.field === 'object' ? field1.field.id : field1.field;
      const field2Id = typeof field2.field === 'object' ? field2.field.id : field2.field;

      if (field1Id !== field2Id) return false;

      const op1Id = typeof field1.operator === 'object' ? field1.operator.id : field1.operator;
      const op2Id = typeof field2.operator === 'object' ? field2.operator.id : field2.operator;

      if (op1Id !== op2Id) return false;

      return field1.value === field2.value;
    }

    // Last resort: direct reference comparison
    return Object.is(field1, field2);
  }

/**
 * Toggle a field's expanded state
 */
toggleField(fieldGroupId: string, groups?: any[]): void {
  if (!fieldGroupId) return;

  const current = this.expandedFields.getValue();
  const updated = new Set(current);

  if (updated.has(fieldGroupId)) {
    updated.delete(fieldGroupId);
    
    // If we have groups data and a selected field, check if we need to clear selection
    if (groups) {
      const currentSelectedField = this.selectedField.getValue();
      if (currentSelectedField) {
        // Try to find if selected field is within this field group
        let fieldFound = false;
        
        for (const group of groups) {
          for (const fieldGroup of group.groupFields || []) {
            if ((fieldGroup.title?.id || 'unnamed') === fieldGroupId) {
              // This is our field group, check if selected field is here
              for (const field of fieldGroup.fields || []) {
                if (this.areFieldsEqual(field, currentSelectedField)) {
                  fieldFound = true;
                  break;
                }
              }
            }
            if (fieldFound) break;
          }
          if (fieldFound) break;
        }
        
        // Clear selection if field was in this group
        if (fieldFound) {
          this.clearSelectedField();
        }
      }
    }
  } else {
    updated.add(fieldGroupId);
  }

  this.expandedFields.next(updated);
  this.saveState();
}

/**
 * Clear the selected field
 */
clearSelectedField(): void {
  // Ensure we're always setting to null to trigger change detection
  this.selectedField.next(null);
  
  // Make sure changes are saved to local storage
  this.saveState();
  
  // Emit a value on the observable stream to notify subscribers
  // This ensures components respond to the change
  setTimeout(() => {
    // Use timeout to ensure this runs in the next cycle
    this.selectedField.next(null);
  }, 0);
}

  /**
   * Select a field
   */
  selectField(field: any): void {
    this.selectedField.next(field);
    this.saveState();
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.expandedGroups.next(new Set<string>());
    this.expandedFields.next(new Set<string>());
    this.selectedField.next(null);
    this.savedGroupService.clearState();
  }

  /**
   * Save current state
   */
  private saveState(): void {
    const state: AccordionState = {
      expandedGroups: Array.from(this.expandedGroups.getValue()),
      expandedFields: Array.from(this.expandedFields.getValue()),
      selectedField: this.savedGroupService.getFieldIdentifier(this.selectedField.getValue())
    };

    this.savedGroupService.saveState(state);
  }

  /**
   * Restore saved state
   */
  private restoreState(): void {
    try {
      this.isLoading.next(true);
      const state = this.savedGroupService.getState();

      if (state) {
        if (state.expandedGroups) {
          this.expandedGroups.next(new Set<string>(state.expandedGroups));
        }

        if (state.expandedFields) {
          this.expandedFields.next(new Set<string>(state.expandedFields));
        }
      }

      this.isLoading.next(false);
    } catch (err) {
      this.hasError.next(true);
      this.errorMessage.next('Failed to restore saved state');
      this.isLoading.next(false);
    }
  }

  /**
   * Find a field in groups by its identifier
   */
  findField(identifier: any, groups: any[]): any {
    if (!groups || !identifier) return null;

    // Try to find by unique ID first
    if (identifier.uniqueId) {
      for (const group of groups) {
        for (const fieldGroup of group.groupFields || []) {
          for (const field of fieldGroup.fields || []) {
            if (field._uniqueId === identifier.uniqueId) {
              return field;
            }
          }
        }
      }
    }

    // Fall back to field/operator matching
    for (const group of groups) {
      for (const fieldGroup of group.groupFields || []) {
        for (const field of fieldGroup.fields || []) {
          // Match by field ID and operator ID
          if (identifier.fieldId &&
            field.field?.id === identifier.fieldId &&
            (!identifier.operatorId || field.operator?.id === identifier.operatorId) &&
            (!identifier.value || field.value === identifier.value)) {
            return field;
          }

          // Match by field and operator values
          if (identifier.field &&
            ((typeof field.field === 'string' && field.field === identifier.field) ||
              (field.field?.label === identifier.field)) &&
            ((typeof field.operator === 'string' && field.operator === identifier.operator) ||
              (field.operator?.label === identifier.operator)) &&
            (!identifier.value || field.value === identifier.value)) {
            return field;
          }
        }
      }
    }

    return null;
  }
}