import { useState, useEffect } from "react";
import { Box, Text, Menu, Button, Portal } from "@chakra-ui/react";
import { LANGUAGE_IDS } from "./constants";
import ApiService from "../../services/ApiService";

const languages = Object.entries(LANGUAGE_IDS);
const ACTIVE_COLOR = "blue.400";

const LanguageSelector = ({ language, onSelect }) => {
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllLanguages = async () => {
      const fetchedNames = {};

      // Loop through all languages
      for (const [lang, id] of languages) {
        try {
          const response = await ApiService.getLanguage(id);
          fetchedNames[lang] = response.name || lang;
        } catch (error) {
          console.error(`Error fetching ${lang}:`, error);
          fetchedNames[lang] = lang; // Fallback to lang name
        }
      }

      setNames(fetchedNames);
      setLoading(false);
    };

    fetchAllLanguages();
  }, []);

  return (
    <Box>
      <Text mb={2} fontSize="sm" color="gray.400" fontWeight="medium">
        Language:
      </Text>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            color="gray.200"
            borderColor="gray.600"
            _hover={{ borderColor: "gray.400" }}
          >
            {loading ? "Loading..." : names[language] || language}
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              {languages.map(([lang]) => (
                <Menu.Item
                  key={lang}
                  value={lang}
                  color={lang === language ? ACTIVE_COLOR : ""}
                  bg={lang === language ? "gray.900" : "transparent"}
                  _hover={{
                    color: ACTIVE_COLOR,
                    bg: "gray.900",
                  }}
                  onClick={() => onSelect(lang)}
                >
                  {names[lang] || lang}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </Box>
  );
};

export default LanguageSelector;
