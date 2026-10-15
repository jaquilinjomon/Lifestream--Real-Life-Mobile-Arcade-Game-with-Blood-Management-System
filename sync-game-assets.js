const fs = require("node:fs");
const path = require("node:path");

for (const file of ["index.html", "game.js"]) {
  fs.copyFileSync(file, path.join("www", file));
}