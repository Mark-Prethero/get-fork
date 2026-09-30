import { cp, mkdir, readdir } from "node:fs/promises";
await mkdir("dist/client/evidence", { recursive: true });
for (const run of (await readdir("evidence")).filter(name => !name.startsWith("."))) {
  for (const file of await readdir(`evidence/${run}`)) {
    if (!/\.(png|jpg|webp)$/.test(file)) continue;
    await mkdir(`dist/client/evidence/${run}`, { recursive: true });
    await cp(`evidence/${run}/${file}`, `dist/client/evidence/${run}/${file}`);
  }
}

await cp("walkthroughs", "dist/client/walkthroughs", { recursive: true });
