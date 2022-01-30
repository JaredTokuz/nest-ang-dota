import { Injectable, Inject } from "@nestjs/common";
import { LIVE_MATCHES, OPENDOTA_BASE_URL } from "../constants";
import { HttpService } from "@nestjs/axios";
import { OpenDotaLiveResponse } from "../models/live-matches.interfaces";
import { OpenDotaMatchResponse } from "../models/open-dota-match-response.interface";
import { ConstantConfig } from "../models/dota-constants-sync.config";
import { standardRetryStrategy } from "./standard-retry-strategy";

@Injectable()
export class OpenDotaService {
  constructor(private httpService: HttpService) {}

  liveMatches() {
    return standardRetryStrategy(this.get<OpenDotaLiveResponse>("/live"));
  }

  matches(matchId: string) {
    return standardRetryStrategy(this.get<OpenDotaMatchResponse>(`matches/${matchId}`));
  }

  constants(config: ConstantConfig) {
    return standardRetryStrategy(this.get<any>(`constants/${config.resource}`));
  }

  get<T>(path: string) {
    return this.httpService.get<T>(OPENDOTA_BASE_URL + path);
  }
}
