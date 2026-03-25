import { Injectable } from '@nestjs/common';
import { TransactionsService } from '@modules/transactions/transactions.service';
import { MintDto, MintResponseDto } from './dto/mint.dto';

@Injectable()
export class AdminService {
  constructor(private readonly txService: TransactionsService) {}

  async mint(dto: MintDto, adminUserId: string): Promise<MintResponseDto> {
    return await this.txService.mintToAccount(
      adminUserId,
      dto.adminUserAccountId,
      dto.accountId,
      dto.amount,
      dto.description,
    );
  }
}
