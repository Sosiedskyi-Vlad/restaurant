with open('frontend/src/GuestApp.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "options: Record<string, string>;",
    "options: Record<string, string[]>;"
)

old_display = "{optKeys.map(k => c.options[k]).join(', ')}"
new_display = "{optKeys.map(k => c.options[k]).flat().filter(Boolean).join(', ')}"

content = content.replace(old_display, new_display)

with open('frontend/src/GuestApp.tsx', 'w') as f:
    f.write(content)
