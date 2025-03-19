import { AccordionItem } from "../../../interfaces/accordian-list.interface";
import { SelectedField } from "../../../interfaces/selectedFields.interface";


/**
 * Formats a date object to YYYY-MM-DD format for HTML inputs
 */
export function formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Tracks items in ngFor for better performance
 */
export function trackByFn(index: number, item: any): any {
    return item?.id || index;
}

/**
 * Debounces a function call
 */
export function debounce<F extends (...args: any[]) => any>(
    func: F,
    waitFor: number
): (...args: Parameters<F>) => void {
    let timeout: ReturnType<typeof setTimeout>;

    return function (...args: Parameters<F>): void {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), waitFor);
    };
}

/**
 * Gets all unique system type IDs from selected fields
 */
export function getAllSelectedSystemTypeIds(selectedFields: SelectedField[]): string[] {
    const uniqueIds = new Set<string>();

    // Extract all unique parent IDs from selected fields that aren't empty
    selectedFields.forEach(field => {
        if (field.parent && field.parent.id) {
            uniqueIds.add(field.parent.id);
        }
    });

    return Array.from(uniqueIds);
}

/**
 * Validates a selected field
 */
export function isFieldValid(field: SelectedField): boolean {
    // No operator or select operator is invalid
    if (!field.operator || field.operator.id === 'select') {
        return false;
    }

    // For 'isnull' and 'isnotnull' operators, we don't need a value
    if (field.operator.id === 'empty' || field.operator.id === 'not_empty') {
        return true;
    }

    // For all other operators, we need a value
    if (field.value === null || field.value === undefined) {
        return false;
    }

    // For arrays, validate they have valid content
    if (Array.isArray(field.value)) {
        return field.value.every(v => v !== null && v !== undefined && v !== '');
    }

    // For strings, check that they're not empty
    if (typeof field.value === 'string') {
        return field.value.trim() !== '';
    }

    // For objects (like dropdown selections), check they have an id
    if (typeof field.value === 'object') {
        return field.value !== null && 'id' in field.value && field.value.id !== '';
    }

    // Any other non-null value is considered valid
    return true;
}

/**
 * Extracts all fields from accordion data into a map
 */
export function extractFieldsToMap(accordionData: AccordionItem[]): Map<string, any> {
    const fieldsMap = new Map<string, any>();

    function processItem(item: AccordionItem) {
        // Add the item itself
        if (item.id) {
            fieldsMap.set(item.id, {
                id: item.id,
                label: item.label
            });
        }

        // Process fields if available - use indexer to access the fields property
        if (Array.isArray(item['fields'])) {
            item['fields'].forEach(field => {
                if (field.id) {
                    fieldsMap.set(field.id, field);
                }
            });
        }

        // Process children recursively
        if (Array.isArray(item.children)) {
            item.children.forEach(child => processItem(child));
        }
    }

    // Process all items
    accordionData.forEach(item => processItem(item));

    return fieldsMap;
}

/**
 * Memory-efficient deep cloning for objects
 */
export function safeClone<T>(obj: T): T {
    if (obj === null || obj === undefined) {
        return obj;
    }
    return JSON.parse(JSON.stringify(obj));
}