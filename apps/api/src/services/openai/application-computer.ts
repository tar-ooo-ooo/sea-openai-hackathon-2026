import { chromium, type Browser, type Page } from "playwright-core";

const _width = 1280;
const _height = 900;
let _activeBrowser: Browser | null = null;
let _starting = false;
type BrowserLauncher = (options: Parameters<typeof chromium.launch>[0]) => Promise<Browser>;
const _launchBrowser: BrowserLauncher = (options) => chromium.launch(options);

async function _replayPrefilledFields(page: Page) {
  const form = page.locator(".gov-long-form");
  const controls = form.locator("[data-agent-field], input[type='checkbox']");
  const snapshots = await Promise.all(Array.from({ length: await controls.count() }, async (_, index) => {
    const control = controls.nth(index);
    const tag = await control.evaluate((element) => element.tagName.toLowerCase());
    const type = await control.getAttribute("type");
    return {
      control,
      tag,
      type,
      value: tag === "select" || type !== "checkbox" ? await control.inputValue() : "",
      checked: type === "checkbox" && await control.isChecked(),
    };
  }));

  for (const { control, tag, type, value, checked } of snapshots) {
    if (checked) await control.uncheck();
    else if (tag === "select" && value) await control.selectOption("");
    else if (type !== "checkbox" && value) await control.fill("");
  }
  await page.waitForTimeout(700);

  for (const { control, tag, type, value, checked } of snapshots) {
    if (!checked && !value) continue;
    await control.scrollIntoViewIfNeeded();
    await control.evaluate((element) => { (element as HTMLElement).style.outline = "3px solid #b88935"; });
    await page.waitForTimeout(150);
    if (checked) await control.check();
    else if (tag === "select") await control.selectOption(value);
    else if (type === "date") await control.fill(value);
    else await control.pressSequentially(value, { delay: 45 });
    await page.waitForTimeout(350);
    await control.evaluate((element) => { (element as HTMLElement).style.outline = ""; });
  }

  const continueButton = page.locator("[data-agent-action='continue']");
  await continueButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await continueButton.click();
  await page.waitForSelector(".gov-review", { state: "visible" });
}

export async function openApplicationWithComputer(
  applicationUrl: string,
  sessionToken: string,
  launch: BrowserLauncher = _launchBrowser,
) {
  // ponytail: 單一 demo 主機只保留一個可接手視窗；多人部署時改接隔離的遠端 browser session。
  if (_starting) throw new Error("Computer is already starting");
  _starting = true;
  let browser: Browser | null = null;
  try {
    await _activeBrowser?.close().catch(() => {});
    browser = await launch({ channel: "chrome", headless: false });
    _activeBrowser = browser;
    browser.on("disconnected", () => {
      if (_activeBrowser === browser) _activeBrowser = null;
    });
    const context = await browser.newContext({ viewport: { width: _width, height: _height } });
    await context.addCookies([{
      name: "care_user_session",
      value: sessionToken,
      url: "http://localhost:3002",
      httpOnly: true,
      sameSite: "Lax",
    }]);
    const submissionRoute = "**/api/application-intakes/*";
    await context.route(submissionRoute, async (route) => {
      if (route.request().method() === "POST") await route.abort();
      else await route.continue();
    });
    const page = await context.newPage();
    const url = new URL(applicationUrl);
    url.searchParams.set("view", "form");
    await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".gov-agreement, .gov-long-form", { state: "visible" });
    const replay = async () => {
      try {
        await page.waitForSelector(".gov-long-form [data-agent-field]", {
          state: "visible",
          timeout: 10 * 60_000,
        });
        await _replayPrefilledFields(page);
      } finally {
        await context.unroute(submissionRoute).catch(() => {});
      }
    };
    if (await page.locator(".gov-long-form").isVisible()) await replay();
    else void replay().catch(() => {});
  } catch (error) {
    if (browser && _activeBrowser === browser) {
      _activeBrowser = null;
      await browser.close().catch(() => {});
    }
    throw error;
  } finally {
    _starting = false;
  }
}
