import express from "express";
import cors from "cors";
import routes from "./routes.js";

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.use(cors());
app.use("/api", routes);

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
