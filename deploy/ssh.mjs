import { NodeSSH } from "node-ssh";

export async function withSSHClient(sshConfig, handler) {
  const ssh = new NodeSSH();

  try {
    await ssh.connect({
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.username,
      password: sshConfig.password,
      privateKey: sshConfig.privateKey || undefined,
    });

    return await handler(ssh);
  } finally {
    ssh.dispose();
  }
}

export async function execRemoteCommand(ssh, command, options = {}) {
  const result = await ssh.execCommand(command, options);

  if (result.stdout) {
    process.stdout.write(result.stdout);
    if (!result.stdout.endsWith("\n")) {
      process.stdout.write("\n");
    }
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
    if (!result.stderr.endsWith("\n")) {
      process.stderr.write("\n");
    }
  }

  return result;
}