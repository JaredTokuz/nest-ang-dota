import { UsersSchema } from "./users.schema";
import { MongoClient, Db, Collection } from "mongodb";
import { DOTA_MONGO_URI } from "../constants";

export const databaseProviders = [
  {
    provide: "USERS",
    useFactory: async (): Promise<Collection<UsersSchema>> => {
      return new MongoClient(DOTA_MONGO_URI).connect().then(mongoClient => {
        return mongoClient.db().collection("users");
      });
    }
  },
  {
    provide: "SIMPLEUSER",
    useFactory: (): SimpleUserProvider => {
      return {
        "jtokuz3@gmail.com": {
          email: "jtokuz3@gmail.com",
          passwordHash:
            "pbkdf2$10000$b97cbe1ed7c0c83bb4ec50e5ee422aacc5e7567c7e317763b45c8f97b697b5e7fd32c012dd6ad8332f4f630be759d078f7405d1434df5af1ae90b7846ece67e2$3c50cb4f4564d6ab10562ffcd624b0cc06dad27698931516d490be64333d68909926f19f56e0b5ebd008f7474d9565c41a874adc7c8a751dd9b272cf67c0235d",
          roles: ["admin"]
        }
      };
    }
  }
];

export interface SimpleUserProvider {
  [email: string]: UsersSchema;
}
