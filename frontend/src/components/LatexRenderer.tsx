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

      // First, find all LaTeX formulas (both inline and block) and store them with placeholders
      const formulas: Array<{content: string, isBlock: boolean}> = [];
      
      // Handle block math first ($$...$$) - including multi-line expressions
      let processedContent = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
        const placeholder = `__LATEX_FORMULA_${formulas.length}__`;
        formulas.push({content: formula.trim(), isBlock: true});
        return placeholder;
      });
      
      // Then handle inline math ($...$)
      processedContent = processedContent.replace(/\$([^$]+)\$/g, (match, formula) => {
        const placeholder = `__LATEX_FORMULA_${formulas.length}__`;
        formulas.push({content: formula.trim(), isBlock: false});
        return placeholder;
      });
      
      // Apply special character replacements to the text outside formulas
      const textProcessed = replaceSpecialChars(processedContent);
      
      // Now restore formulas with KaTeX rendering
      const finalContent = textProcessed.replace(/__LATEX_FORMULA_(\d+)__/g, (_, index) => {
        const formulaObj = formulas[parseInt(index)];
        if (!formulaObj) return '';
        
        try {
          const rendered = katex.renderToString(formulaObj.content, {
            throwOnError: false,
            output: 'html',
            displayMode: formulaObj.isBlock
          });
          
          // Wrap block equations in a div for proper spacing
          if (formulaObj.isBlock) {
            return `<div class="math-block my-4 text-center overflow-x-auto">${rendered}</div>`;
          } else {
            return `<span class="math-inline">${rendered}</span>`;
          }
        } catch (err) {
          console.error('KaTeX rendering error:', err);
          return formulaObj.isBlock ? `$$${formulaObj.content}$$` : `$${formulaObj.content}$`;
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