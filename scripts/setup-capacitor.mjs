import { mkdirSync, writeFileSync, rmSync, readdirSync, appendFileSync } from "fs";
import { execSync } from "child_process";

const log = (msg) => {
  console.log(msg);
  appendFileSync("/tmp/capacitor-setup.log", msg + "\n");
};

try {
  log("CWD: " + process.cwd());
  log("Node: " + process.version);
  log("Files in root: " + JSON.stringify(readdirSync(".").slice(0, 20)));
  const bins = readdirSync("node_modules/.bin").join(", ");
  log("bins: " + bins);

  const config = {
    appId: "ai.fitmentor.app",
    appName: "FitMentor",
    webDir: "dist",
    server: {
      url: "https://fitmentor-ai-ruddy.vercel.app",
      cleartext: false,
      androidScheme: "https",
    },
  };

  mkdirSync("dist", { recursive: true });
  writeFileSync("dist/index.html", "<html><body>FitMentor</body></html>");
  rmSync("capacitor.config.ts", { force: true });
  writeFileSync("capacitor.config.json", JSON.stringify(config));
  log("Config files written");

  const result1 = execSync("./node_modules/.bin/cap add android", {
    stdio: "pipe",
    encoding: "utf8",
  });
  log("add android stdout: " + result1);

  const result2 = execSync("./node_modules/.bin/cap copy android", {
    stdio: "pipe",
    encoding: "utf8",
  });
  log("copy stdout: " + result2);

  log("SUCCESS");
} catch (e) {
  log("ERROR: " + e.message);
  if (e.stdout) log("STDOUT: " + e.stdout);
  if (e.stderr) log("STDERR: " + e.stderr);
  process.exit(1);
}
