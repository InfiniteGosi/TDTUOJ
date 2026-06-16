#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct { char* buf; size_t len; size_t cap; } _VizStr;
static void _viz_init(_VizStr* s) { s->cap = 256; s->len = 0; s->buf = (char*)malloc(s->cap); s->buf[0] = 0; }
static void _viz_app(_VizStr* s, const char* t) {
    size_t n = strlen(t);
    while (s->len + n + 1 > s->cap) { s->cap *= 2; s->buf = (char*)realloc(s->buf, s->cap); }
    memcpy(s->buf + s->len, t, n + 1);
    s->len += n;
}
static void _viz_app_ll(_VizStr* s, long long v) { char t[32]; snprintf(t, 32, "%lld", v); _viz_app(s, t); }
static void _viz_app_d(_VizStr* s, double v) { char t[40]; snprintf(t, 40, "%g", v); _viz_app(s, t); }
static void _viz_app_esc(_VizStr* s, const char* t) {
    char b[8];
    for (int i = 0; t[i] && i < 256; i++) {
        char c = t[i];
        if (c == '"') _viz_app(s, "\\\"");
        else if (c == '\\') _viz_app(s, "\\\\");
        else if (c == '\n') _viz_app(s, "\\n");
        else if (c == '\r') _viz_app(s, "\\r");
        else if (c == '\t') _viz_app(s, "\\t");
        else if ((unsigned char)c < 0x20) { snprintf(b, 8, "\\u%04x", c); _viz_app(s, b); }
        else { b[0] = c; b[1] = 0; _viz_app(s, b); }
    }
}

#define _VIZ_MAXF 5000
#define _VIZ_MAX_IDS 65536
static const void* _viz_id_ptr[_VIZ_MAX_IDS];
static long long _viz_id_val[_VIZ_MAX_IDS];
static int _viz_id_n = 0;
static long long _viz_next_id = 1;
static char* _viz_frames[_VIZ_MAXF + 1];
static int _viz_frames_n = 0;
static int _viz_stepn = 0;
static int _viz_done = 0;

static long long _viz_oid(const void* p) {
    for (int i = _viz_id_n - 1; i >= 0; i--) if (_viz_id_ptr[i] == p) return _viz_id_val[i];
    if (_viz_id_n < _VIZ_MAX_IDS) {
        _viz_id_ptr[_viz_id_n] = p;
        _viz_id_val[_viz_id_n] = _viz_next_id;
        _viz_id_n++;
    }
    return _viz_next_id++;
}

typedef struct { const char* fn; int line; char* locals; char* heap; } _VizSF;
static _VizSF _viz_stack[512];
static int _viz_sp = 0;

/* per-snap state */
static _VizStr _viz_locals;
static _VizStr _viz_heap;
static int _viz_first;
static int _viz_heap_n;
static long long _viz_seen[512];
static int _viz_seen_n;
static int _viz_line;

static _VizStr* _viz_cur(void) { return &_viz_locals; }

static int _viz_mark(long long id, int d) {
    for (int i = 0; i < _viz_seen_n; i++) if (_viz_seen[i] == id) return 0;
    if (_viz_seen_n < 512) _viz_seen[_viz_seen_n++] = id;
    if (_viz_heap_n >= 200 || d >= 8 || _viz_seen_n >= 512) return 0;
    return 1;
}
static void _viz_entry(long long id, const char* json) {
    if (_viz_heap.len) _viz_app(&_viz_heap, ",");
    _viz_app(&_viz_heap, "\"");
    _viz_app_ll(&_viz_heap, id);
    _viz_app(&_viz_heap, "\":");
    _viz_app(&_viz_heap, json);
    _viz_heap_n++;
}

static void _viz_flush(void) {
    static int flushed = 0;
    if (flushed) return;
    flushed = 1;
    fputs("\n__FRAMES__[", stderr);
    for (int i = 0; i < _viz_frames_n; i++) {
        if (i) fputc(',', stderr);
        fputs(_viz_frames[i], stderr);
    }
    fputs("]__END__\n", stderr);
    fflush(stderr);
}

