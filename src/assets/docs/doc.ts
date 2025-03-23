
Row Based Search Functionality API 
This feature enables users to construct search conditions dynamically using a row-based table structure. Each row represents a single search condition, which is composed of the following five components:
1.	Parent Column (Archival Type)
2.	Field Column (Selected Field)
3.	Operator Column (Relation Operations)
4.	Value Column (Input/Selection)
5.	Action Column (Search/Delete)
The search is executed per row and allows for both system field-based and archival type-based selections.
1. Parent Column (Archival Type)
This column represents the source field group (either System Fields or Archival Types). There are two primary cases depending on how the field is selected.
Case 1: Selection from System Fields
•	If the user selects a field from the System Fields, a multi-select dropdown is provided.
•	This implies multiple values can be selected for a single condition.
•	These selections are stored in an array format.
parentSelected: [
  { id: "1", label: "Windows-EN" },
  { id: "2", label: "Mac-EN" }
]
isParentArray: true
Example UI: A dropdown where the user selects multiple operating systems.
Case 2: Selection from Archival Type or Nested Accordion
•	If the field comes from a selected Archival Type field or accordion (nested group), then the value is a single object.
•	This object contains id and label.
parent: { id: "100", label: "Employee Records" }
isParentArray: false
Example UI: User selects a nested field under "Employee Records" → "Personal Info".
2. Field Column (Selected Field)
•	This column displays the field selected by the user.
•	It is always a single object.
field: { id: "Age", label: "Age" }
Example: If user selects “Age” field, this object holds its metadata.
3. Operator Column (Relation Operations)
•	The operator defines the logical relationship to apply for the field value (e.g., Equals, Between, Empty).
•	It is also represented as a single object.
operator: { id: "between", label: "Between" }
Common Operators: equals, contains, empty, between, lessThan, greaterThan, etc.
4. Value Column (Input/Selection)
This column holds the value(s) input by the user. There are two cases:
Case 1: Single Value
•	Used for simple operators like equals, contains, empty, etc.
value: "25"
Example: For field “Age” and operator “equals”, the user enters "25".
Case 2: Dual Values
•	Used for operators like between.
•	Two controls are shown, and values are stored in a hyphen-separated string.
value: "20 - 30"
Example: “Age” field with “between” operator, user enters "20" and "30".
5. Action Column (Search/Delete)
•	Contains two buttons:
o	Search: Triggers API call using the entire row data.
o	Delete: Removes the current row.
Data Format (Frontend to Backend)
Each row in the table is serialized into the following format and sent to the API as FormData:
Sample JSON (xyz.ts):
{
  rowid: "781QGWJ",
  parent: { id: "", label: "" },
  parentSelected: [
    { id: "1", label: "Windows-EN" }
  ],
  field: { id: "Age", label: "Age" },
  operator: { id: "empty", label: "empty" },
  value: null,
  isParentArray: true,
  parentTouched: true,
  operatorTouched: true,
  valueTouched: true
}
API Integration Notes
•	On clicking Search, each row’s object is sent to the backend via API.
•	API expects FormData structure with key-value pairs from the row.
•	Each row is treated as a separate request unless batch search is implemented.
Validation & UI Feedback
•	parentTouched, operatorTouched, valueTouched: Useful flags to handle user interactions and validations.
•	Empty fields should not allow submission.
•	Value control rendering should depend on operator selected.



