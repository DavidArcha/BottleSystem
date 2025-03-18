export interface AccordionItem {
    [key: string]: any;
    id: string;
    label: string;
    children: AccordionItem[];
    readonly?: boolean;
    isIcon?: boolean;
    isExpanded?: boolean;
    isSelected?: boolean;
    isActive?: boolean;
    isDisabled?: boolean;
    isOpen?: boolean;
}