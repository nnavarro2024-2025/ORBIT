/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
// import * as logger from "firebase-functions/logger";
import express from "express";
// Import your route logic (will adjust import path as needed)
// You may need to adjust the import path depending on how you move the code
// import { registerRoutes } from "../../server/routes";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.

setGlobalOptions({maxInstances: 10});

// --- Express app setup for API ---
const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: false}));


import {registerRoutes} from "./registerRoutes";

// Register all routes (async)
registerRoutes(app).catch((err) => {
  console.error("Failed to register routes:", err);
});

// Export as Firebase Function
export const api = onRequest(app);

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
