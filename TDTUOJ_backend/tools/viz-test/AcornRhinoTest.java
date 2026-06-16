import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import java.nio.file.Files;
import java.nio.file.Path;

/** Can Rhino execute acorn and parse ES6 classes? */
public class AcornRhinoTest {
    public static void main(String[] args) throws Exception {
        String acorn = Files.readString(Path.of("src/main/resources/visualizer/acorn.js"));
        String fixture = Files.readString(Path.of("tools/viz-test/fixture.js"));

        Context cx = Context.enter();
        try {
            cx.setLanguageVersion(Context.VERSION_ES6);
            cx.setOptimizationLevel(-1); // interpret — avoids 64K bytecode limits
            Scriptable scope = cx.initStandardObjects();
            // acorn dist is CJS/UMD: provide module/exports
            cx.evaluateString(scope, "var module={exports:{}};var exports=module.exports;", "shim", 1, null);
            cx.evaluateString(scope, acorn, "acorn.js", 1, null);
            ScriptableObject.putProperty(scope, "src", fixture);
            Object result = cx.evaluateString(scope,
                    "var ast=module.exports.parse(src,{ecmaVersion:2020,locations:true});" +
                    "JSON.stringify({type:ast.type,body:ast.body.length,first:ast.body[0].type})",
                    "test", 1, null);
            System.out.println("OK: " + result);
        } finally {
            Context.exit();
        }
    }
}
