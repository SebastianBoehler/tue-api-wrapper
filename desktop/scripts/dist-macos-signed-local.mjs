import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, "..");
const releaseRoot = path.join(desktopRoot, "release");
const startedAt = Date.now();

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? desktopRoot,
    stdio: "inherit",
    env: options.env ?? process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function output(command, args) {
  return execFileSync(command, args, {
    cwd: desktopRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function requireXcodeTool(tool) {
  const result = spawnSync("xcrun", ["--find", tool], { cwd: desktopRoot, stdio: "ignore" });
  if (result.status !== 0) {
    fail(`Xcode ${tool} is not available.`);
  }
}

function requireMacOS() {
  if (process.platform !== "darwin") {
    fail("Local Apple signing and notarization must run on macOS.");
  }
}

function developerIdIdentities() {
  const identities = output("security", ["find-identity", "-v", "-p", "codesigning"]);
  return identities
    .split("\n")
    .map((line) => line.match(/"([^"]*Developer ID Application:[^"]+)"/)?.[1])
    .filter(Boolean);
}

function hasAppleIdNotaryEnv(env) {
  return Boolean(env.APPLE_ID && env.APPLE_APP_SPECIFIC_PASSWORD && env.APPLE_TEAM_ID);
}

function hasApiKeyNotaryEnv(env) {
  return Boolean(env.APPLE_API_KEY && env.APPLE_API_KEY_ID && env.APPLE_API_ISSUER);
}

function hasKeychainNotaryEnv(env) {
  return Boolean(env.APPLE_KEYCHAIN && env.APPLE_KEYCHAIN_PROFILE);
}

function requireNotaryEnv(env) {
  if (hasAppleIdNotaryEnv(env) || hasApiKeyNotaryEnv(env) || hasKeychainNotaryEnv(env)) {
    return;
  }

  fail(
    [
      "Missing notarization credentials.",
      "Set one of:",
      "- APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID",
      "- APPLE_API_KEY, APPLE_API_KEY_ID, APPLE_API_ISSUER",
      "- APPLE_KEYCHAIN, APPLE_KEYCHAIN_PROFILE"
    ].join("\n")
  );
}

function prepareSigningEnv() {
  const env = { ...process.env };

  if (env.CSC_IDENTITY_AUTO_DISCOVERY === "false") {
    fail("CSC_IDENTITY_AUTO_DISCOVERY=false disables macOS signing. Unset it for this command.");
  }

  if (env.CSC_LINK && !env.CSC_KEY_PASSWORD) {
    fail("CSC_LINK is set, but CSC_KEY_PASSWORD is missing.");
  }

  if (!env.CSC_LINK && !env.CSC_NAME) {
    const identities = developerIdIdentities();
    if (identities.length === 0) {
      fail(
        [
          "No Developer ID Application signing identity was found in the local keychain.",
          "Install/export a Developer ID Application certificate, or set CSC_LINK and CSC_KEY_PASSWORD."
        ].join("\n")
      );
    }

    env.CSC_NAME = identities[0];
    console.log(`Using signing identity: ${env.CSC_NAME}`);
  }

  requireNotaryEnv(env);
  return env;
}

function walkArtifacts(root) {
  if (!existsSync(root)) {
    return [];
  }

  const entries = readdirSync(root, { withFileTypes: true });
  const artifacts = [];

  for (const entry of entries) {
    const itemPath = path.join(root, entry.name);
    if (entry.isDirectory() && entry.name.endsWith(".app")) {
      artifacts.push(itemPath);
      continue;
    }

    if (entry.isDirectory()) {
      artifacts.push(...walkArtifacts(itemPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".dmg")) {
      artifacts.push(itemPath);
    }
  }

  return artifacts;
}

function freshArtifacts() {
  const threshold = startedAt - 2000;
  return walkArtifacts(releaseRoot)
    .filter((artifact) => statSync(artifact).mtimeMs >= threshold)
    .sort((left, right) => left.localeCompare(right));
}

function validateArtifacts(artifacts) {
  const apps = artifacts.filter((artifact) => artifact.endsWith(".app"));
  const dmgs = artifacts.filter((artifact) => artifact.endsWith(".dmg"));

  if (apps.length === 0) {
    fail("No freshly built .app artifact was found under desktop/release.");
  }

  for (const app of apps) {
    run("codesign", ["--verify", "--deep", "--strict", "--verbose=2", app]);
    run("spctl", ["--assess", "--type", "execute", "--verbose=4", app]);
    run("xcrun", ["stapler", "validate", app]);
  }

  if (dmgs.length === 0) {
    fail("No freshly built .dmg artifact was found under desktop/release.");
  }

  for (const dmg of dmgs) {
    run("xcrun", ["stapler", "validate", dmg]);
  }
}

requireMacOS();
requireXcodeTool("notarytool");
requireXcodeTool("stapler");

const signingEnv = prepareSigningEnv();
run("npm", ["run", "dist"], { env: signingEnv });

const artifacts = freshArtifacts();
validateArtifacts(artifacts);

console.log("Built, signed, notarized, and validated local macOS release artifacts:");
for (const artifact of artifacts) {
  console.log(`- ${artifact}`);
}
