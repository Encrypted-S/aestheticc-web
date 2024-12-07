import { type User as DbUser } from "@db/schema";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends DbUser {}
  }
}

export {};
