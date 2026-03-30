import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];

    if (!current.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[i + 1];

    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }

  return args;
}

export function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    throw new Error(`目录不存在: ${directory}`);
  }
}

export function ensureFileOrDirectoryExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${label} 不存在: ${targetPath}`);
  }
}

export function resetDirectory(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
}

export function copyPath(sourcePath, targetPath) {
  const stats = fs.statSync(sourcePath);

  if (stats.isDirectory()) {
    fs.cpSync(sourcePath, targetPath, { recursive: true });
    return;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

export function splitTargetNames(targetValue, availableTargets) {
  if (!targetValue || targetValue === "all") {
    return Object.keys(availableTargets);
  }

  return targetValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

export async function runCommand(command, options) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: options.cwd,
      shell: true,
      stdio: "inherit",
      env: {
        ...process.env,
        ...(options.env ?? {}),
      },
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`命令执行失败(${code}): ${command}`));
    });

    child.on("error", reject);
  });
}

export function nowStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${date}-${hours}${minutes}${seconds}`;
}

export function logStep(message) {
  console.log(`\n[deploy] ${message}`);
}

export function resolveRemoteTmpDir(remoteBaseDir, targetName, stamp) {
  return path.posix.join(remoteBaseDir, ".deploy", `${targetName}-${stamp}`);
}