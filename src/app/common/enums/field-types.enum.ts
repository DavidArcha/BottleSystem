export enum FieldType {
  Text = 'text',
  Number = 'number',
  Date = 'date',
  Bool = 'bool',
  Dropdown = 'dropdown',
  Time = 'time',
  Unknown = 'unknown',
  Button = 'button'
}

// Sets of fields
const NumericFields = ['Age', 'Phone', '-21', '-22', '-23', '-24', '-25', '26', '27', '28', '29', '30'];
const StringFields = ['Name', 'Image', '-11', '-12', '-13', '-14', '15', '16', '17', '18', '19', '20'];
const DateFields = ['Document', 'DT-EN-1', '-42', 'DT-EN-3', 'DT-EN-4', '45', 'DT-EN-6', '47', 'DT-EN-8', '49', 'DT-EN-10'];
const DropdownFields = ['PinCode', '-31', '-32', '-33', '-34', '-35', '36', '37', '38', '39', '40'];
const buttonFields = ['-1', '-2', '-3', '-4', '-5', '-6', '-7', '-8', '-9', '-10'];

// Numeric fields set
export const NumericFieldMapping: { [key: string]: FieldType } = Object.fromEntries(
  NumericFields.map(field => [field, FieldType.Number])
);

// String fields set
export const StringFieldMapping: { [key: string]: FieldType } = Object.fromEntries(
  StringFields.map(field => [field, FieldType.Text])
);

// Date fields set
export const DateFieldMapping: { [key: string]: FieldType } = Object.fromEntries(
  DateFields.map(field => [field, FieldType.Date])
);

// Dropdown fields set
export const DropdownFieldMapping: { [key: string]: FieldType } = Object.fromEntries(
  DropdownFields.map(field => [field, FieldType.Dropdown])
);

// Button fields set
export const ButtonFieldMapping: { [key: string]: FieldType } = Object.fromEntries(
  buttonFields.map(field => [field, FieldType.Button])
);

// Updated dropdown mapping with more specificity
export const DropdownDataMapping: { [key: string]: string } = {
  // Map field IDs to their data source
  'DD-EN-1': 'brandData',
  'DD-EN-4': 'brandData',
  'DD-EN-2': 'stateData',
  'DD-EN-3': 'stateData',
  // Add more mappings as needed
  'DD-EN-5': 'brandData',
  'DD-EN-6': 'stateData',
  'DD-EN-7': 'brandData',
  'DD-EN-8': 'stateData',
  'DD-EN-9': 'brandData',
  'DD-EN-10': 'stateData',
  // Fallback for any other dropdown fields
  'default': 'brandData',
  // Map field IDs to dropdown data sources
  'status': 'statusData',
  'category': 'categoryData',
  'type': 'typeData'
};

// Combined field type mapping for easy lookup
export const FieldTypeMapping: { [key: string]: FieldType } = {
  ...NumericFieldMapping,
  ...StringFieldMapping,
  ...DateFieldMapping,
  ...DropdownFieldMapping,
  ...ButtonFieldMapping,
};