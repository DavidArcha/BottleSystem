import { DropdownItem } from "./table-dropdown.interface";

/**
 * Interface for search criteria data that gets submitted to search services.
 * This represents the processed data structure used for actual search operations,
 * as opposed to the display structure used by the UI components.
 */
export interface SearchCriteria {
    rowId?: string;
    parent: {
        id: string;
        label: string;
    };
    parentSelected?: DropdownItem | DropdownItem[] | null;
    field: {
        id: string;
        label: string;
    };
    operator: {
        id: string;
        label: string;
    };
    // Value can be of various types depending on the field
    value: any;
}