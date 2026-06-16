// SSR smoke test: feed a real trace through inference + every renderer.
//   npx esbuild tools/render-test.jsx --bundle --format=esm --platform=node \
//     --outfile=tools/render-test.bundle.mjs --jsx=automatic && node tools/render-test.bundle.mjs <stderr-file>
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import RendererFactory from "../src/components/visualizer/renderers/RendererFactory";
import MemoryModelRenderer from "../src/components/visualizer/renderers/MemoryModelRenderer";
import { classifyVariables, buildRendererFrame } from "../src/components/visualizer/inference/inferShape";
import { visibleVariables } from "../src/components/visualizer/inference/materialize";

const raw = readFileSync(process.argv[2], "utf-8");
const frames = JSON.parse(raw.match(/__FRAMES__([\s\S]*)__END__/)[1]);
const kinds = classifyVariables(frames, {}, {});
const last = frames.length - 2;

let ok = 0, fail = 0;
for (const [name, info] of kinds) {
  if (["scalar"].includes(info.kind)) continue;
  try {
    if (info.kind === "memory") {
      const vars = visibleVariables(frames[last]);
      const html = renderToString(
        <MemoryModelRenderer frame={frames[last]} roots={[{ name, value: vars[name] }]} />
      );
      console.log(`OK  memory  ${name}  (${html.length} bytes)`);
      ok++;
      continue;
    }
    const rf = buildRendererFrame(name, info.kind, frames[last], frames[last - 1], frames);
    if (!rf) { console.log(`--  ${info.kind}  ${name}  (no renderer frame)`); continue; }
    const html = renderToString(<RendererFactory frame={rf} />);
    console.log(`OK  ${info.kind.padEnd(10)} ${name}  (${html.length} bytes)`);
    ok++;
  } catch (e) {
    console.log(`FAIL ${info.kind} ${name}: ${e.message}`);
    fail++;
  }
}
// also force stack/queue/matrix renderers with synthetic frames
for (const synth of [
  { type: "stack", data: [1, 2, 3], pushed: 2 },
  { type: "queue", data: [4, 5, 6], enqueued: 2, dequeued: 9 },
  { type: "matrix", data: [[1, 0], [0, 1]], current: [0, 0], path: [[1, 1]] },
  { type: "linkedlist", nodes: [{ id: "a", val: 1, next: "b" }, { id: "b", val: 2, next: null }], current: "a" },
  { type: "nonsense", weird: true },
]) {
  try {
    renderToString(<RendererFactory frame={synth} />);
    console.log(`OK  synthetic ${synth.type}`);
    ok++;
  } catch (e) {
    console.log(`FAIL synthetic ${synth.type}: ${e.message}`);
    fail++;
  }
}
console.log(`\n${ok} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
