import { execSync } from 'child_process';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const CLOUDFLARE_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const PROJECT_NAME = process.env.CF_PROJECT_NAME || "movie-tracker";

console.log("=========================================");
console.log("🚀 开始准备部署到 Cloudflare Pages...");
console.log(`📦 目标项目: ${PROJECT_NAME}`);
console.log("=========================================\n");

try {
    // 1. 运行构建
    console.log("🛠️ 正在执行 Vite 生产环境打包...");
    execSync("npm run build", { stdio: "inherit" });
    console.log("✅ 构建打包成功！\n");

    // 2. 部署到 Cloudflare Pages
    console.log("☁️ 正在上传部署至 Cloudflare Pages...");
    const deployCmd = `npx --yes wrangler pages deploy dist --project-name=${PROJECT_NAME} --commit-dirty=true`;
    
    execSync(deployCmd, {
        stdio: "inherit",
        env: {
            ...process.env,
            CLOUDFLARE_API_TOKEN: CLOUDFLARE_TOKEN,
            NODE_TLS_REJECT_UNAUTHORIZED: "0",
            WRANGLER_SEND_METRICS: "false",
            CI: "true"
        }
    });

    console.log("\n🎉 部署指令执行完成！");
} catch (error) {
    console.error("\n❌ 部署执行过程中发生错误:", error.message);
    process.exit(1);
}
