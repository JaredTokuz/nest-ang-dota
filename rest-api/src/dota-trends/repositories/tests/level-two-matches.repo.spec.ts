import { Test, TestingModule } from "@nestjs/testing";
import { LevelTwoMatchesRepo } from "../level-two-matches.repo";

describe("LevelTwoMatchesRepo", () => {
  let service: LevelTwoMatchesRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LevelTwoMatchesRepo]
    }).compile();

    service = module.get<LevelTwoMatchesRepo>(LevelTwoMatchesRepo);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
