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

        group.groupFields.forEach((fieldGroup: any) => {
          const fieldGroupId = fieldGroup.title?.id || 'unnamed';
          updatedFields.delete(fieldGroupId);
        });

        this.expandedFields.next(updatedFields);
      }
    } else {
      updatedGroups.add(groupId);
    }

    this.expandedGroups.next(updatedGroups);
    this.saveState();
  }

  /**
   * Toggle a field's expanded state
   */
  toggleField(fieldGroupId: string): void {
    if (!fieldGroupId) return;

    const current = this.expandedFields.getValue();
    const updated = new Set(current);

    if (updated.has(fieldGroupId)) {
      updated.delete(fieldGroupId);
    } else {
      updated.add(fieldGroupId);
    }

    this.expandedFields.next(updated);
    this.saveState();
  }

  /**
   * Select a field
   */
  selectField(field: any): void {
    this.selectedField.next(field);
    this.saveState();
  }

  /**
   * Clear the selected field
   */
  clearSelectedField(): void {
    this.selectedField.next(null);
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