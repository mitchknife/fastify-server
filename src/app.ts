import fs from "fs";
import path from "path";
import { FastifyPluginAsync } from "fastify";
import { ConformanceApiService } from "./conformanceApiService.js";
import { conformanceApiPlugin } from "./conformanceApiPlugin.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type AppOptions = {};
const options: AppOptions = {};

const tests = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../FacilityJavaScript/conformance/ConformanceTests.json"), "utf8")
).tests;

const app: FastifyPluginAsync<AppOptions> = async (fastify, opts): Promise<void> => {
  fastify.register(conformanceApiPlugin, { api: new ConformanceApiService(tests) });
};

export default app;
export { app, options };
