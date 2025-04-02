export enum OperatorType {
  Equals = 'equals',
  NotEquals = 'notequals',
  Greater = 'greater',
  Less = 'less',
  GreaterEquals = 'greaterequals',
  LessEquals = 'lessequals',
  Contains = 'contains',
  StartsWith = 'startswith',
  EndsWith = 'endswith',
  Between = 'between',
  In = 'in',
  NotIn = 'notin',
  Select = 'select',
  Empty = 'empty',
  NotEmpty = 'not_empty',
  Yes = 'yes',
  No = 'no',
  NotBetween = 'not_between',
  Similar = 'similar',
  ContainsDate = 'contains_date'
}

// Operators that require dual values (like ranges)
export const DualOperators: OperatorType[] = [
  OperatorType.Between,
  OperatorType.NotBetween,
  OperatorType.Similar,
  OperatorType.ContainsDate
];

// Operators that don't require any value
export const NoValueOperators: OperatorType[] = [
  OperatorType.Empty,
  OperatorType.NotEmpty,
  OperatorType.Yes,
  OperatorType.No
];

/**
 * Defines default operators to be selected for different field types
 * when a new field is added to the relation table
 */
export enum DefaultOperatorPriority {
  Equals = 1,
  Yes = 2,
  Empty = 3
}

/**
 * Maps field types to their default operators in priority order
 */
export const DefaultOperatorsByFieldType: { [key: string]: string[] } = {
  // For text fields prioritize: equals, then empty
  'text': [OperatorType.Equals, OperatorType.Empty] as string[],

  // For number fields prioritize: equals, then empty
  'number': [OperatorType.Equals, OperatorType.Empty] as string[],

  // For date fields prioritize: equals, then empty
  'date': [OperatorType.Equals, OperatorType.Empty] as string[],

  // For boolean fields prioritize: yes, then equals, then empty
  'bool': [OperatorType.Yes, OperatorType.Equals, OperatorType.Empty] as string[],

  // For dropdown fields prioritize: equals, then empty
  'dropdown': [OperatorType.Equals, OperatorType.Empty] as string[],

  // Default for any other field type: equals, then empty
  'default': [OperatorType.Equals, OperatorType.Empty] as string[]
};