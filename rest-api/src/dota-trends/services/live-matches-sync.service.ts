// import { Injectable, Inject } from "@nestjs/common";
// import { LIVE_MATCHES } from "../constants";
// import { HttpService } from "@nestjs/axios";
// import { firstValueFrom } from "rxjs";
// import { Collection, UpdateOneModel, Filter } from "mongodb";
// import { OpenDotaLiveResponse } from "../models/live-matches.interfaces";
// import { LiveGameDocument } from "../models/live-matches.interfaces";
// import { AutomateContext } from "../services/automate-sync.service";

// @Injectable()
// export class LiveMatchesSyncService {
//   constructor(
//     @Inject(LIVE_MATCHES)
//     private liveMatchCollection: Collection<LiveMatchSyncDocument>,
//     private httpService: HttpService
//   ) {}

//   /**
//    * gets the live match data, parses the important bits
//    * and upserts to the database
//    * @returns bulkWriteResult from mongo db
//    */
//   async sync(ctx?: AutomateContext) {
//     try {
//       const resp = await firstValueFrom(this.httpService.get<OpenDotaLiveResponse>("/live"));
//       const updateOperations = resp.data
//         .filter(x => x.average_mmr > 8000)
//         .map(x_1 => {
//           return {
//             updateOne: {
//               filter: { match_id: x_1.match_id },
//               update: {
//                 $set: {
//                   match_id: x_1.match_id,
//                   activate_time: x_1.activate_time,
//                   game_finished: null
//                 }
//               },
//               upsert: true
//             } as UpdateOneModel<LiveMatchSyncDocument>
//           };
//         });
//       return this.liveMatchCollection.bulkWrite(updateOperations);
//     } catch (e) {
//       throw new Error(e);
//     }
//   }

//   /**
//    * a simple query wrapper for the services only collection
//    * @param query a filter operation to be used to query the collection
//    * @returns an array of mongo documents matching the query
//    */
//   get(query: Filter<LiveMatchSyncDocument>) {
//     return this.liveMatchCollection.find(query).toArray();
//   }
// }
