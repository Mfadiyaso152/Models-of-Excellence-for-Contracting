import sys
import re

# Remove requests tab from AdminProjectManagerModal
with open('src/components/AdminProjectManagerModal.tsx', 'r') as f:
    code = f.read()

# Remove the tab definition
code = code.replace("{ id: 'requests', label: 'طلبات العميل', icon: MessageSquare },", "")

# Remove the whole tab content
pattern_req_content = r'\{\/\* 3\. ENGINEER REQUESTS \*\/\}.*?\{\/\* 4\. DEDICATED CONTRACTS'
code = re.sub(pattern_req_content, '{/* 4. DEDICATED CONTRACTS', code, flags=re.DOTALL)

with open('src/components/AdminProjectManagerModal.tsx', 'w') as f:
    f.write(code)

# Remove requests tab from ProjectDetailView in App.tsx
with open('src/App.tsx', 'r') as f:
    code = f.read()

# Remove from ProjectDetailView tabs
code = code.replace("{ id: 'requests', label: 'طلباتي', icon: MessageSquare }", "")

# Remove tab content
pattern_req_content2 = r'\{\/\* Requests Tab \*\/\}.*?\{\/\* Documents Tab'
code = re.sub(pattern_req_content2, '{/* Documents Tab', code, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(code)

