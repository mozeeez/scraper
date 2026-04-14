#!/usr/bin/env node

import { createInterface } from "readline";
import { spawn } from "child_process";

const options = [
  { label: "WebUntis", command: "node", args: ["webuntis/server.js"] }
];

let selected = 0;

const rl = createInterface({ input: process.stdin });
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

// Number of lines the menu occupies — used to overwrite in place
const LINES = options.length + 4;

function render(firstRender = false) {
  if (firstRender) {
    // Reserve space once so subsequent renders just overwrite
    process.stdout.write("\n".repeat(LINES));
  }
  process.stdout.write(`\x1B[${LINES}A`);

  console.log(`  ______ ________________  ______   ___________ 
 /  ___// ___\\_  __ \\__  \\ \\____ \\_/ __ \\_  __ \\
 \\___ \\\\  \\___|  | \\// __ \\|  |_> >  ___/|  | \\/
/____  >\\___  >__|  (____  /   __/ \\___  >__|   
     \\/     \\/           \\/|__|        \\/       
`);

  const lines = [
    "  Select an option:\n",
    ...options.map((opt, i) => {
      const cursor = i === selected ? "\x1B[36m❯\x1B[0m" : " ";
      const label  = i === selected ? `\x1B[1;36m${opt.label}\x1B[0m` : `\x1B[2m${opt.label}\x1B[0m`;
      return `  ${cursor} ${label}`;
    }),
    "",
    "  \x1B[2m↑↓ Navigate  •  Enter Confirm  •  Ctrl+C Cancel\x1B[0m",
    "",
  ];

  process.stdout.write(lines.join("\n"));
}

function run(opt) {
  // Erase only the menu block, then hand off to the server
  process.stdout.write(`\x1B[${LINES}A\x1B[J`);
  console.log(`\x1B[36m▶ Starting:\x1B[0m ${opt.command} ${opt.args.join(" ")}\n`);
  process.stdin.setRawMode(false);
  rl.close();

  const child = spawn(opt.command, opt.args, { stdio: "inherit" });
  child.on("close", (code) => process.exit(code ?? 0));
}

process.stdin.on("data", (key) => {
  if (key === "\u0003") { process.stdout.write("\n"); process.exit(); }
  if (key === "\u001B[A") { selected = (selected - 1 + options.length) % options.length; render(); }
  if (key === "\u001B[B") { selected = (selected + 1) % options.length; render(); }
  if (key === "\r" || key === "\n") run(options[selected]);
});

render(true);