static int _viz_push(const char* fn) {
    if (_viz_sp < 512) {
        _viz_stack[_viz_sp].fn = fn;
        _viz_stack[_viz_sp].line = 0;
        _viz_stack[_viz_sp].locals = NULL;
        _viz_stack[_viz_sp].heap = NULL;
        _viz_sp++;
    }
    static int registered = 0;
    if (!registered) { registered = 1; atexit(_viz_flush); }
    return 0;
}
static void _viz_pop(int* unused) {
    (void)unused;
    if (_viz_sp > 0) {
        _viz_sp--;
        free(_viz_stack[_viz_sp].locals);
        free(_viz_stack[_viz_sp].heap);
        _viz_stack[_viz_sp].locals = NULL;
        _viz_stack[_viz_sp].heap = NULL;
    }
}

static void _viz_begin(int line) {
    if (_viz_done) return;
    _viz_init(&_viz_locals);
    _viz_init(&_viz_heap);
    _viz_first = 1;
    _viz_heap_n = 0;
    _viz_seen_n = 0;
    _viz_line = line;
}
static void _viz_cap_name(const char* n) {
    if (!_viz_first) _viz_app(&_viz_locals, ",");
    _viz_first = 0;
    _viz_app(&_viz_locals, "\"");
    _viz_app_esc(&_viz_locals, n);
    _viz_app(&_viz_locals, "\":");
}
static void _viz_cap_ll(const char* n, long long v) { _viz_cap_name(n); _viz_app_ll(&_viz_locals, v); }
static void _viz_cap_d(const char* n, double v) { _viz_cap_name(n); _viz_app_d(&_viz_locals, v); }
static void _viz_cap_s(const char* n, const char* v) {
    _viz_cap_name(n);
    if (!v) { _viz_app(&_viz_locals, "null"); return; }
    _viz_app(&_viz_locals, "\"");
    _viz_app_esc(&_viz_locals, v);
    _viz_app(&_viz_locals, "\"");
}
static void _viz_cap_opq(const char* n) { _viz_cap_name(n); _viz_app(&_viz_locals, "\"(opaque)\""); }

static void _viz_arr_entry(const char* n, long long id, _VizStr* body) {
    _viz_cap_name(n);
    _viz_app(&_viz_locals, "\"@");
    _viz_app_ll(&_viz_locals, id);
    _viz_app(&_viz_locals, "\"");
    if (_viz_mark(id, 0)) _viz_entry(id, body->buf);
    free(body->buf);
}
static void _viz_cap_arr_i(const char* n, const int* a, int len) {
    long long id = _viz_oid((const void*)a);
    _VizStr e; _viz_init(&e);
    _viz_app(&e, "{\"type\":\"list\",\"values\":[");
    for (int i = 0; i < len && i < 1000; i++) { if (i) _viz_app(&e, ","); _viz_app_ll(&e, a[i]); }
    _viz_app(&e, "]}");
    _viz_arr_entry(n, id, &e);
}
static void _viz_cap_arr_d(const char* n, const double* a, int len) {
    long long id = _viz_oid((const void*)a);
    _VizStr e; _viz_init(&e);
    _viz_app(&e, "{\"type\":\"list\",\"values\":[");
    for (int i = 0; i < len && i < 1000; i++) { if (i) _viz_app(&e, ","); _viz_app_d(&e, a[i]); }
    _viz_app(&e, "]}");
    _viz_arr_entry(n, id, &e);
}
static void _viz_cap_arr2_i(const char* n, const int* a, int rows, int cols) {
    long long id = _viz_oid((const void*)a);
    _VizStr e; _viz_init(&e);
    _viz_app(&e, "{\"type\":\"list\",\"values\":[");
    for (int r = 0; r < rows && r < 200; r++) {
        if (r) _viz_app(&e, ",");
        /* synthetic ids — &a[0][0] aliases &a, which would collide with the outer id */
        long long rid = _viz_next_id++;
        _viz_app(&e, "\"@"); _viz_app_ll(&e, rid); _viz_app(&e, "\"");
        if (_viz_mark(rid, 1)) {
            _VizStr row; _viz_init(&row);
            _viz_app(&row, "{\"type\":\"list\",\"values\":[");
            for (int c2 = 0; c2 < cols && c2 < 1000; c2++) {
                if (c2) _viz_app(&row, ",");
                _viz_app_ll(&row, a[(size_t)r * cols + c2]);
            }
            _viz_app(&row, "]}");
            _viz_entry(rid, row.buf);
            free(row.buf);
        }
    }
    _viz_app(&e, "]}");
    _viz_arr_entry(n, id, &e);
}

