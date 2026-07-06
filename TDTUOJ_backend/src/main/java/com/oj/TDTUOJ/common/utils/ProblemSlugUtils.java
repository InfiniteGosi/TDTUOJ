package com.oj.TDTUOJ.common.utils;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Turns a human title into a URL-safe slug for problem/contest routes.
 * Precompiled patterns are reused across calls to avoid recompiling the regexes each time.
 */
public class ProblemSlugUtils {
    private static final Pattern NON_LATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");
    private static final Pattern EDGES_DASHES = Pattern.compile("(^-|-$)");

    /**
     * Builds a lowercase, hyphenated ASCII slug from arbitrary (possibly accented) input.
     */
    public static String generateSlug(String input) {
        String noWhitespace = WHITESPACE.matcher(input).replaceAll("-");
        // NFD decomposes accented letters into base char + combining marks (e.g. "é" -> "e" + ´)
        // so the NON_LATIN strip below drops the marks and keeps the plain ASCII base letters.
        String normalized = Normalizer.normalize(noWhitespace, Normalizer.Form.NFD);
        String slug = NON_LATIN.matcher(normalized).replaceAll("");
        slug = EDGES_DASHES.matcher(slug).replaceAll(""); // trim leading/trailing dashes for clean URLs
        // Lock to ENGLISH locale so locale-specific casing (e.g. Turkish dotless i) can't corrupt slugs.
        return slug.toLowerCase(Locale.ENGLISH);
    }
}
