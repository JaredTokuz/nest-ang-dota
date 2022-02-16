import { HttpModule } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { tap } from 'rxjs';
import { delay } from '../../misc';
import { configDotaConstants } from '../interfaces/dota-constants-sync';
import { OpenDotaService } from './open-dota.service';

/**
 * testing=true npx jest open-dota.service.spec.ts --forceExit
 */

describe('OpenDotaService', () => {
  let service: OpenDotaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [OpenDotaService]
    })
      .setLogger(new Logger())
      .compile();

    service = module.get<OpenDotaService>(OpenDotaService);

    await delay(2000);
  });

  it('live matches endpoint returns the right data', done => {
    service
      .liveMatches()
      .pipe(
        tap(data => {
          expect(Array.isArray(data)).toBe(true);
          data.forEach(ele => {
            expect(ele).toHaveProperty('match_id');
            expect(ele).toHaveProperty('activate_time');
            expect(ele).toHaveProperty('average_mmr');
          });
        })
      )
      .subscribe({
        error: err => console.log('error', err),
        complete: () => done()
      });
  });

  it('should return a match with data', done => {
    service
      .matches('6404869902')
      .pipe(
        tap(data => {
          expect(data).toHaveProperty('match_id');
          expect(data).toHaveProperty('players');
          expect(data).toHaveProperty('teamfights');
          expect(data).toHaveProperty('objectives');
          expect(data).toHaveProperty('radiant_win');
        })
      )
      .subscribe({
        error: err => console.log('error', err),
        complete: () => {
          done();
        }
      });
  });

  it(
    'should fail',
    done => {
      service
        .matches('')
        .pipe(tap(data => {}))
        .subscribe({
          error: err => {
            expect(err).toBeTruthy();
            done();
          }
        });
    },
    1000 * 10
  );

  describe('Testing each of the constants and config', () => {
    it('should return the heroes constants', done => {
      const heroConfig = configDotaConstants.find(x => x.resource == 'heroes');
      service
        .constants(heroConfig)
        .pipe(
          tap(data => {
            expect(data).toHaveProperty('1');
            expect(data['1']).toHaveProperty('id');
            expect(data['1']).toHaveProperty('name');
            expect(data['1']).toHaveProperty('localized_name');
          })
        )
        .subscribe({
          complete: () => done()
        });
    });

    it('should return the ability ids constants', done => {
      const abilitiesConfig = configDotaConstants.find(x => x.resource == 'ability_ids');
      service
        .constants(abilitiesConfig)
        .pipe(
          tap(data => {
            expect(data).toHaveProperty('0');
            expect(typeof data['0']).toBe('string');
          })
        )
        .subscribe({
          complete: () => done()
        });
    });

    it('should return the hero ability constants', done => {
      const abilitiesConfig = configDotaConstants.find(x => x.resource == 'hero_abilities');
      service
        .constants(abilitiesConfig)
        .pipe(
          tap(data => {
            expect(data).toHaveProperty('npc_dota_hero_antimage');
            expect(data['npc_dota_hero_antimage']).toHaveProperty('abilities');
            expect(data['npc_dota_hero_antimage']).toHaveProperty('talents');

            expect(Array.isArray(data['npc_dota_hero_antimage']['abilities'])).toBe(true);
            expect(Array.isArray(data['npc_dota_hero_antimage']['talents'])).toBe(true);

            expect(typeof data['npc_dota_hero_antimage']['abilities'][0]).toBe('string');
            expect(data['npc_dota_hero_antimage']['talents'][0]).toHaveProperty('name');
            expect(data['npc_dota_hero_antimage']['talents'][0]).toHaveProperty('level');
          })
        )
        .subscribe({
          complete: () => done()
        });
    });

    it('should return the item ids constants', done => {
      const itemConfig = configDotaConstants.find(x => x.resource == 'item_ids');
      service
        .constants(itemConfig)
        .pipe(
          tap(data => {
            expect(data).toHaveProperty('1');
            expect(typeof data['1']).toBe('string');
          })
        )
        .subscribe({
          complete: () => done()
        });
    });
  });
});
