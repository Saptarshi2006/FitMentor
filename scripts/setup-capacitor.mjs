import { createRequire } from "module";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { execSync } from "child_process";

const require = createRequire(import.meta.url);

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

execSync("./node_modules/.bin/cap add android", { stdio: "inherit" });
execSync("./node_modules/.bin/cap copy android", { stdio: "inherit" });
