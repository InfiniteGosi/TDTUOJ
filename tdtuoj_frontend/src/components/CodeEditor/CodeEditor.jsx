import {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import Editor from "@monaco-editor/react";
import LanguageSelector from "./LanguageSelector";
import { Box, HStack } from "@chakra-ui/react";
import { CODE_SNIPPETS } from "./constants";

const CodeEditor = forwardRef(({ rightHeaderContent }, ref) => {
  const editorRef = useRef();
  const [value, setValue] = useState(CODE_SNIPPETS["c"]);
  const [language, setLanguage] = useState("c");

  useEffect(() => {
    setValue(CODE_SNIPPETS["c"]);
  }, []);

  const handleChange = (value) => {
    setValue(value);
  };

  const handleMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  const onSelect = (language) => {
    setLanguage(language);
    setValue(CODE_SNIPPETS[language]);
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getCodeAndLanguage: () => ({
      code: value,
      language: language,
    }),
  }));

  return (
    <Box height="100%" display="flex" flexDirection="column">
      <HStack
        justify="space-between"
        align="center"
        px={4}
        py={2}
        bg="white"
        borderBottom="1px"
        borderColor="gray.200"
        minHeight="60px"
      >
        <LanguageSelector language={language} onSelect={onSelect} />
        <Box>{rightHeaderContent}</Box>
      </HStack>

      <Box flex="1" overflow="hidden">
        <Editor
          height="100%"
          theme="vs-dark"
          language={language}
          defaultValue={CODE_SNIPPETS["c"]}
          value={value}
          onMount={handleMount}
          onChange={handleChange}
          options={{
            minimap: { enabled: false },
            suggestOnTriggerCharacters: false,
            quickSuggestions: false,
            wordBasedSuggestions: false,
            parameterHints: { enabled: false },
            tabCompletion: "on",
          }}
        />
      </Box>
    </Box>
  );
});

CodeEditor.displayName = "CodeEditor";

export default CodeEditor;