static char* _viz_strdup(const char* s) { char* r = (char*)malloc(strlen(s) + 1); strcpy(r, s); return r; }

static void _viz_end(void) {
    if (_viz_done) { free(_viz_locals.buf); free(_viz_heap.buf); return; }
    if (_viz_frames_n >= _VIZ_MAXF) {
        _viz_done = 1;
        _VizStr t; _viz_init(&t);
        _viz_app(&t, "{\"step\":");
        _viz_app_ll(&t, ++_viz_stepn);
        _viz_app(&t, ",\"truncated\":true}");
        _viz_frames[_viz_frames_n++] = t.buf;
        free(_viz_locals.buf); free(_viz_heap.buf);
        return;
    }
    if (_viz_sp == 0) _viz_push("main");
    _VizSF* top = &_viz_stack[_viz_sp - 1];
    free(top->locals); free(top->heap);
    top->locals = _viz_locals.buf;
    top->heap = _viz_heap.buf;
    top->line = _viz_line;

    _VizStr f; _viz_init(&f);
    _viz_app(&f, "{\"step\":");
    _viz_app_ll(&f, ++_viz_stepn);
    _viz_app(&f, ",\"line\":");
    _viz_app_ll(&f, _viz_line);
    _viz_app(&f, ",\"event\":\"line\",\"stack\":[");
    for (int i = 0; i < _viz_sp; i++) {
        if (i) _viz_app(&f, ",");
        _viz_app(&f, "{\"function\":\"");
        _viz_app_esc(&f, _viz_stack[i].fn ? _viz_stack[i].fn : "?");
        _viz_app(&f, "\",\"line\":");
        _viz_app_ll(&f, _viz_stack[i].line ? _viz_stack[i].line : _viz_line);
        _viz_app(&f, ",\"locals\":{");
        if (_viz_stack[i].locals) _viz_app(&f, _viz_stack[i].locals);
        _viz_app(&f, "}}");
    }
    _viz_app(&f, "],\"heap\":{");
    int any = 0;
    for (int i = 0; i < _viz_sp; i++) {
        if (_viz_stack[i].heap && _viz_stack[i].heap[0]) {
            if (any) _viz_app(&f, ",");
            _viz_app(&f, _viz_stack[i].heap);
            any = 1;
        }
    }
    _viz_app(&f, "}}");
    _viz_frames[_viz_frames_n++] = f.buf;
}
struct Node;
static void _viz_enc_Node(const struct Node* p, int d, _VizStr* o);
static void _viz_obj_Node(const char* n, const void* p);
#line 1 "user.c"
#include <stdio.h>
#include <stdlib.h>

struct Node {
    int val;
    struct Node *left;
    struct Node *right;
};

struct Node* insertNode(struct Node* root, int val) {
    if (root == NULL) {
        struct Node* nd = (struct Node*)malloc(sizeof(struct Node));
        nd->val = val;
        nd->left = NULL;
        nd->right = NULL;
        return nd;
    }
    if (val < root->val) root->left = insertNode(root->left, val);
    else root->right = insertNode(root->right, val);
    return root;
}

