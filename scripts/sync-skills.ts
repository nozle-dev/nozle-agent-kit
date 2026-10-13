// Each skill is installable on its own (`skills add --skill X --copy` copies only its directory),
// so shared references and the checker are copied into every skill directory.
import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
for (const skill of readdirSync(join(root, "skills"), { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
  const dir = join(root, "skills", skill.name);
  rmSync(join(dir, "references"), { recursive: true, force: true });
  rmSync(join(dir, "scripts"), { recursive: true, force: true });
  mkdirSync(join(dir, "scripts"), { recursive: true });
  cpSync(join(root, "shared/references"), join(dir, "references"), { recursive: true });
  cpSync(join(root, "shared/scripts"), join(dir, "scripts"), { recursive: true });
}
