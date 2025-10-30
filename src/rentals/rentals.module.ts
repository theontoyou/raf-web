import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';
import { Rental, RentalSchema } from '../schemas/rental.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Rental.name, schema: RentalSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MatchesModule,
  ],
  controllers: [RentalsController],
  providers: [RentalsService],
})
export class RentalsModule {}
