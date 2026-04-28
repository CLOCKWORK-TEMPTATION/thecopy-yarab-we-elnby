const fs = require('fs');
const path = require('path');

const postHooksPath = path.join(__dirname, 'apps/web/src/app/(main)/cinematography-studio/hooks/usePostProduction.ts');
let postContent = fs.readFileSync(postHooksPath, 'utf8');

// Extra removals to bring lines down below 500

const removeBlock = (startStr, endStr) => {
    const start = postContent.indexOf(startStr);
    if(start === -1) return;
    const end = postContent.indexOf(endStr, start) + endStr.length;
    postContent = postContent.substring(0, start) + postContent.substring(end);
}

removeBlock('  const handleColorPaletteRegeneration = useCallback(async () => {', '  }, [generateColorPalette]);\n');
removeBlock('  const analyzeRhythm = useCallback(async () => {', '  }, [editorial.notes]);\n');

fs.writeFileSync(postHooksPath, postContent);

const prodHooksPath = path.join(__dirname, 'apps/web/src/app/(main)/cinematography-studio/hooks/useProduction.ts');
let prodContent = fs.readFileSync(prodHooksPath, 'utf8');

const removeBlockProd = (startStr, endStr) => {
    const start = prodContent.indexOf(startStr);
    if(start === -1) return;
    const end = prodContent.indexOf(endStr, start) + endStr.length;
    prodContent = prodContent.substring(0, start) + prodContent.substring(end);
}

removeBlockProd('  const handleQuestionChange = useCallback(', '  }, []);\n');
removeBlockProd('  const handleQuestionKeyDown = useCallback(', '  }, [askAssistant, isAssistantLoading]);\n');

fs.writeFileSync(prodHooksPath, prodContent);
