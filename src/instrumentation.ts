/**
 * Next.js instrumentation hook：进程启动时一次性副作用注册。
 * 启用方式：next.config.mjs experimental.instrumentationHook = true
 *
 * 当前唯一职责：注册 cron 任务（仅生产 / nodejs runtime）。
 * dev 模式跳过，避免开发时误推真实通知。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") {
    console.log("[instrumentation] dev/test 模式，跳过 cron 注册");
    return;
  }
  if (process.env.DISABLE_CRON === "1") {
    console.log("[instrumentation] DISABLE_CRON=1，跳过 cron 注册");
    return;
  }
  const { registerCronJobs } = await import("@/server/cron/scheduler");
  registerCronJobs();
}
