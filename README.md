# 🖨️ NodeJsPrinter for LeafTrail

NodeJsPrinter is a background service that converts HTML reports into A5 landscape PDF files for automated printing. It is used by the LeafTrail desktop application.

---

## 📁 Files to Deploy

Download and place the following files on the client Windows machine (e.g., from Google Drive):

- `nodejsprinter.exe` – The compiled Node.js PDF print server
- `launch-silent.vbs` – VBScript to launch the server silently (no console window)

Place both files in the folder:

```
D:\LeafTrail\bin\
```

---

## ⚙️ Setup Instructions (Windows Startup)

1. **Open Windows Startup Folder:**

   Press `Win + R`, type:

   ```
   shell:startup
   ```

   Then press Enter.

2. **Copy VBScript to Startup:**

   Copy `lt-printer-launch-silent.vbs` into the folder that opens.  
   This ensures the print server starts automatically on system boot.

---

## 🔧 Environment Configuration

Ensure the `.env` file is bundled correctly with the following values:

```env
SERVER_PORT=3000
REPORT_FOLDER_PATH=D:\LeafTrail\Reports\Bills
```

Ensure the folder `D:\LeafTrail\Reports\Bills` exists and contains the generated HTML report files.

---

## ✅ Heartbeat Check (Verify Server is Running)

To confirm that the NodeJsPrinter server is running, execute the following command in **Command Prompt** or **PowerShell**:

```bash
curl http://localhost:3000/heartbeat
```

Expected response:

```json
{
  "status": "LIVE"
}
```

---

## 📤 Print API (Used by LeafTrail)

Send a POST request to trigger printing:

```
POST http://localhost:3000/print
```

Example JSON body:

```json
{
  "files": [
    "GL001_Anura_2024_MARCH.html",
    "GL002_Samara_2024_MARCH.html"
  ]
}
```

This API will convert the provided HTML files to PDF and print them one by one using the default printer.

---

© 2025 Anuradha Ranasinghe – All rights reserved.
