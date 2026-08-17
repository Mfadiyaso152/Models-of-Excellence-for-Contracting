import sys
import re

with open('src/components/SupervisorViews.tsx', 'r') as f:
    code = f.read()

# Remove reminder button
pattern_remind = r'\{\/\* 7-Day Overdue Reminder Trigger Button \*\/\}.*?<\/button>\n\s*\}\)'
code = re.sub(pattern_remind, '', code, flags=re.DOTALL)

# Remove "إدارة" button
pattern_manage = r'<button\s*type="button"\s*onClick=\{\(\) => onManageProject\(item\.project\)\}.*?>\s*إدارة\s*<\/button>'
code = re.sub(pattern_manage, '', code, flags=re.DOTALL)

with open('src/components/SupervisorViews.tsx', 'w') as f:
    f.write(code)

