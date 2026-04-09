import { getBrowser } from "../renderer/playwright.js";

interface ScrapedPage {
  title: string;
  html: string;
  screenshot: Buffer;
}

export async function scrapeUrl(url: string): Promise<ScrapedPage> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${parsed.protocol}`);
  }

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });

    const title = await page.title();
    const html = await page.content();
    const screenshot = await page.screenshot({ fullPage: true });

    return { title, html, screenshot };
  } finally {
    await context.close();
  }
}
