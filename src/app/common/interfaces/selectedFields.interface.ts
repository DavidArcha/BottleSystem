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
    operator?: {
        id: string;
        label: string;
    };
    value?: any;  // This can be null, string, array, or object depending on the field type
    operatorTouched?: boolean;
    valueTouched?: boolean | boolean[];    
    parentTouched?: boolean;
    isParentArray?: boolean;
    currentLanguage?: string;
}