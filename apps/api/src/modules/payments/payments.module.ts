import { Module } from '@nestjs/common';

import { OtpModule } from '../otp/otp.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { HttpRazorpayClient, RAZORPAY_CLIENT } from './razorpay.client';

@Module({
  imports: [OtpModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    { provide: RAZORPAY_CLIENT, useClass: HttpRazorpayClient },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
