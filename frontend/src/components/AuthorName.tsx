"use client";

import { useEffect, useState } from 'react';

interface AuthorNameProps {
  name: string;
  className?: string;
}

export default function AuthorName({ name, className = "" }: AuthorNameProps) {
  const [formattedName, setFormattedName] = useState<string>(name);

  useEffect(() => {
    if (!name) return;

    try {
      // Direct replacement for the format in the screenshot: {\\l}
      let result = name;
      
      // Focus specifically on the Polish character issue
      result = result.replace(/\{\\l\}/g, "ł");
      result = result.replace(/\{\\\\l\}/g, "ł");
      result = result.replace(/\\\{\\l\\\}/g, "ł");
      result = result.replace(/\\l/g, "ł");
      
      // Replace other common patterns
      const replacements: Record<string, string> = {
        "{\\L}": "Ł",
        "\\L": "Ł",
        "\\'a": "á",
        "\\'e": "é",
        "\\'i": "í",
        "\\'o": "ó",
        "\\'u": "ú",
        "\\`a": "à",
        "\\`e": "è",
        "\\`i": "ì",
        "\\`o": "ò",
        "\\`u": "ù",
        "\\^a": "â",
        "\\^e": "ê",
        "\\^i": "î",
        "\\^o": "ô",
        "\\^u": "û",
        '\\"a': "ä",
        '\\"e': "ë",
        '\\"i': "ï",
        '\\"o': "ö",
        '\\"u': "ü",
        "\\~n": "ñ",
        "\\c{c}": "ç",
        "\\k{a}": "ą",
        "\\k{e}": "ę",
        "\\ss": "ß",
        "\\ae": "æ",
        "\\oe": "œ",
        "\\AE": "Æ",
        "\\OE": "Œ",
      };
      
      // Apply all replacements
      for (const [pattern, replacement] of Object.entries(replacements)) {
        // Use a global replace
        const regex = new RegExp(pattern.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"), "g");
        result = result.replace(regex, replacement);
      }
      
      // Accented characters with braces
      result = result
        .replace(/\{\\'a\}/g, "á")
        .replace(/\{\\'e\}/g, "é")
        .replace(/\{\\'i\}/g, "í")
        .replace(/\{\\'o\}/g, "ó")
        .replace(/\{\\'u\}/g, "ú")
        .replace(/\{\\`a\}/g, "à")
        .replace(/\{\\`e\}/g, "è")
        .replace(/\{\\`i\}/g, "ì")
        .replace(/\{\\`o\}/g, "ò")
        .replace(/\{\\`u\}/g, "ù")
        .replace(/\{\\^a\}/g, "â")
        .replace(/\{\\^e\}/g, "ê")
        .replace(/\{\\^i\}/g, "î")
        .replace(/\{\\^o\}/g, "ô")
        .replace(/\{\\^u\}/g, "û")
        .replace(/\{\\"a\}/g, "ä")
        .replace(/\{\\"e\}/g, "ë")
        .replace(/\{\\"i\}/g, "ï")
        .replace(/\{\\"o\}/g, "ö")
        .replace(/\{\\"u\}/g, "ü")
        .replace(/\{\\~n\}/g, "ñ")
        .replace(/\{\\~N\}/g, "Ñ");
      

      
      setFormattedName(result);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error processing name:', err);
      }
      setFormattedName(name);
    }
  }, [name]);

  return (
    <span className={className} title={name}>
      {formattedName}
    </span>
  );
} 