int main(void) { __attribute__((cleanup(_viz_pop))) int _viz_g_ = _viz_push("main");
    int arr[5] = {5, 2, 8, 1, 9}; { _viz_begin(24); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_end(); }
    int n = 5; { _viz_begin(25); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_end(); }
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                int t = arr[j]; { _viz_begin(29); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_ll("i", (long long)i); _viz_cap_ll("j", (long long)j); _viz_cap_ll("t", (long long)t); _viz_end(); }
                arr[j] = arr[j + 1]; { _viz_begin(30); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_ll("i", (long long)i); _viz_cap_ll("j", (long long)j); _viz_cap_ll("t", (long long)t); _viz_end(); }
                arr[j + 1] = t; { _viz_begin(31); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_ll("i", (long long)i); _viz_cap_ll("j", (long long)j); _viz_cap_ll("t", (long long)t); _viz_end(); }
            }
        }
    }

    int g[4][4] = {
        {0, 1, 1, 0},
        {1, 0, 0, 1},
        {1, 0, 0, 1},
        {0, 1, 1, 0},
    };
    int visited[4] = {0, 0, 0, 0}; { _viz_begin(42); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_arr2_i("g", &g[0][0], (int)(sizeof(g)/sizeof(g[0])), (int)(sizeof(g[0])/sizeof(g[0][0]))); _viz_cap_arr_i("visited", visited, (int)(sizeof(visited)/sizeof(visited[0]))); _viz_end(); }
    int stack[16]; { _viz_begin(43); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_arr2_i("g", &g[0][0], (int)(sizeof(g)/sizeof(g[0])), (int)(sizeof(g[0])/sizeof(g[0][0]))); _viz_cap_arr_i("visited", visited, (int)(sizeof(visited)/sizeof(visited[0]))); _viz_cap_arr_i("stack", stack, (int)(sizeof(stack)/sizeof(stack[0]))); _viz_end(); }
    int top = 0; { _viz_begin(44); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_arr2_i("g", &g[0][0], (int)(sizeof(g)/sizeof(g[0])), (int)(sizeof(g[0])/sizeof(g[0][0]))); _viz_cap_arr_i("visited", visited, (int)(sizeof(visited)/sizeof(visited[0]))); _viz_cap_arr_i("stack", stack, (int)(sizeof(stack)/sizeof(stack[0]))); _viz_cap_ll("top", (long long)top); _viz_end(); }
    int order[4]; { _viz_begin(45); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_arr2_i("g", &g[0][0], (int)(sizeof(g)/sizeof(g[0])), (int)(sizeof(g[0])/sizeof(g[0][0]))); _viz_cap_arr_i("visited", visited, (int)(sizeof(visited)/sizeof(visited[0]))); _viz_cap_arr_i("stack", stack, (int)(sizeof(stack)/sizeof(stack[0]))); _viz_cap_ll("top", (long long)top); _viz_cap_arr_i("order", order, (int)(sizeof(order)/sizeof(order[0]))); _viz_end(); }
    int cnt = 0; { _viz_begin(46); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_arr2_i("g", &g[0][0], (int)(sizeof(g)/sizeof(g[0])), (int)(sizeof(g[0])/sizeof(g[0][0]))); _viz_cap_arr_i("visited", visited, (int)(sizeof(visited)/sizeof(visited[0]))); _viz_cap_arr_i("stack", stack, (int)(sizeof(stack)/sizeof(stack[0]))); _viz_cap_ll("top", (long long)top); _viz_cap_arr_i("order", order, (int)(sizeof(order)/sizeof(order[0]))); _viz_cap_ll("cnt", (long long)cnt); _viz_end(); }
    stack[top++] = 0; { _viz_begin(47); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_arr2_i("g", &g[0][0], (int)(sizeof(g)/sizeof(g[0])), (int)(sizeof(g[0])/sizeof(g[0][0]))); _viz_cap_arr_i("visited", visited, (int)(sizeof(visited)/sizeof(visited[0]))); _viz_cap_arr_i("stack", stack, (int)(sizeof(stack)/sizeof(stack[0]))); _viz_cap_ll("top", (long long)top); _viz_cap_arr_i("order", order, (int)(sizeof(order)/sizeof(order[0]))); _viz_cap_ll("cnt", (long long)cnt); _viz_end(); }
    while (top > 0) {
        int u = stack[--top]; { _viz_begin(49); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_arr2_i("g", &g[0][0], (int)(sizeof(g)/sizeof(g[0])), (int)(sizeof(g[0])/sizeof(g[0][0]))); _viz_cap_arr_i("visited", visited, (int)(sizeof(visited)/sizeof(visited[0]))); _viz_cap_arr_i("stack", stack, (int)(sizeof(stack)/sizeof(stack[0]))); _viz_cap_ll("top", (long long)top); _viz_cap_arr_i("order", order, (int)(sizeof(order)/sizeof(order[0]))); _viz_cap_ll("cnt", (long long)cnt); _viz_cap_ll("u", (long long)u); _viz_end(); }
        if (visited[u]) continue; { _viz_begin(50); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_arr2_i("g", &g[0][0], (int)(sizeof(g)/sizeof(g[0])), (int)(sizeof(g[0])/sizeof(g[0][0]))); _viz_cap_arr_i("visited", visited, (int)(sizeof(visited)/sizeof(visited[0]))); _viz_cap_arr_i("stack", stack, (int)(sizeof(stack)/sizeof(stack[0]))); _viz_cap_ll("top", (long long)top); _viz_cap_arr_i("order", order, (int)(sizeof(order)/sizeof(order[0]))); _viz_cap_ll("cnt", (long long)cnt); _viz_cap_ll("u", (long long)u); _viz_end(); }
        visited[u] = 1; { _viz_begin(51); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_arr2_i("g", &g[0][0], (int)(sizeof(g)/sizeof(g[0])), (int)(sizeof(g[0])/sizeof(g[0][0]))); _viz_cap_arr_i("visited", visited, (int)(sizeof(visited)/sizeof(visited[0]))); _viz_cap_arr_i("stack", stack, (int)(sizeof(stack)/sizeof(stack[0]))); _viz_cap_ll("top", (long long)top); _viz_cap_arr_i("order", order, (int)(sizeof(order)/sizeof(order[0]))); _viz_cap_ll("cnt", (long long)cnt); _viz_cap_ll("u", (long long)u); _viz_end(); }
        order[cnt++] = u; { _viz_begin(52); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_arr2_i("g", &g[0][0], (int)(sizeof(g)/sizeof(g[0])), (int)(sizeof(g[0])/sizeof(g[0][0]))); _viz_cap_arr_i("visited", visited, (int)(sizeof(visited)/sizeof(visited[0]))); _viz_cap_arr_i("stack", stack, (int)(sizeof(stack)/sizeof(stack[0]))); _viz_cap_ll("top", (long long)top); _viz_cap_arr_i("order", order, (int)(sizeof(order)/sizeof(order[0]))); _viz_cap_ll("cnt", (long long)cnt); _viz_cap_ll("u", (long long)u); _viz_end(); }
        for (int v = 3; v >= 0; v--) {
            if (g[u][v] == 1 && !visited[v]) {
                stack[top++] = v; { _viz_begin(55); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_arr2_i("g", &g[0][0], (int)(sizeof(g)/sizeof(g[0])), (int)(sizeof(g[0])/sizeof(g[0][0]))); _viz_cap_arr_i("visited", visited, (int)(sizeof(visited)/sizeof(visited[0]))); _viz_cap_arr_i("stack", stack, (int)(sizeof(stack)/sizeof(stack[0]))); _viz_cap_ll("top", (long long)top); _viz_cap_arr_i("order", order, (int)(sizeof(order)/sizeof(order[0]))); _viz_cap_ll("cnt", (long long)cnt); _viz_cap_ll("u", (long long)u); _viz_cap_ll("v", (long long)v); _viz_end(); }
            }
        }
    }

    struct Node* root = NULL; { _viz_begin(60); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_arr2_i("g", &g[0][0], (int)(sizeof(g)/sizeof(g[0])), (int)(sizeof(g[0])/sizeof(g[0][0]))); _viz_cap_arr_i("visited", visited, (int)(sizeof(visited)/sizeof(visited[0]))); _viz_cap_arr_i("stack", stack, (int)(sizeof(stack)/sizeof(stack[0]))); _viz_cap_ll("top", (long long)top); _viz_cap_arr_i("order", order, (int)(sizeof(order)/sizeof(order[0]))); _viz_cap_ll("cnt", (long long)cnt); _viz_obj_Node("root", (const void*)root); _viz_end(); }
    int vals[5] = {4, 2, 6, 1, 3}; { _viz_begin(61); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_arr2_i("g", &g[0][0], (int)(sizeof(g)/sizeof(g[0])), (int)(sizeof(g[0])/sizeof(g[0][0]))); _viz_cap_arr_i("visited", visited, (int)(sizeof(visited)/sizeof(visited[0]))); _viz_cap_arr_i("stack", stack, (int)(sizeof(stack)/sizeof(stack[0]))); _viz_cap_ll("top", (long long)top); _viz_cap_arr_i("order", order, (int)(sizeof(order)/sizeof(order[0]))); _viz_cap_ll("cnt", (long long)cnt); _viz_obj_Node("root", (const void*)root); _viz_cap_arr_i("vals", vals, (int)(sizeof(vals)/sizeof(vals[0]))); _viz_end(); }
    for (int i = 0; i < 5; i++) {
        root = insertNode(root, vals[i]); { _viz_begin(63); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_arr2_i("g", &g[0][0], (int)(sizeof(g)/sizeof(g[0])), (int)(sizeof(g[0])/sizeof(g[0][0]))); _viz_cap_arr_i("visited", visited, (int)(sizeof(visited)/sizeof(visited[0]))); _viz_cap_arr_i("stack", stack, (int)(sizeof(stack)/sizeof(stack[0]))); _viz_cap_ll("top", (long long)top); _viz_cap_arr_i("order", order, (int)(sizeof(order)/sizeof(order[0]))); _viz_cap_ll("cnt", (long long)cnt); _viz_obj_Node("root", (const void*)root); _viz_cap_arr_i("vals", vals, (int)(sizeof(vals)/sizeof(vals[0]))); _viz_cap_ll("i", (long long)i); _viz_end(); }
    }

    printf("%d %d\n", cnt, order[0]); { _viz_begin(66); _viz_cap_arr_i("arr", arr, (int)(sizeof(arr)/sizeof(arr[0]))); _viz_cap_ll("n", (long long)n); _viz_cap_arr2_i("g", &g[0][0], (int)(sizeof(g)/sizeof(g[0])), (int)(sizeof(g[0])/sizeof(g[0][0]))); _viz_cap_arr_i("visited", visited, (int)(sizeof(visited)/sizeof(visited[0]))); _viz_cap_arr_i("stack", stack, (int)(sizeof(stack)/sizeof(stack[0]))); _viz_cap_ll("top", (long long)top); _viz_cap_arr_i("order", order, (int)(sizeof(order)/sizeof(order[0]))); _viz_cap_ll("cnt", (long long)cnt); _viz_obj_Node("root", (const void*)root); _viz_cap_arr_i("vals", vals, (int)(sizeof(vals)/sizeof(vals[0]))); _viz_end(); }
    return 0;
}

#line 1 "viz-generated.c"
static void _viz_enc_Node(const struct Node* p, int d, _VizStr* o);
static void _viz_enc_Node(const struct Node* p, int d, _VizStr* o) {
  if (!p) { _viz_app(o, "null"); return; }
  long long _id = _viz_oid((const void*)p);
  _viz_app(o, "\"@"); _viz_app_ll(o, _id); _viz_app(o, "\"");
  if (!_viz_mark(_id, d)) return;
  _VizStr e; _viz_init(&e);
  _viz_app(&e, "{\"type\":\"object\",\"class\":\"Node\",\"fields\":{");
  _viz_app(&e, "\"val\":"); _viz_app_ll(&e, (long long)p->val);
  _viz_app(&e, ","); _viz_app(&e, "\"left\":"); _viz_enc_Node(p->left, d + 1, &e);
  _viz_app(&e, ","); _viz_app(&e, "\"right\":"); _viz_enc_Node(p->right, d + 1, &e);
  _viz_app(&e, "}}");
  _viz_entry(_id, e.buf);
}
static void _viz_obj_Node(const char* n, const void* p) {
  _viz_cap_name(n);
  _viz_enc_Node((const struct Node*)p, 0, _viz_cur());
}
