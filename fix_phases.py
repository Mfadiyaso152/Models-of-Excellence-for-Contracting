import sys
import re

with open('src/components/SupervisorViews.tsx', 'r') as f:
    code = f.read()

search = """      phases: [
        { id: '1', title: 'المرحلة الإنشائية الأولى', status: 'قيد الانتظار', progress: 0 }
      ],"""

replace = """      phases: [],"""

code = code.replace(search, replace)

with open('src/components/SupervisorViews.tsx', 'w') as f:
    f.write(code)
