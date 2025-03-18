import { DropdownItem } from "./table-dropdown.interface";

export interface SelectedField {
    rowid?: string;
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
    operatorOptions: any[];
    value: any;  // This can be null, string, array, or object depending on the field type
    operatorTouched?: boolean;
    valueTouched?: boolean | boolean[];
    dropdownData?: any[];
    parentTouched?: boolean;
    isParentArray?: boolean;
}