import { ApiProperty } from '@nestjs/swagger';
import { ConditionalToken } from '../../entities/conditional-token.entity';

export class OutcomeTokenInfoDto {
  @ApiProperty({
    type: 'number',
    description: "Outcome id in database; (don't mistake with index)",
    example: 123,
  })
  id: number;

  @ApiProperty({
    type: 'string',
    description: 'Outcome title as a shortcut',
    example: 'Yes',
  })
  outcome: string;

  @ApiProperty({
    type: 'number',
    description:
      'Outcome token index as identifier in blockchain; always in [0, numberOfOutcomes - 1] range.',
    example: 1,
  })
  index: number;

  @ApiProperty({
    type: ConditionalToken,
    description:
      'Full hierarchical Outcome token data; Other fields serve as shortcut, but this contains all outcome data.',
  })
  token: ConditionalToken;
}
