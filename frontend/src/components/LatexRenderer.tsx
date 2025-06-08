"use client";

import { useEffect, useState } from 'react';
import katex from 'katex';

interface LatexRendererProps {
  content: string;
  className?: string;
}

export default function LatexRenderer({ content, className = "" }: LatexRendererProps) {
  const [renderedContent, setRenderedContent] = useState<string>(content);

  useEffect(() => {
    if (!content) return;

    try {
      // Simple function to replace LaTeX accents and special characters
      const replaceSpecialChars = (text: string): string => {
        // Replace common LaTeX accent patterns directly
        return text
          // Accented characters
          .replace(/\\['`^"]{1}[aeiou]/g, (match) => {
            const accent = match.charAt(1);
            const char = match.charAt(2);
            
            const accentMap: Record<string, Record<string, string>> = {
              "'": { 'a': 'á', 'e': 'é', 'i': 'í', 'o': 'ó', 'u': 'ú' },
              '`': { 'a': 'à', 'e': 'è', 'i': 'ì', 'o': 'ò', 'u': 'ù' },
              '^': { 'a': 'â', 'e': 'ê', 'i': 'î', 'o': 'ô', 'u': 'û' },
              '"': { 'a': 'ä', 'e': 'ë', 'i': 'ï', 'o': 'ö', 'u': 'ü' }
            };
            
            return accentMap[accent]?.[char] || match;
          })
          // Other special characters and symbols
          .replace(/\\c\{c\}/g, 'ç')
          .replace(/\\~n/g, 'ñ')
          .replace(/\\ss/g, 'ß')
          .replace(/\\ae/g, 'æ')
          .replace(/\\oe/g, 'œ');
      };

      // First, find all LaTeX formulas and store them with a placeholder
      const formulas: string[] = [];
      const withPlaceholders = content.replace(/\$([^$]+)\$/g, (match, formula) => {
        const placeholder = `__LATEX_FORMULA_${formulas.length}__`;
        formulas.push(formula);
        return placeholder;
      });
      
      // Apply special character replacements to the text outside formulas
      const processedText = replaceSpecialChars(withPlaceholders);
      
      // Now restore formulas with KaTeX rendering
      const finalContent = processedText.replace(/__LATEX_FORMULA_(\d+)__/g, (_, index) => {
        const formula = formulas[parseInt(index)];
        try {
          return katex.renderToString(formula, {
            throwOnError: false,
            output: 'html',
            displayMode: false
          });
        } catch (err) {
          console.error('KaTeX rendering error:', err);
          return `$${formula}$`; // Return the original formula if rendering fails
        }
      });
      
      setRenderedContent(finalContent);
    } catch (err) {
      console.error('Error processing LaTeX:', err);
      setRenderedContent(content);
    }
  }, [content]);

  return (
    <span 
      className={className}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
} 