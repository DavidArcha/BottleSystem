
export interface ListItem {
    id: string;
    label: string;
}

export interface TableItem extends ListItem {
    column1: string;
    column2: string;
}

export interface DropdownItem {
    id: string;
    translations?: { [key: string]: string };
    label?: string;
    selected?: boolean;
    tableData?: { [key: string]: any };
}