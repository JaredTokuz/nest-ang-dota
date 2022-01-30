import { Test, TestingModule } from "@nestjs/testing";
import { MatchesService } from "./matches.repo";

describe("MatchesService", () => {
  let service: MatchesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchesService]
    }).compile();

    service = module.get<MatchesService>(MatchesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
