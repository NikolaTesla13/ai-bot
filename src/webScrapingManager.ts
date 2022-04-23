import Puppeteer, { Browser } from "puppeteer";
import { logger } from "./logger";
import axios from "axios";

export default class WebScrapingManager {
  private websitesCache: Map<string, string>;
  private browser: Browser | undefined;

  public constructor() {
    this.websitesCache = new Map<string, string>();
    this.browser = undefined;
  }

  public async scrape(url: string): Promise<string | null> {
    if (this.websitesCache.has(url)) {
      return this.websitesCache.get(url)!;
    }

    if (url.endsWith(".json")) {
      const res = await axios.get(url);
      if (res.status != 200) return null;
      const json = JSON.stringify(res.data);
      this.websitesCache.set(url, json);
      return json;
    }

    if (this.browser == undefined) {
      this.browser = await Puppeteer.launch({
        headless: true,
        args: ["--no-sandbox"],
      });
    }

    const page = await this.browser.newPage();
    await page.setViewport({ width: 500, height: 500 });

    try {
      await page.goto(url, { waitUntil: "networkidle2" });
      const content = await page.content();
      this.websitesCache.set(url, content);
      return content;
    } catch (error) {
      logger.error(error);
      await this.browser.close();
      this.browser = undefined;
      return null;
    }
  }
}
