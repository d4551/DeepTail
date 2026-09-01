import { listScannable } from "/Users/brandon/Downloads/meowbao/mas-team/hooks/brutalise-tree-inventory.mjs";

const inv = listScannable("/Users/brandon/Downloads/DeepTail");
let total = 0;
for (const f of inv.files) total += (await Bun.file(f).stat()).size;
await Bun.write(
  "/tmp/deeptail-inventory.json",
  JSON.stringify({ count: inv.files.length, symlinks: inv.symlinks.length, totalBytes: total }),
);
