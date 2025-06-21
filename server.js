require("dotenv").config();

const app = require("./app.js");
const PORT = process.env.SERVER_PORT || 3000;

app.listen(PORT, () => {
  console.log(`NodeJsPrinter listening on http://localhost:${PORT}`);
});
