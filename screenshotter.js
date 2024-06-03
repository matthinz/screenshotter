#!/usr/bin/env node

const { launch } = require("puppeteer");
const { parseArgs } = require("node:util");

run(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

/**
 * @param {string[]} args
 */
async function run(args) {
  let {
    values: options,
    positionals: urls,
    tokens,
  } = parseArgs({
    args,
    options: {
      before: {
        type: "boolean",
        default: false,
      },
      desktop: {
        type: "boolean",
        default: true,
      },
      mobile: {
        type: "boolean",
        default: false,
      },
    },
    allowPositionals: true,
    tokens: true,
  });

  /**
   * @var {{name: string, width: number, height: number}[]}
   */
  const variants = [
    options.desktop && { name: "desktop", width: 1920, height: 1080 },
    options.mobile && { name: "mobile", width: 390, height: 844 },
  ].filter(Boolean);

  if (urls.length === 0) {
    throw new Error("Usage: screenshotter [URL1] [URL2]");
  }

  /**
   * @var {string[]}
   */
  const badURLs = [];

  let promise = launch({
    headless: true,
  });

  await urls
    .reduce(
      (promise, url) =>
        promise.then(async (browser) => {
          let parsedUrl;
          try {
            parsedUrl = new URL(url);
          } catch {
            badURLs.push(url);
            return browser;
          }

          for (const { name, width, height } of variants) {
            const baseName = ["screenshot", name, options.before && "before"]
              .filter(Boolean)
              .join("-");

            const page = await browser.newPage();
            await page.setViewport({ width, height });
            await page.goto(url);
            await page.screenshot({
              fullPage: true,
              path: `${baseName}.png`,
            });
            await page.close();
          }

          return browser;
        }),
      promise
    )
    .then((browser) => browser.close());

  if (badURLs.length > 0) {
    console.error("Invalid urls:");
    badURLs.forEach((url) => console.error("  - %s", url));
  }

  process.exitCode = badURLs.length;
}
