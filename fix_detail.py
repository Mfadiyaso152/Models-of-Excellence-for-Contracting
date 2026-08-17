import sys
import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

pattern = r'<button\s*onClick={onOpenCustomization}.*?</button>'
code = re.sub(pattern, '', code, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(code)

