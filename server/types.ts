import { User } from "@db/schema";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

export {};
