import sys
import re

with open('src/components/AdminProjectManagerModal.tsx', 'r') as f:
    code = f.read()

pattern = r'\{\/\* 6\. ENGINEER REQUESTS & REPLIES TAB \*\/\}.*?\{\/\* END MODAL CONTENT \*\/\}'
code = re.sub(pattern, '{/* END MODAL CONTENT */}', code, flags=re.DOTALL)

with open('src/components/AdminProjectManagerModal.tsx', 'w') as f:
    f.write(code)

