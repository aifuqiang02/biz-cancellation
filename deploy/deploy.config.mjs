import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function resolveProjectPath(...segments) {
  return path.join(projectRoot, ...segments);
}

export const deployConfig = {
  server: {
    host: "110.42.111.221",
    port: 22,
    username: "root",
    password: "VKTngp5AhnchHmK4",
  },
  remoteBaseDir: "/www/wwwroot/biz-cancellation",
  targets: {
    "pc-web": {
      name: "pc-web",
      label: "PC Web",
      cwd: resolveProjectPath("src", "front-end"),
      buildCommands: ["pnpm build"],
      localDist: resolveProjectPath("src", "front-end", "dist"),
      remoteDir: "/www/wwwroot/biz-cancellation/pc-web",
      remoteCommands: [],
    },
    "mobile-web": {
      name: "mobile-web",
      label: "Mobile Web",
      cwd: resolveProjectPath("src", "mobile-front-end"),
      buildCommands: ["pnpm build"],
      localDist: resolveProjectPath("src", "mobile-front-end", "dist"),
      remoteDir: "/www/wwwroot/biz-cancellation/mobile-web",
      remoteCommands: [],
    },
    backend: {
      name: "backend",
      label: "Backend",
      cwd: resolveProjectPath("src", "server"),
      buildCommands: ["pnpm build"],
      localDist: resolveProjectPath("src", "server", "dist"),
      artifactDir: resolveProjectPath(".deploy-artifacts", "backend"),
      bundlePaths: [
        "dist",
        "prisma",
        "package.json",
        "pnpm-lock.yaml",
        "ecosystem.config.cjs",
      ],
      remoteDir: "/www/wwwroot/biz-cancellation/backend",
      preserveEntries: [".env", "logs"],
      remoteCommands: [
        "cd /www/wwwroot/biz-cancellation/backend && pnpm install --frozen-lockfile --ignore-scripts",
        "cd /www/wwwroot/biz-cancellation/backend && pnpm exec prisma generate",
        "cd /www/wwwroot/biz-cancellation/backend && pnpm exec prisma migrate deploy",
        "cd /www/wwwroot/biz-cancellation/backend && npx --yes pm2 delete biz-cancellation || true",
        "cd /www/wwwroot/biz-cancellation/backend && npx --yes pm2 start ecosystem.config.cjs --update-env",
      ],
    },
  },
};