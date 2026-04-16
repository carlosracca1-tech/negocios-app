#!/bin/bash
# Apply the 3 compilation fixes
# Run from project root: bash apply-fixes.sh
set -e

echo "=== FIX 1: route.ts — timelineEvents type annotation ==="
FILE="src/app/api/projects/[id]/route.ts"
if grep -q 'const timelineEvents = \[\];' "$FILE"; then
  sed -i '' 's/const timelineEvents = \[\];/const timelineEvents: { projectId: string; action: string; detail: string }[] = [];/' "$FILE"
  echo "DONE: Applied type annotation to timelineEvents"
else
  echo "SKIP: timelineEvents already typed or not found"
fi

echo ""
echo "=== FIX 2: KPICard.tsx — sub/subColor accept null ==="
FILE="src/components/KPICard.tsx"
if grep -q 'sub?: string;' "$FILE"; then
  sed -i '' 's/sub?: string;/sub?: string | null;/' "$FILE"
  echo "DONE: sub now accepts null"
else
  echo "SKIP: sub already accepts null or not found"
fi
if grep -q 'subColor?: string;' "$FILE"; then
  sed -i '' 's/subColor?: string;/subColor?: string | null;/' "$FILE"
  echo "DONE: subColor now accepts null"
else
  echo "SKIP: subColor already accepts null or not found"
fi

echo ""
echo "=== FIX 3: ESLint config ==="
if [ ! -f ".eslintrc.json" ]; then
  echo '{"extends":"next/core-web-vitals"}' > .eslintrc.json
  echo "DONE: Created .eslintrc.json"
else
  echo "SKIP: .eslintrc.json already exists"
fi

echo ""
echo "=== Verifying fixes ==="
echo "route.ts:"
grep -n "timelineEvents" "$( echo 'src/app/api/projects/[id]/route.ts' )" | head -1
echo "KPICard.tsx:"
grep -n "sub?" src/components/KPICard.tsx | head -2
echo ".eslintrc.json:"
cat .eslintrc.json
echo ""
echo "=== All fixes applied. Run: npx tsc --noEmit && npm run build && npm run lint ==="
