package com.oj.TDTUOJ.visualizer.service.tracer;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Python tracer — the reference implementation of the uniform frame schema.
 *
 * <p>Unlike every other language, Python ships a real in-process tracer
 * ({@code sys.settrace}) that runs fine inside the Judge0 sandbox with zero
 * dependencies. The user source is embedded base64 (no quoting issues),
 * compiled with filename {@code "<viz>"} (so line numbers map 1:1 to the
 * original source) and executed under the tracer. No source transformation
 * of the user code happens at all.
 */
public final class PythonTracer implements Tracer {

    @Override
    public String instrument(String source) {
        String b64 = Base64.getEncoder().encodeToString(source.getBytes(StandardCharsets.UTF_8));
        return PREAMBLE.replace("__B64_SOURCE__", b64);
    }

    // NOTE: Java text blocks process escape sequences — backslashes below are
    // doubled so the emitted Python source contains single backslashes.
    private static final String PREAMBLE = """
            import sys, json, base64, types

            _viz_MAX_FRAMES = %d
            _viz_MAX_HEAP   = 200
            _viz_MAX_ELEMS  = 1000
            _viz_MAX_STR    = 256
            _viz_MAX_DEPTH  = 8
            _viz_MAX_FIELDS = 64

            _viz_frames  = []
            _viz_ids     = {}
            _viz_next_id = [1]
            _viz_done    = [False]
            _viz_step    = [0]

            class _viz_Out:
                def __init__(self, real):
                    self._viz_real = real
                    self.n = 0
                def write(self, s):
                    self.n += len(s)
                    return self._viz_real.write(s)
                def flush(self):
                    self._viz_real.flush()
                def __getattr__(self, name):
                    return getattr(self._viz_real, name)

            _viz_out = _viz_Out(sys.stdout)
            sys.stdout = _viz_out

            def _viz_repr(o):
                try:
                    r = repr(o)
                except Exception:
                    r = '<unrepresentable>'
                return r if len(r) <= _viz_MAX_STR else r[:_viz_MAX_STR] + '...'

            def _viz_oid(o):
                k = id(o)
                v = _viz_ids.get(k)
                if v is None:
                    v = _viz_next_id[0]
                    _viz_next_id[0] += 1
                    _viz_ids[k] = v
                return v

            _viz_SKIP = (types.FunctionType, types.BuiltinFunctionType, types.LambdaType,
                         types.ModuleType, types.MethodType, type)

            def _viz_enc(o, heap, seen, depth):
                if o is None or isinstance(o, bool) or isinstance(o, int):
                    return o
                if isinstance(o, float):
                    if o != o or o == float('inf') or o == float('-inf'):
                        return repr(o)
                    return o
                if isinstance(o, str):
                    return o if len(o) <= _viz_MAX_STR else o[:_viz_MAX_STR] + '...'
                oid = _viz_oid(o)
                ref = '@' + str(oid)
                if oid in seen:
                    return ref
                seen.add(oid)
                key = str(oid)
                if len(heap) >= _viz_MAX_HEAP or depth >= _viz_MAX_DEPTH:
                    heap[key] = {'type': 'opaque', 'repr': _viz_repr(o), 'truncated': True}
                    return ref
                if isinstance(o, (list, tuple)):
                    vals = [_viz_enc(x, heap, seen, depth + 1) for x in o[:_viz_MAX_ELEMS]]
                    e = {'type': 'tuple' if isinstance(o, tuple) else 'list', 'values': vals}
                    if len(o) > _viz_MAX_ELEMS:
                        e['truncated'] = True
                    heap[key] = e
                    return ref
                if isinstance(o, dict):
                    items = list(o.items())
                    ents = [[_viz_enc(k2, heap, seen, depth + 1), _viz_enc(v2, heap, seen, depth + 1)]
                            for k2, v2 in items[:_viz_MAX_ELEMS]]
                    e = {'type': 'dict', 'entries': ents}
                    if len(items) > _viz_MAX_ELEMS:
                        e['truncated'] = True
                    heap[key] = e
                    return ref
                if isinstance(o, (set, frozenset)):
                    vals = [_viz_enc(x, heap, seen, depth + 1) for i, x in enumerate(o) if i < _viz_MAX_ELEMS]
                    e = {'type': 'set', 'values': vals}
                    if len(o) > _viz_MAX_ELEMS:
                        e['truncated'] = True
                    heap[key] = e
                    return ref
                d = getattr(o, '__dict__', None)
                if isinstance(d, dict):
                    fields = {}
                    cnt = 0
                    for k2, v2 in list(d.items()):
                        if k2.startswith('_') or isinstance(v2, _viz_SKIP):
                            continue
                        if cnt >= _viz_MAX_FIELDS:
                            break
                        fields[k2] = _viz_enc(v2, heap, seen, depth + 1)
                        cnt += 1
                    heap[key] = {'type': 'object', 'class': type(o).__name__, 'fields': fields}
                    return ref
                heap[key] = {'type': 'opaque', 'repr': _viz_repr(o)}
                return ref

            def _viz_tracer(frame, event, arg):
                if _viz_done[0]:
                    return None
                if frame.f_code.co_filename != '<viz>':
                    return None
                if event == 'call':
                    return _viz_tracer
                if event not in ('line', 'return', 'exception'):
                    return _viz_tracer
                if len(_viz_frames) >= _viz_MAX_FRAMES:
                    _viz_done[0] = True
                    _viz_step[0] += 1
                    _viz_frames.append({'step': _viz_step[0], 'truncated': True})
                    sys.settrace(None)
                    return None
                heap = {}
                seen = set()
                chain = []
                f = frame
                while f is not None:
                    if f.f_code.co_filename == '<viz>':
                        chain.append(f)
                    f = f.f_back
                stack = []
                for f in reversed(chain):
                    locs = {}
                    for k, v in list(f.f_locals.items()):
                        if k.startswith('_viz') or k.startswith('__') or isinstance(v, _viz_SKIP):
                            continue
                        try:
                            locs[k] = _viz_enc(v, heap, seen, 0)
                        except Exception:
                            locs[k] = '<error>'
                    name = f.f_code.co_name
                    if name == '<module>':
                        name = 'global'
                    stack.append({'function': name, 'line': f.f_lineno, 'locals': locs})
                _viz_step[0] += 1
                _viz_frames.append({
                    'step': _viz_step[0],
                    'line': frame.f_lineno,
                    'event': event,
                    'out_len': _viz_out.n,
                    'stack': stack,
                    'heap': heap,
                })
                return _viz_tracer

            def _viz_flush():
                sys.settrace(None)
                try:
                    data = json.dumps(_viz_frames, default=_viz_repr)
                except Exception:
                    data = '[]'
                sys.stderr.write('\\n__FRAMES__' + data + '__END__\\n')
                sys.stderr.flush()
                try:
                    sys.stdout.flush()
                except Exception:
                    pass

            _viz_src = base64.b64decode('__B64_SOURCE__').decode('utf-8')
            _viz_code = compile(_viz_src, '<viz>', 'exec')
            _viz_globals = {'__name__': '__main__', '__builtins__': __builtins__}
            sys.settrace(_viz_tracer)
            try:
                exec(_viz_code, _viz_globals)
            except SystemExit:
                pass
            except BaseException as _viz_e:
                sys.settrace(None)
                import traceback as _viz_tb
                _viz_t = _viz_e.__traceback__
                _viz_t = _viz_t.tb_next if _viz_t is not None else None
                _viz_tb.print_exception(type(_viz_e), _viz_e, _viz_t, file=sys.stderr)
            finally:
                _viz_flush()
            """.formatted(MAX_FRAMES);
}
