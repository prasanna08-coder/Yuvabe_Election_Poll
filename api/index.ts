import express from "express";
import { setupRoutes } from "../src/api_logic.ts";

const app = express();
setupRoutes(app);

export default app;
