import { Test, TestingModule } from '@nestjs/testing';
import { MatchesRepo } from '../matches.store';

describe('MatchesRepo', () => {
  let service: MatchesRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchesRepo]
    }).compile();

    service = module.get<MatchesRepo>(MatchesRepo);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
