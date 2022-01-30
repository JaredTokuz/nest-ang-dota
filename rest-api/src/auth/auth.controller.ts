import { Collection } from "mongodb";
import { UsersSchema } from "./users.schema";
import { Body, Controller, Post, UnauthorizedException, InternalServerErrorException, Inject } from "@nestjs/common";
import * as password from "password-hash-and-salt";
import * as jwt from "jsonwebtoken";
import { JWT_SECRET } from "../constants";
import { promisify } from "util";
import { SimpleUserProvider } from "./database.provider";

@Controller("login")
export class AuthController {
  constructor(@Inject("SIMPLEUSER") private user: SimpleUserProvider) {}

  @Post()
  async login(@Body("email") email: string, @Body("password") plaintextPassword: string) {
    // const user = await this.user.findOne({ email });

    const user = this.user[email];

    if (!user) {
      console.log("User does exist on the database.");
      throw new UnauthorizedException();
    }

    const pass = password(plaintextPassword);
    pass.verifyAgainst = promisify(pass.verifyAgainst);
    const verified = await pass.verifyAgainst(user.passwordHash);
    if (!verified) {
      throw new UnauthorizedException();
    }

    const authJwtToken = jwt.sign({ email, roles: user.roles }, JWT_SECRET);

    return { authJwtToken };
  }

  @Post("register")
  async register(@Body("email") email: string, @Body("password") plaintextPassword: string) {
    throw new UnauthorizedException("No registering allowed");

    // const pass = password(plaintextPassword);
    // pass.hash = promisify(pass.hash);
    // const hash = await pass.hash();
    // const roles = ["basic"];

    // /** assuming mongo backend */
    // await this.user.insertOne({
    //   email,
    //   passwordHash: hash,
    //   roles
    // });

    // const authJwtToken = jwt.sign({ email, roles }, JWT_SECRET);

    // return { authJwtToken };
  }
}
