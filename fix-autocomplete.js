const fs = require('fs');
let code = fs.readFileSync('./src/renderer/src/components/ui/autocomplete.tsx', 'utf8');

code = code.replace(/className\?:\s*string;/, "className?: string;\n  name?: string;");
code = code.replace(/required\n\}: AutocompleteProps\)/, "required,\n  name\n}: AutocompleteProps)");
code = code.replace(/className=\{className\}\n\s*required=\{required\}/, "className={className}\n            required={required}\n            name={name}");

fs.writeFileSync('./src/renderer/src/components/ui/autocomplete.tsx', code);
