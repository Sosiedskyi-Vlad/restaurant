import re

with open('frontend/src/GuestApp.tsx', 'r') as f:
    content = f.read()

# Fix useEffect
old_use_effect = """        let p = parseFloat(selectedItem.price);
        if (selectedItem.variations) {
            try {
                const vars = JSON.parse(selectedItem.variations);
                for (const vGroup of vars) {
                    const selectedOptName = modalOptions[vGroup.name];
                    if (selectedOptName) {
                        const opt = vGroup.options.find((o:any) => o.name === selectedOptName);
                        if (opt) {
                            if (opt.isAbsolute) p = parseFloat(opt.price);
                            else p += parseFloat(opt.price);
                        }
                    }
                }
            } catch(e) {}
        }
        setModalPrice(p);"""

new_use_effect = """        let p = parseFloat(selectedItem.price);
        if (selectedItem.variations) {
            try {
                const vars = JSON.parse(selectedItem.variations);
                const selectedOpts: any[] = [];
                for (const vGroup of vars) {
                    const selectedOptName = modalOptions[vGroup.name];
                    if (selectedOptName) {
                        const opt = vGroup.options.find((o:any) => o.name === selectedOptName);
                        if (opt) selectedOpts.push(opt);
                    }
                }
                
                // First apply absolute prices
                for (const opt of selectedOpts) {
                    if (opt.isAbsolute) p = parseFloat(opt.price);
                }
                
                // Then apply additive prices
                for (const opt of selectedOpts) {
                    if (!opt.isAbsolute) p += parseFloat(opt.price);
                }
            } catch(e) {}
        }
        setModalPrice(p);"""

content = content.replace(old_use_effect, new_use_effect)

old_quick_add = """        let p = parseFloat(item.price);
        const defOpts: Record<string, string> = {};
        if (item.variations) {
            try {
                const vars = JSON.parse(item.variations);
                for (const vGroup of vars) {
                    if (vGroup.options && vGroup.options.length > 0) {
                        const opt = vGroup.options[0];
                        defOpts[vGroup.name] = opt.name;
                        if (opt.isAbsolute) p = parseFloat(opt.price);
                        else p += parseFloat(opt.price);
                    }
                }
            } catch(e) {}
        }"""

new_quick_add = """        let p = parseFloat(item.price);
        const defOpts: Record<string, string> = {};
        if (item.variations) {
            try {
                const vars = JSON.parse(item.variations);
                const selectedOpts: any[] = [];
                for (const vGroup of vars) {
                    if (vGroup.options && vGroup.options.length > 0) {
                        const opt = vGroup.options[0];
                        defOpts[vGroup.name] = opt.name;
                        selectedOpts.push(opt);
                    }
                }
                
                for (const opt of selectedOpts) {
                    if (opt.isAbsolute) p = parseFloat(opt.price);
                }
                for (const opt of selectedOpts) {
                    if (!opt.isAbsolute) p += parseFloat(opt.price);
                }
            } catch(e) {}
        }"""

content = content.replace(old_quick_add, new_quick_add)

with open('frontend/src/GuestApp.tsx', 'w') as f:
    f.write(content)
