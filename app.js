const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const os = require("os");
require("dotenv").config();

const isWindows = os.platform() === "win32";
const app = express();
app.use(express.json());

// Printing libs
let print, getDefaultPrinter;
if (isWindows) {
  ({ print } = require("pdf-to-printer"));
} else {
  ({ print, getDefaultPrinter } = require("unix-print"));
}

app.get("/heartbeat", (_req, res) => {
  res.json({ status: "LIVE" });
});

app.post("/print", async (req, res) => {
  const files = req.body.files;
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).send({ error: "No files provided" });
  }

  let browser;
  try {
    // Use bundled Chromium unless CHROME_PATH is set on Windows
    const launchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-dev-shm-usage",
      ],
    };
    if (isWindows && process.env.CHROME_PATH) {
      launchOptions.executablePath = process.env.CHROME_PATH;
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.emulateMediaType("screen");

    // Default printer (Unix optional)
    let defaultPrinterName;
    if (!isWindows && typeof getDefaultPrinter === "function") {
      try {
        const printerInfo = await getDefaultPrinter();
        defaultPrinterName = printerInfo?.name;
      } catch {
        // Omit printer arg -> system default
      }
    }
    console.log(
      "Using default printer (Unix):",
      defaultPrinterName || "(system default)"
    );

    for (const absolutePath of files) {
      // We trust the caller: process paths as-is
      const ext = path.extname(absolutePath).toLowerCase();

      if (!fs.existsSync(absolutePath)) {
        console.warn(`Missing file: ${absolutePath}`);
        continue;
      }

      if (ext === ".pdf") {
        // Print PDF directly
        try {
          if (isWindows) {
            await print(absolutePath);
          } else {
            const options = ["-o fit-to-page", "-o media=A5"];
            const result = await print(absolutePath, defaultPrinterName, options);
            console.log("Printed (Unix):", result?.stdout || "Done");
          }
          console.log(`Printed: ${absolutePath}`);
        } catch (err) {
          console.error(`Failed to print ${absolutePath}:`, err);
        }
        continue;
      }

      if (ext !== ".html") {
        console.warn(`Skipping unsupported file type (${ext}): ${absolutePath}`);
        continue;
      }

      // Render HTML -> PDF (same dir, same basename)
      const pdfPath = absolutePath.replace(/\.html$/i, ".pdf");

      try {
        const htmlContent = fs.readFileSync(absolutePath, "utf8");
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });

        await page.pdf({
          path: pdfPath,
          format: "A5",
          landscape: true,
          printBackground: true,
          margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
          preferCSSPageSize: true,
        });

        console.log(`PDF created: ${pdfPath}`);

        if (isWindows) {
          await print(pdfPath);
        } else {
          const options = ["-o fit-to-page", "-o media=A5"];
          const result = await print(pdfPath, defaultPrinterName, options);
          console.log("Printed (Unix):", result?.stdout || "Done");
        }

        console.log(`Printed: ${pdfPath}`);
      } catch (err) {
        console.error(`Failed to render/print ${absolutePath}:`, err);
      }
    }

    await browser.close();
    res.send({ status: "done" });
  } catch (error) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    console.error("Failed to print:", error);
    res.status(500).send({ error: "Print failed" });
  }
});

module.exports = app;
