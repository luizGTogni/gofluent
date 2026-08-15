import { render } from "ink";
import { App } from "./app/App.js";
import { bootstrap } from "./app/bootstrap.js";

try {
  bootstrap();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`GoFluent failed to start: ${message}\n`);
  process.exit(1);
}

render(<App />);
