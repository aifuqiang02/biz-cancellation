import fs from "node:fs";
import path from "node:path";
import {
  logStep,
  resolveRemoteTmpDir,
  runCommand,
  shellQuote,
} from "./shared.mjs";

async function execRemote(ssh, command) {
  const result = await ssh.execCommand(command);

  if (result.code !== 0) {
    throw new Error(result.stderr || `远程命令执行失败: ${command}`);
  }
}

async function createArchive(target, stamp, localUploadPath) {
  const artifactsDir = path.resolve(process.cwd(), ".deploy-artifacts");
  const archivePath = path.join(artifactsDir, `${target.name}-${stamp}.tar`);

  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.rmSync(archivePath, { force: true });

  logStep(`${target.name}: 打包上传目录 -> ${archivePath}`);
  await runCommand(`tar -cf "${archivePath}" -C "${localUploadPath}" .`, {
    cwd: process.cwd(),
  });

  return archivePath;
}

function createUploadDirectory(target, stamp, archivePath) {
  const uploadDir = path.resolve(
    process.cwd(),
    ".deploy-artifacts",
    "uploads",
    `${target.name}-${stamp}`,
  );

  fs.rmSync(uploadDir, { recursive: true, force: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.copyFileSync(archivePath, path.join(uploadDir, path.basename(archivePath)));

  return uploadDir;
}

export async function prepareRemoteUpload(ssh, config, target, stamp, localUploadPath) {
  const remoteTmpDir = resolveRemoteTmpDir(config.remoteBaseDir, target.name, stamp);
  const remoteDeployDir = path.posix.join(config.remoteBaseDir, ".deploy");
  const remoteArchivePath = path.posix.join(remoteDeployDir, `${target.name}-${stamp}.tar`);
  const localArchivePath = await createArchive(target, stamp, localUploadPath);
  const localUploadDir = createUploadDirectory(target, stamp, localArchivePath);

  try {
    await execRemote(
      ssh,
      [
        `mkdir -p ${shellQuote(path.posix.dirname(target.remoteDir))}`,
        `mkdir -p ${shellQuote(remoteDeployDir)}`,
        `rm -rf ${shellQuote(remoteTmpDir)}`,
        `mkdir -p ${shellQuote(remoteTmpDir)}`,
        `rm -f ${shellQuote(remoteArchivePath)}`,
      ].join(" && "),
    );

    logStep(`${target.name}: 上传压缩包到服务器 -> ${remoteArchivePath}`);
    const success = await ssh.putDirectory(localUploadDir, remoteDeployDir, {
      recursive: true,
      concurrency: 1,
    });

    if (!success) {
      throw new Error(`${target.name} 压缩包上传失败`);
    }
  } finally {
    fs.rmSync(localUploadDir, { recursive: true, force: true });
    fs.rmSync(localArchivePath, { force: true });
  }

  return {
    remoteTmpDir,
    remoteArchivePath,
  };
}