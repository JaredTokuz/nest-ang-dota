import { Test, TestingModule } from "@nestjs/testing";
import { LiveMatchRepo } from "../live-match.repo";

describe("LiveMatchRepo", () => {
  let service: LiveMatchRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiveMatchRepo]
    }).compile();

    service = module.get<LiveMatchRepo>(LiveMatchRepo);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
