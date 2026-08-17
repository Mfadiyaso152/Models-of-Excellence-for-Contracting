import sys

with open('src/components/CustomerSupportModal.tsx', 'r') as f:
    code = f.read()

code = code.replace("          {/* Chat Messages Area */}\n          <div className=\"flex-1", "          <div className=\"flex-1")

with open('src/components/CustomerSupportModal.tsx', 'w') as f:
    f.write(code)
