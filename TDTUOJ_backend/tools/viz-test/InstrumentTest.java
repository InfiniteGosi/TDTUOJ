import com.oj.TDTUOJ.visualizer.service.tracer.*;

import java.nio.file.*;

/**
 * Dev harness: instruments a fixture with a Tracer and writes the result,
 * so it can be executed with a local runtime to validate preambles without
 * Judge0. Usage: java -cp target/classes;tools/viz-test InstrumentTest <lang> <in> <out>
 */
public class InstrumentTest {
    public static void main(String[] args) throws Exception {
        String lang = args[0];
        String src = Files.readString(Path.of(args[1]));
        Tracer tracer = switch (lang) {
            case "python" -> new PythonTracer();
            case "js"     -> new JsTracer();
            case "java"   -> new JavaTracer();
            case "csharp" -> new CSharpTracer();
            case "cpp"    -> new CppTracer();
            case "c"      -> new CTracer();
            default -> throw new IllegalArgumentException(lang);
        };
        Files.writeString(Path.of(args[2]), tracer.instrument(src));
        System.out.println("OK -> " + args[2]);
    }
}
