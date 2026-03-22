import { Injectable } from '@nestjs/common';
import { TransactionsService } from '@modules/transactions/transactions.service';
import { MintDto } from './dto/mint.dto';

@Injectable()
export class AdminService {
  constructor(private readonly txService: TransactionsService) {}

  async mint(dto: MintDto) {
    return this.txService.mintToAccount(dto.accountId, dto.amount, dto.description);
  }
}
