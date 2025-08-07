#!/bin/bash

# Rebrand from Hugo AI/DocGo to GOdoc

echo "Starting rebranding to GOdoc..."

# Replace hugo-ai with godoc (case sensitive)
find . -type f -name "*.js" -o -name "*.md" -o -name "*.json" | grep -v node_modules | grep -v .git | while read file; do
    sed -i '' 's/hugo-ai/godoc/g' "$file"
done

# Replace Hugo AI with GOdoc
find . -type f -name "*.js" -o -name "*.md" -o -name "*.json" | grep -v node_modules | grep -v .git | while read file; do
    sed -i '' 's/Hugo AI/GOdoc/g' "$file"
done

# Replace DocGo with GOdoc
find . -type f -name "*.js" -o -name "*.md" -o -name "*.json" | grep -v node_modules | grep -v .git | while read file; do
    sed -i '' 's/DocGo/GOdoc/g' "$file"
    sed -i '' 's/docGo/GOdoc/g' "$file"
    sed -i '' 's/docgo/godoc/g' "$file"
done

# Update test files
if [ -f "test-docgo-workflow.js" ]; then
    mv test-docgo-workflow.js test-godoc-workflow.js
fi

# Update .gitignore
sed -i '' 's/\.hugo-ai/\.godoc/g' .gitignore

echo "Rebranding complete!"