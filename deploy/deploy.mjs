import { NodeSSH } from "node-ssh";
import { deployConfig } from "./deploy.config.mjs";
import { buildTarget } from "./build.mjs";
import { finalizeRemoteDeploy } from "./remote.mjs";
import {
  ensureDirectoryExists,
  logStep,
  nowStamp,
  parseArgs,
  splitTargetNames,
} from "./shared.mjs";
import { prepareRemoteUpload } from "./upload.mjs";

function resolveServerConfig(args) {
  return {
    host: args.host ?? deployConfig.server.host,
    port: Number(args.port ?? deployConfig.server.port),
    username: args.username ?? deployConfig.server.username,
    password: args.password ?? deployConfig.server.password,
  };
}

async function deployOneTarget(server, target, config, options) {
  let uploadPath;

  if (target.localDist || (target.buildCommands && target.buildCommands.length > 0)) {
    uploadPath = await buildTarget(target);
  } else {
    uploadPath = target.cwd;
    ensureDirectoryExists(target.cwd);
    logStep(`${target.name}: 使用源码目录直接部署`);
  }

  const uploadSsh = new NodeSSH();
  logStep(`连接服务器 ${server.host}:${server.port}`);
  await uploadSsh.connect(server);

  const uploadResult = await prepareRemoteUpload(
    uploadSsh,
    config,
    target,
    options.stamp,
    uploadPath,
  );
  uploadSsh.dispose();

  logStep(`${target.name}: 开始远程替换流程`);

  const remoteSsh = new NodeSSH();
  logStep(`重新连接服务器 ${server.host}:${server.port}`);
  await remoteSsh.connect(server);

  try {
    await finalizeRemoteDeploy(
      remoteSsh,
      target,
      uploadResult.remoteTmpDir,
      uploadResult.remoteArchivePath,
    );
  } finally {
    remoteSsh.dispose();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = resolveServerConfig(args);

  if (!server.password) {
    throw new Error("缺少服务器密码。请通过 DEPLOY_SSH_PASSWORD 或 --password 传入。");
  }

  const targetNames = splitTargetNames(args.target, deployConfig.targets);
  const targets = targetNames.map((name) => {
    const target = deployConfig.targets[name];

    if (!target) {
      throw new Error(`未知部署目标: ${name}`);
    }

    return target;
  });

  const stamp = nowStamp();
  const options = {
    skipBuild: Boolean(args["skip-build"]),
    stamp,
  };

  for (const target of targets) {
    try {
      logStep(`开始部署目标: ${target.name}`);
      await deployOneTarget(server, target, deployConfig, options);
      logStep(`部署完成: ${target.name}`);
    } finally {
      // no-op
    }
  }
}

try {
  await main();
} catch (error) {
  console.error(`\n[deploy] 失败: ${error.message}`);
  process.exit(1);
}