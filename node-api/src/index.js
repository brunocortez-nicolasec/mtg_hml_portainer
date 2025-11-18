import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import "./passport.js";
import { meRoutes, authRoutes } from "./routes";
import usersRoutes from "./services/users/index.js";
import conjurRoutes from "./services/conjur/index.js";
import rolesRoutes from "./services/roles/index.js";
import groupsRoutes from "./services/groups/index.js";
import platformsRoutes from "./services/platforms/index.js";
import packagesRoutes from "./services/packages/index.js";
import importsRoutes from "./services/imports/index.js";
import metricsRoutes from "./services/metrics/index.js";
import identitiesRoutes from "./services/identities/index.js";
import divergencesRoutes from "./services/divergences/index.js";
import livefeedRoutes from "./services/livefeed/index.js";
import systemsRoutes from "./services/systems/index.js";
import sodRoutes from "./services/sod/index.js";
import profilesRoutes from "./services/profiles/index.js";
import attributesRoutes from "./services/attributes/index.js";
import rbacRoutes from "./services/rbac/index.js";
import accountsRoutes from "./services/accounts/index.js";
import systemsCatalogRoutes from "./services/systems-catalog/index.js";
import resourcesRoutes from "./services/resources/index.js";
import exportsRoutes from "./services/exports/index.js";

import passport from "passport"; // Necessário para proteger a nova rota
// ======================= INÍCIO DA ALTERAÇÃO =======================
import { testCsvConnection } from "./services/datasources/testCsv.js";
import { testDbConnection } from "./services/datasources/testDb.js"; // <-- Importado
// ======================== FIM DA ALTERAÇÃO =========================

import path from "path";
import * as fs from "fs";

dotenv.config();

const PORT = process.env.PORT || 8080;
const app = express();

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.APP_URL_CLIENT,
      "http://localhost:8080",
      "http://localhost:3000",
      "http://localhost:3080/",
      "http://localhost:8080/",
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type, Authorization",
};

app.use(cors(corsOptions));

// bodyParser.json() é geralmente substituído por express.json()
// const jsonParser = bodyParser.json(); // <<< Pode ser removido se não usado em outro lugar
app.use(express.json()); // <<< Garante que o body parser JSON está ativo

app.get("/", function (req, res) {
  const __dirname = fs.realpathSync(".");
  res.sendFile(path.join(__dirname, "/src/landing/index.html"));
});

// Suas rotas existentes
app.use("/", authRoutes);
app.use("/me", meRoutes);
app.use("/users", usersRoutes);
app.use("/roles", rolesRoutes);
app.use("/groups", groupsRoutes);
app.use("/platforms", platformsRoutes);
app.use("/packages", packagesRoutes);
app.use("/imports", importsRoutes);
app.use("/metrics", metricsRoutes);
app.use("/identities", identitiesRoutes);
app.use("/divergences", divergencesRoutes);
app.use("/live-feed", livefeedRoutes);
app.use("/systems", systemsRoutes);
app.use("/sod-rules", sodRoutes);
app.use("/profiles", profilesRoutes);
app.use("/identity-attributes", attributesRoutes);
app.use("/rbac-rules", rbacRoutes);
app.use("/accounts", accountsRoutes);
app.use("/systems-catalog", systemsCatalogRoutes);
app.use("/resources", resourcesRoutes);
app.use("/exports", exportsRoutes);

app.post(
  "/datasources/test-csv",
  passport.authenticate("jwt", { session: false }),
  testCsvConnection
);
app.post(
  "/datasources/test-db",
  passport.authenticate("jwt", { session: false }),
  testDbConnection
);

app.listen(PORT, () => console.log(`Server listening to port ${PORT}`));