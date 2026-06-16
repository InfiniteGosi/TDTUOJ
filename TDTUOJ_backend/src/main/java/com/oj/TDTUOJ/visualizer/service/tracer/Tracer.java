package com.oj.TDTUOJ.visualizer.service.tracer;

/**
 * A Tracer rewrites user source code so that, when executed inside Judge0,
 * it emits a stream of execution frames on STDERR wrapped in
 * {@code __FRAMES__[...]__END__} markers.
 *
 * <p>Every tracer emits the same uniform frame schema regardless of language:
 * <pre>
 * {
 *   "step":  12,                       // monotonically increasing
 *   "line":  10,                       // 1-based line in the ORIGINAL user source
 *   "event": "line" | "return" | "exception",
 *   "out_len": 34,                     // optional — cumulative stdout length so far
 *   "stack": [                         // innermost frame LAST
 *     { "function": "main",   "line": 42, "locals": { "n": 5, "root": "@1" } },
 *     { "function": "insert", "line": 10, "locals": { "cur": "@3" } }
 *   ],
 *   "heap": {
 *     "1": { "type": "object", "class": "Node",
 *            "fields": { "val": 5, "left": "@2", "right": null } },
 *     "4": { "type": "list",   "values": [1, 2, "@5"] },
 *     "5": { "type": "dict",   "entries": [["a", 1], ["b", 2]] },
 *     "6": { "type": "set",    "values": [1, 2, 3] }
 *   }
 * }
 * </pre>
 *
 * <p>Rules:
 * <ul>
 *   <li>Primitives are inlined; compound values become heap entries referenced
 *       as the string {@code "@<id>"}.</li>
 *   <li>Heap ids are stable across frames (object identity) so the frontend
 *       can animate the same node moving.</li>
 *   <li>Serializers are cycle-safe (visited set; revisits emit the ref only).</li>
 *   <li>Caps: heap &le; 200 entries/frame, containers &le; 1000 elements,
 *       strings &le; 256 chars, nesting depth &le; 8. Beyond a cap the entry
 *       carries {@code "truncated": true}.</li>
 *   <li>At most {@link #MAX_FRAMES} frames are recorded; tracers self-disable
 *       past the cap and append a final {@code {"truncated": true}} marker frame.</li>
 * </ul>
 */
public interface Tracer {

    int MAX_FRAMES = 5000;

    /** Marker preceding the frames JSON array on stderr. */
    String FRAMES_BEGIN = "__FRAMES__";

    /** Marker following the frames JSON array on stderr. */
    String FRAMES_END = "__END__";

    /**
     * @param source the raw user source code
     * @return the instrumented source to submit to Judge0
     * @throws TracerException if the source cannot be instrumented (e.g. parse error)
     */
    String instrument(String source) throws TracerException;
}
