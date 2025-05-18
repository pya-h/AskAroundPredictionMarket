import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { GetConditionalTokenBalanceQuery } from './get-ct.dto';
import { IsEnumDetailed } from '../../core/decorators/is-enum-detailed.decorator';
import { OutcomePossibilityBasisEnum } from '../enums/outcome-popularity-basis.enum';

export class GetConditionalTokensPossibilityQuery extends GetConditionalTokenBalanceQuery {
  @ApiPropertyOptional({
    enum: OutcomePossibilityBasisEnum,
    enumName: 'OutcomePossibilityBasisEnum',
    description:
      'Specify wether you want the purchasing price or selling price.',
    default: OutcomePossibilityBasisEnum.PRICE,
    required: false,
  })
  @IsOptional()
  @IsEnumDetailed(OutcomePossibilityBasisEnum)
  basis?: OutcomePossibilityBasisEnum;
}
