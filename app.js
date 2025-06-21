const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());

const REPORT_FOLDER_PATH = process.env.REPORT_FOLDER_PATH || "C:/LeafTrail/Bills";

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
        format: "A5",
        landscape: true,
        printBackground: true,
        margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" }
      });

      console.log(`PDF created: ${pdfPath}`);
    }

    await browser.close();
    res.send({ status: "done" });

  } catch (error) {
    if (browser) await browser.close();
    console.error("Failed to convert HTML to PDF:", error);
    res.status(500).send({ error: "Conversion failed" });
  }
});

module.exports = app;
