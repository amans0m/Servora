import { Module } from '@nestjs/common';

import { CouponsModule } from '../coupons/coupons.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { IncentivesModule } from '../incentives/incentives.module';
import { OtpModule } from '../otp/otp.module';
import { PaymentsModule } from '../payments/payments.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { LifecycleController } from './lifecycle.controller';
import { LifecycleService } from './lifecycle.service';

@Module({
  imports: [
    CouponsModule,
    DispatchModule,
    IncentivesModule,
    OtpModule,
    PaymentsModule,
    PayoutsModule,
  ],
  controllers: [BookingsController, LifecycleController],
  providers: [BookingsService, LifecycleService],
  exports: [BookingsService],
})
export class BookingsModule {}
