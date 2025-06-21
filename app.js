const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const os = require("os");
require("dotenv").config();

const isWindows = os.platform() === "win32";
const app = express();
app.use(express.json());

const REPORT_FOLDER_PATH = isWindows
  ? process.env.REPORT_FOLDER_PATH_WIN
  : process.env.REPORT_FOLDER_PATH_LINUX;

let print, getDefaultPrinter;
if (isWindows) {
  ({ print } = require("pdf-to-printer"));
} else {
  ({ print, getDefaultPrinter } = require("unix-print"));
}

app.get("/heartbeat", (req, res) => {
  res.json({ status: "LIVE" });
});

app.post("/print", async (req, res) => {
  const files = req.body.files;
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).send({ error: "No files provided" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"]
    });
    const page = await browser.newPage();

    // Determine default printer (for Linux)
    let defaultPrinter = undefined;
    if (!isWindows && typeof getDefaultPrinter === "function") {
      try {
        const printerInfo = await getDefaultPrinter();
        defaultPrinter = printerInfo?.name;
        console.log("Using default printer (Unix):", defaultPrinter);
      } catch (e) {
        console.warn("Could not retrieve default printer:", e.message);
      }
    }

    for (const fileName of files) {
      const htmlPath = path.join(REPORT_FOLDER_PATH, fileName);
      const pdfPath = htmlPath.replace(/\.html$/, ".pdf");

      if (!fs.existsSync(htmlPath)) {
        console.warn(`Missing file: ${htmlPath}`);
        continue;
      }

      const htmlContent = fs.readFileSync(htmlPath, "utf8");
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      await page.pdf({
        path: pdfPath,
        format: 'A5',
        landscape: true,
        printBackground: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        preferCSSPageSize: true
      });

      console.log(`PDF created: ${pdfPath}`);

      try {
        if (isWindows) {
          await print(pdfPath); // Implicit default
        } else {
          const options = ["-o fit-to-page", "-o media=A5"];
          const result = await print(pdfPath, defaultPrinter, options);
          console.log("Printed (Unix):", result.stdout || "Done");
        }
        console.log(`Printed: ${pdfPath}`);
      } catch (printErr) {
        console.error(`Failed to print ${pdfPath}:`, printErr);
      }
    }

    await browser.close();
    res.send({ status: "done" });

  } catch (error) {
    if (browser) await browser.close();
    console.error("Failed to print:", error);
    res.status(500).send({ error: "Print failed" });
  }
});

module.exports = app;
