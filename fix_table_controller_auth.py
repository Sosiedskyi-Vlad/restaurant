with open('src/main/java/com/vlad/restaurant/controller/TableController.java', 'r') as f:
    lines = f.readlines()

new_lines = []
last_was_preauth = False
for line in lines:
    is_preauth = line.strip().startswith('@PreAuthorize')
    if is_preauth and last_was_preauth:
        continue # skip duplicate
    if is_preauth:
        last_was_preauth = True
    elif line.strip() != "":
        last_was_preauth = False
    
    new_lines.append(line)

with open('src/main/java/com/vlad/restaurant/controller/TableController.java', 'w') as f:
    f.writelines(new_lines)
