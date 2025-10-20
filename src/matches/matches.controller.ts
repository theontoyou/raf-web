import { Controller, Get, Query } from '@nestjs/common';
import { MatchesService } from './matches.service';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get('top')
  async getTopMatches(
    @Query('user_id') userId: string,
    @Query('city') city?: string,
    @Query('age_min') ageMin?: string,
    @Query('age_max') ageMax?: string,
    @Query('gender') gender?: string,
  ) {
    return this.matchesService.getTopMatches({
      user_id: userId,
      city,
      age_min: ageMin ? parseInt(ageMin) : undefined,
      age_max: ageMax ? parseInt(ageMax) : undefined,
      gender,
    });
  }
}
