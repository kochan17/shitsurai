import { chromium, type Browser } from "playwright";

interface RenderOptions {
  html: string;
  viewportWidth: number;
  viewportHeight: number;
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

process.on("exit", () => {
  browserInstance?.close().catch(() => {});
});

process.on("SIGINT", () => {
  browserInstance?.close().catch(() => {}).finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  browserInstance?.close().catch(() => {}).finally(() => process.exit(0));
});

export async function renderToImage(options: RenderOptions): Promise<Buffer> {
  const { html, viewportWidth, viewportHeight } = options;

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: viewportWidth, height: viewportHeight },
  });

  try {
    const page = await context.newPage();

    await page.setContent(html, { waitUntil: "domcontentloaded" });

    await page
      .waitForFunction(
        () =>
          document.querySelectorAll('script[src*="tailwindcss"]').length === 0 ||
          (window as unknown as Record<string, unknown>)["tailwind"] !== undefined,
        { timeout: 5000 }
      )
      .catch(() => {});

    await page.waitForTimeout(500);

    const screenshotBuffer = await page.screenshot({ fullPage: true });

    return screenshotBuffer;
  } finally {
    await context.close();
  }
}
