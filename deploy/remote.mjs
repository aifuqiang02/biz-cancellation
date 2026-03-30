import path from "node:path";
import { logStep, shellQuote } from "./shared.mjs";

async function execRemote(ssh, command) {
  const result = await ssh.execCommand(command);

  if (result.stdout) {
    process.stdout.write(result.stdout.endsWith("\n") ? result.stdout : `${result.stdout}\n`);
  }

  if (result.code !== 0) {
    throw new Error(result.stderr || `远程命令执行失败: ${command}`);
  }
}

export async function finalizeRemoteDeploy(ssh, target, remoteTmpDir, remoteArchivePath) {
  const cleanupCommand = Array.isArray(target.preserveEntries) && target.preserveEntries.length > 0
    ? `find ${shellQuote(target.remoteDir)} -mindepth 1 -maxdepth 1 ${target.preserveEntries
        .map((entry) => `! -name ${shellQuote(entry)}`)
        .join(" ")} -exec rm -rf {} +`
    : `rm -rf ${shellQuote(target.remoteDir)}`;

  const commands = [
    `mkdir -p ${shellQuote(path.posix.dirname(target.remoteDir))}`,
    `mkdir -p ${shellQuote(remoteTmpDir)}`,
    `tar -xf ${shellQuote(remoteArchivePath)} -C ${shellQuote(remoteTmpDir)}`,
    `rm -f ${shellQuote(remoteArchivePath)}`,
    `mkdir -p ${shellQuote(target.remoteDir)}`,
    cleanupCommand,
    `cp -R ${shellQuote(`${remoteTmpDir}/.`)} ${shellQuote(`${target.remoteDir}/`)}`,
    `rm -rf ${shellQuote(remoteTmpDir)}`,
    ...target.remoteCommands,
  ];

  logStep(`${target.name}: 远程替换目标目录 -> ${target.remoteDir}`);

  for (const command of commands) {
    await execRemote(ssh, command);
  }
}