// Visualizer JS instrumentation driver.
// Executed inside Rhino on the BACKEND (never in the sandbox), with acorn.js
// pre-loaded as `acorn`. Globals provided by JsTracer: `src` (user source).
// Returns the instrumented user code (preamble is prepended by Java).
//
// Strategy: after every statement at block level insert
//   ;__viz.snap(<line>, {<visible vars>});
// and wrap every function body in  __viz.enter(name); try { ... } finally { __viz.exit(); }
// Inserts are inline (no newlines) so original line numbers survive.
(function () {
  "use strict";

  var ast = acorn.parse(src, { ecmaVersion: 2020, locations: true });

  // ── parent links ───────────────────────────────────────────────────────────
  function link(node, parent) {
    node._parent = parent;
    for (var key in node) {
      if (key === "_parent" || !Object.prototype.hasOwnProperty.call(node, key)) continue;
      var child = node[key];
      if (child && typeof child === "object") {
        if (Array.isArray(child)) {
          for (var i = 0; i < child.length; i++) {
            if (child[i] && typeof child[i].type === "string") link(child[i], node);
          }
        } else if (typeof child.type === "string") {
          link(child, node);
        }
      }
    }
  }
  link(ast, null);

  function walk(node, fn) {
    fn(node);
    for (var key in node) {
      if (key === "_parent" || !Object.prototype.hasOwnProperty.call(node, key)) continue;
      var child = node[key];
      if (child && typeof child === "object") {
        if (Array.isArray(child)) {
          for (var i = 0; i < child.length; i++) {
            if (child[i] && typeof child[i].type === "string") walk(child[i], fn);
          }
        } else if (typeof child.type === "string") {
          walk(child, fn);
        }
      }
    }
  }

  function isFunction(n) {
    return n.type === "FunctionDeclaration" || n.type === "FunctionExpression" ||
           n.type === "ArrowFunctionExpression";
  }

  function enclosingFunctionBody(node) {
    for (var n = node._parent; n; n = n._parent) {
      if (isFunction(n) && n.body.type === "BlockStatement") return n.body;
    }
    return ast;
  }

  function enclosingBlockScope(node) {
    for (var n = node._parent; n; n = n._parent) {
      if (n.type === "BlockStatement" || n.type === "Program" ||
          n.type === "ForStatement" || n.type === "ForInStatement" || n.type === "ForOfStatement") {
        return n;
      }
      if (isFunction(n)) return n.body.type === "BlockStatement" ? n.body : n;
    }
    return ast;
  }

  function isAncestorOrSelf(candidate, node) {
    for (var n = node; n; n = n._parent) if (n === candidate) return true;
    return false;
  }

  function patternNames(node, out) {
    if (!node) return out;
    switch (node.type) {
      case "Identifier": out.push(node.name); break;
      case "ObjectPattern":
        for (var i = 0; i < node.properties.length; i++) {
          var p = node.properties[i];
          patternNames(p.type === "RestElement" ? p.argument : p.value, out);
        }
        break;
      case "ArrayPattern":
        for (var j = 0; j < node.elements.length; j++) patternNames(node.elements[j], out);
        break;
      case "AssignmentPattern": patternNames(node.left, out); break;
      case "RestElement": patternNames(node.argument, out); break;
    }
    return out;
  }

  // ── pass 1: declarations ───────────────────────────────────────────────────
  var decls = []; // {name, end, scope}
  walk(ast, function (node) {
    if (node.type === "VariableDeclaration") {
      var blockScoped = node.kind !== "var";
      var scope = blockScoped ? enclosingBlockScope(node) : enclosingFunctionBody(node);
      for (var i = 0; i < node.declarations.length; i++) {
        var names = patternNames(node.declarations[i].id, []);
        for (var k = 0; k < names.length; k++) {
          decls.push({ name: names[k], end: node.end, scope: scope });
        }
      }
    } else if (isFunction(node)) {
      var body = node.body.type === "BlockStatement" ? node.body : node;
      for (var p = 0; p < node.params.length; p++) {
        var pnames = patternNames(node.params[p], []);
        for (var q = 0; q < pnames.length; q++) {
          decls.push({ name: pnames[q], end: body.start + 1, scope: body });
        }
      }
    } else if (node.type === "CatchClause" && node.param) {
      var cnames = patternNames(node.param, []);
      for (var c = 0; c < cnames.length; c++) {
        decls.push({ name: cnames[c], end: node.body.start + 1, scope: node.body });
      }
    }
  });

  // ── pass 2: edits ──────────────────────────────────────────────────────────
  var SNAP_TYPES = {
    ExpressionStatement: 1, VariableDeclaration: 1, ForStatement: 1, ForInStatement: 1,
    ForOfStatement: 1, WhileStatement: 1, DoWhileStatement: 1, IfStatement: 1,
    SwitchStatement: 1, TryStatement: 1,
  };

  var edits = []; // {pos, prio, text}

  function functionName(fn) {
    if (fn.id && fn.id.name) return fn.id.name;
    var p = fn._parent;
    if (p) {
      if (p.type === "VariableDeclarator" && p.id.type === "Identifier") return p.id.name;
      if (p.type === "Property" && p.key && p.key.name) return p.key.name;
      if (p.type === "MethodDefinition" && p.key && p.key.name) return p.key.name;
      if (p.type === "AssignmentExpression" && p.left.type === "Identifier") return p.left.name;
    }
    return "anonymous";
  }

  walk(ast, function (node) {
    if (isFunction(node) && node.body.type === "BlockStatement") {
      var name = functionName(node).replace(/[\\"]/g, "");
      edits.push({ pos: node.body.start + 1, prio: 0,
                   text: '__viz.enter("' + name + '");try{' });
      edits.push({ pos: node.body.end - 1, prio: 1, text: "}finally{__viz.exit();}" });
      return;
    }
    var parent = node._parent;
    var atBlockLevel = parent && (parent.type === "BlockStatement" || parent.type === "Program");
    if (!atBlockLevel || !SNAP_TYPES[node.type]) return;
    // class/function declarations carry nothing new — handled above
    var insertAt = node.end;
    var parts = [];
    var seen = {};
    for (var i = 0; i < decls.length; i++) {
      var d = decls[i];
      if (d.end > insertAt) continue;
      if (seen[d.name]) continue;
      if (!isAncestorOrSelf(d.scope, node)) continue;
      seen[d.name] = true;
      parts.push('"' + d.name + '":(typeof ' + d.name + "==='undefined'?undefined:" + d.name + ")");
    }
    edits.push({ pos: insertAt, prio: 2,
                 text: ";__viz.snap(" + node.loc.start.line + ",{" + parts.join(",") + "});" });
  });

  // back-to-front so positions stay valid
  edits.sort(function (a, b) { return b.pos - a.pos || b.prio - a.prio; });
  var out = src;
  for (var e = 0; e < edits.length; e++) {
    out = out.slice(0, edits[e].pos) + edits[e].text + out.slice(edits[e].pos);
  }
  return out;
})();
