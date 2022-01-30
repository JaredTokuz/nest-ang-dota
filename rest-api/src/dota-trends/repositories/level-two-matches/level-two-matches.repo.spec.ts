import { Test, TestingModule } from "@nestjs/testing";
import { LevelTwoMatchesService } from "./level-two-matches.repo";

describe("LevelTwoMatchesService", () => {
  let service: LevelTwoMatchesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LevelTwoMatchesService]
    }).compile();

    service = module.get<LevelTwoMatchesService>(LevelTwoMatchesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
