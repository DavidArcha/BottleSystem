import { ListItem } from "../interfaces/table-dropdown.interface";

// dropdown-data.constant.ts
export const DROPDOWN_DATA = {
    "boolOperations": [
        { "id": "yes", "en": "Yes", "de": "Ja" },
        { "id": "no", "en": "No", "de": "Nein" }
    ],
    "match": [
        { "id": "equals", "en": "equals", "de": "gleich" },
        { "id": "not_equals", "en": "not equals", "de": "ungleich" },
        { "id": "empty", "en": "empty", "de": "leer" },
        { "id": "not_empty", "en": "not empty", "de": "nicht leer" },
        { "id": "yes", "en": "Yes", "de": "Ja" },
        { "id": "no", "en": "No", "de": "Nein" }
    ],
    "numberOperations": [
        { "id": "equals", "en": "equals", "de": "gleich" },
        { "id": "not_equals", "en": "not equals", "de": "ungleich" },
        { "id": "empty", "en": "empty", "de": "leer" },
        { "id": "not_empty", "en": "not empty", "de": "nicht leer" },
        { "id": "start_on", "en": "Start-On", "de": "Beginn am" },
        { "id": "start_after", "en": "Start-after", "de": "Beginn nach" },
        { "id": "ends_on", "en": "Ends on", "de": "Endet am" },
        { "id": "between", "en": "between", "de": "zwischen" },
        { "id": "not_between", "en": "not between", "de": "nicht zwischen" },
        { "id": "contains_date", "en": "Contains date", "de": "Enthält Datum" },
        { "id": "similar", "en": "similar", "de": "similar-de" },
    ],
    "dateOperations": [
        { "id": "equals", "en": "equals", "de": "gleich" },
        { "id": "not_equals", "en": "not equals", "de": "ungleich" },
        { "id": "empty", "en": "empty", "de": "leer" },
        { "id": "not_empty", "en": "not empty", "de": "nicht leer" },
        { "id": "start_on", "en": "Start-On", "de": "Beginn am" },
        { "id": "start_after", "en": "Start-after", "de": "Beginn nach" },
        { "id": "ends_on", "en": "Ends on", "de": "Endet am" },
        { "id": "between", "en": "between", "de": "zwischen" },
        { "id": "not_between", "en": "not between", "de": "nicht zwischen" },
        { "id": "contains_date", "en": "Contains date", "de": "Enthält Datum" },
        { "id": "similar", "en": "similar", "de": "similar-de" },
    ],
    "timeOperations": [
        { "id": "equals", "en": "equals", "de": "gleich" },
        { "id": "not_equals", "en": "not equals", "de": "ungleich" },
        { "id": "empty", "en": "empty", "de": "leer" },
        { "id": "not_empty", "en": "not empty", "de": "nicht leer" },
        { "id": "start_on", "en": "Start-On", "de": "Beginn am" },
        { "id": "start_after", "en": "Start-after", "de": "Beginn nach" },
        { "id": "ends_on", "en": "Ends on", "de": "Endet am" },
        { "id": "between", "en": "between", "de": "zwischen" },
        { "id": "not_between", "en": "not between", "de": "nicht zwischen" },
        { "id": "contains_date", "en": "Contains date", "de": "Enthält Datum" },
        { "id": "similar", "en": "similar", "de": "similar-de" },
    ],
    "tOperations": [
        { "id": "equals", "en": "equals", "de": "gleich" },
        { "id": "not_equals", "en": "not equals", "de": "ungleich" },
        { "id": "empty", "en": "empty", "de": "leer" },
        { "id": "not_empty", "en": "not empty", "de": "nicht leer" }
    ],
    "stringOperations": [
        { "id": "equals", "en": "equals", "de": "gleich" },
        { "id": "not_equals", "en": "not equals", "de": "ungleich" },
        { "id": "empty", "en": "empty", "de": "leer" },
        { "id": "not_empty", "en": "not empty", "de": "nicht leer" },
        { "id": "contains", "en": "Contains", "de": "Enthält" },
        { "id": "starts_with", "en": "Start-With", "de": "" },
        { "id": "between", "en": "between", "de": "zwischen" },
        { "id": "not_between", "en": "not between", "de": "nicht zwischen" },
        { "id": "similar", "en": "similar", "de": "similar-de" },
    ],
};

// Utility function to transform into ListItem[]
export function transformDropdownData(category: keyof typeof DROPDOWN_DATA): ListItem[] {
    return DROPDOWN_DATA[category].map(item => ({
        id: item.id,
        label: item.en // Use English labels
    }));
}
