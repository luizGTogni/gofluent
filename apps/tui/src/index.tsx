import { render } from "ink";
import { App } from "./app/App.js";
import { bootstrap } from "./app/bootstrap.js";

const ENTER_ALT_SCREEN = "\x1b[?1049h";
const LEAVE_ALT_SCREEN = "\x1b[?1049l";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

const services = (() => {
  try {
    return bootstrap();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`GoFluent failed to start: ${message}\n`);
    process.exit(1);
  }
})();

if (process.stdout.isTTY) {
  process.stdout.write(ENTER_ALT_SCREEN + HIDE_CURSOR);
  // Restores the primary screen buffer no matter how the process ends
  // (normal exit, uncaught error) — the 'exit' event always fires last.
  process.on("exit", () => process.stdout.write(SHOW_CURSOR + LEAVE_ALT_SCREEN));
  // Registering these overrides Node's default abrupt termination for external
  // signals (e.g. `kill`), routing them through process.exit() so 'exit' still fires.
  process.on("SIGINT", () => process.exit(0));
  process.on("SIGTERM", () => process.exit(0));
}

render(<App services={services} />);
