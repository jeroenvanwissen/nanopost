const { execSync } = require("node:child_process");

module.exports = {
  name: "github",
  async onPostSaved({ filePath }) {
    execSync(`git add "${filePath}"`);
    execSync(`git commit -m "nanopost: add ${filePath}"`);
    execSync(`git push`, { stdio: "inherit" });
    execSync(`gh pr create --fill`, { stdio: "inherit" });
  },
};
