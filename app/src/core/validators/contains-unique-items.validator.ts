import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'ContainsUniqueItemsConstraint', async: false })
export class ContainsUniqueItemsConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    if (!Array.isArray(value)) {
      return false;
    }

    const caseInsensitiveValues = value.map((item) =>
      (!args?.constraints[1]?.length ? item : item[args.constraints[1]])
        .trim()
        .toLowerCase(),
    );

    return caseInsensitiveValues.every(
      (item, index) =>
        item != null &&
        caseInsensitiveValues.findIndex(
          (other, i) => index !== i && item === other,
        ) === -1,
    );
  }

  defaultMessage(args: ValidationArguments): string {
    return args?.constraints[0] || 'Array items must be unique!';
  }
}

export function ContainsUniqueItems({
  message = null,
  targetField = null,
}: { message?: string; targetField?: string } = {}) {
  return Validate(ContainsUniqueItemsConstraint, [message, targetField]);
}
