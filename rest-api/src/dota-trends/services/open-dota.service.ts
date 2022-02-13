import { Injectable, Inject } from '@nestjs/common';
import { LIVE_MATCHES, OPENDOTA_BASE_URL } from '../constants';
import { HttpService } from '@nestjs/axios';
import { OpenDotaLiveResponse } from '../interfaces/live-matches';
import { OpenDotaMatch } from '../interfaces/open-dota-match';
import { ConstantConfig } from '../interfaces/dota-constants-sync';
import { RetryOpts, standardRetryStrategy } from '../../functions/standard-retry-strategy';
import { Context } from '../../interfaces/process';

@Injectable()
export class OpenDotaService {
  ctx: Context = undefined;
  msdelay = 5000;
  retries = 10;
  strat: RetryOpts = {
    msdelay: this.msdelay,
    retries: this.retries,
    logger: this.ctx
  };
  constructor(private httpService: HttpService) {}

  get<T>(path: string) {
    return this.httpService.get<T>(OPENDOTA_BASE_URL + path);
  }

  liveMatches() {
    return standardRetryStrategy(this.get<OpenDotaLiveResponse>('/live'), this.strat);
  }

  matches(matchId: string) {
    return standardRetryStrategy(this.get<OpenDotaMatch>(`matches/${matchId}`), this.strat);
  }

  constants(config: ConstantConfig) {
    return standardRetryStrategy(this.get<any>(`constants/${config.resource}`), this.strat);
  }
}
