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