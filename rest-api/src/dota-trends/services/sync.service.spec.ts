import { Test, TestingModule } from "@nestjs/testing";
import { OpenDotaService } from "./open-dota.service";

describe("OpenDotaService", () => {
  let service: OpenDotaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenDotaService]
    }).compile();

    service = module.get<OpenDotaService>(OpenDotaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
