import fetch from "node-fetch";
import * as dotenv from "dotenv";
import { main } from "./entry";

dotenv.config();

// @ts-expect-error fetch types different
global.fetch = fetch;

// Cast to record to make indexing more easy
// We check to make sure all keys are actually defined when reading
main(process.env as Record<string, string>);
