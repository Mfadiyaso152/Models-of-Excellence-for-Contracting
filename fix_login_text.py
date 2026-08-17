import sys

with open('src/App.tsx', 'r') as f:
    code = f.read()

# Fix text color inside dark buttons in login flow
code = code.replace(
    'className="flex items-center gap-2.5 text-[#1C3022]"',
    'className="flex items-center gap-2.5 text-white"'
)

code = code.replace(
    '<span className="text-[#1C3022]">\n                          المتابعة السريعة بحساب Google',
    '<span className="text-white">\n                          المتابعة السريعة بحساب Google'
)

# Also check for any other occurrences of text-[#1C3022] inside bg-[#1C3022] buttons
code = code.replace(
    'bg-[#1C3022] hover:bg-[#122116] text-[#1C3022]',
    'bg-[#1C3022] hover:bg-[#122116] text-white'
)

with open('src/App.tsx', 'w') as f:
    f.write(code)

print("Fixed login button text color")
