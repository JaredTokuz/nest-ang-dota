import { Test, TestingModule } from "@nestjs/testing";
import { ConstantsRepo } from "../constants.repo";

describe("ConstantsRepo", () => {
  let service: ConstantsRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConstantsRepo]
    }).compile();

    service = module.get<ConstantsRepo>(ConstantsRepo);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
