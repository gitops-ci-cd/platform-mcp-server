import { app, config } from "./app.js";

app.listen(config.port, () => {
  console.info(`Log level is set to ${config.logLevel}`);
  console.info(`Server is running on port ${config.port}`);
});
