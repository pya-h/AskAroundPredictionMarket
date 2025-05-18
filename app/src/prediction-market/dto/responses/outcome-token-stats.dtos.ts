import { ApiProperty } from '@nestjs/swagger';
import { OutcomeTokenInfoDto } from './outcome-token-info.dto';

export class OutcomeTokenPriceInfo extends OutcomeTokenInfoDto {
  @ApiProperty({
    description: `The balance of the requesting user after. When market's been closed,
      outcome price will be equal to outcome trueness ratio; In that case, price would be null until market is resolved.`,
    nullable: true,
  })
  price: number | null;
}

export class OutcomeTokenPriceAndParticipantsInfo extends OutcomeTokenPriceInfo {
  @ApiProperty({
    description:
      'Number of users participated on this outcome (bought/sold); It indirectly affects the price in prediction markets.',
  })
  participants: string;
}

export class OutcomeTokenBalanceInfo extends OutcomeTokenInfoDto {
  @ApiProperty({
    description:
      "The balance of the requesting user after. It's string to prevent number overflow",
  })
  balance: string;
}

export class OutcomeTokenParticipationInfo extends OutcomeTokenInfoDto {
  @ApiProperty({
    type: 'number',
    description:
      'How much an outcome may happen from users perspective, in percentage.',
    nullable: true,
  })
  participationPossibility: number;
}
