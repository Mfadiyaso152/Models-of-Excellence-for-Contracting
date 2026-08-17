import sys
import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# 1. Fix header brand name "نماذج التميز"
code = code.replace(
    '<h1 className="text-base font-black tracking-wide text-[#1C3022]">نماذج التميز</h1>',
    '<h1 className="text-base font-black tracking-wide text-white">نماذج التميز</h1>'
)

# 2. Fix banner text inside bg-[#1C3022] (line ~1659)
code = code.replace(
    'className="bg-[#1C3022] rounded-[2rem] p-6 text-[#1C3022] relative overflow-hidden shadow-xl border border-[#284430]"',
    'className="bg-[#1C3022] rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl border border-[#284430]"'
)
code = code.replace(
    '<h3 className="text-lg font-black mb-1.5 text-[#1C3022]">هل لديك مشروع بناء أو تطوير؟</h3>',
    '<h3 className="text-lg font-black mb-1.5 text-white">هل لديك مشروع بناء أو تطوير؟</h3>'
)

# 3. Fix project card badge / progress tags with bg-[#1C3022] and text-[#1C3022]
code = code.replace(
    'bg-[#1C3022]/90 backdrop-blur-md text-[#1C3022]',
    'bg-[#1C3022]/90 backdrop-blur-md text-white'
)
code = code.replace(
    'bg-[#1C3022] hover:bg-[#122116] text-[#1C3022]',
    'bg-[#1C3022] hover:bg-[#122116] text-white'
)

with open('src/App.tsx', 'w') as f:
    f.write(code)

print("Fixed text colors successfully")
