// Dev harness: run the shape-inference engine against a real trace produced
// by the backend tracers (tools/viz-test in the backend repo).
//   node tools/infer-test.mjs <stderr-file>
import { readFileSync } from "node:fs";
import { classifyVariables, buildRendererFrame } from "../src/components/visualizer/inference/inferShape.js";

const raw = readFileSync(process.argv[2], "utf-8");
const m = raw.match(/__FRAMES__([\s\S]*)__END__/);
const frames = JSON.parse(m[1]);
console.log("frames:", frames.length);

const kinds = classifyVariables(frames, {}, {});
for (const [name, info] of kinds) {
  console.log(`${name.padEnd(10)} -> ${info.kind.padEnd(11)} (${info.source})`);
}

// build renderer frames at the last full frame
const last = frames.length - 2;
for (const [name, info] of kinds) {
  if (["scalar", "memory"].includes(info.kind)) continue;
  const rf = buildRendererFrame(name, info.kind, frames[last], frames[last - 1], frames);
  console.log(`\n== ${name} (${info.kind}) ==`);
  console.log(JSON.stringify(rf)?.slice(0, 300));
}
