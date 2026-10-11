with open('frontend/src/GuestApp.tsx', 'r') as f:
    content = f.read()

# 1. Update state type
content = content.replace(
    "const [modalOptions, setModalOptions] = useState<Record<string, string>>({});",
    "const [modalOptions, setModalOptions] = useState<Record<string, string[]>>({});"
)

# 2. Update price calculation in useEffect
old_price_calc = """                    const selectedOptName = modalOptions[vGroup.name];
                    if (selectedOptName) {
                        const opt = vGroup.options.find((o:any) => o.name === selectedOptName);
                        if (opt) selectedOpts.push(opt);
                    }"""

new_price_calc = """                    const selectedOptNames = modalOptions[vGroup.name] || [];
                    for (const selectedOptName of selectedOptNames) {
                        const opt = vGroup.options.find((o:any) => o.name === selectedOptName);
                        if (opt) selectedOpts.push(opt);
                    }"""

content = content.replace(old_price_calc, new_price_calc)

# 3. Update defOpts in openModal
old_def_opts = """        const defOpts: Record<string, string> = {};
        if (item.variations) {
            try {
                const vars = JSON.parse(item.variations);
                for (const vGroup of vars) {
                    if (vGroup.options && vGroup.options.length > 0) {
                        defOpts[vGroup.name] = vGroup.options[0].name;
                    }
                }
            } catch(e) {}
        }"""

new_def_opts = """        const defOpts: Record<string, string[]> = {};
        if (item.variations) {
            try {
                const vars = JSON.parse(item.variations);
                for (const vGroup of vars) {
                    if (vGroup.options && vGroup.options.length > 0 && vGroup.type === 'SINGLE') {
                        defOpts[vGroup.name] = [vGroup.options[0].name];
                    } else if (vGroup.type === 'MULTIPLE') {
                        defOpts[vGroup.name] = [];
                    }
                }
            } catch(e) {}
        }"""

content = content.replace(old_def_opts, new_def_opts)

# 4. Update quickAdd defOpts
old_quick_def_opts = """        const defOpts: Record<string, string> = {};
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
                }"""

new_quick_def_opts = """        const defOpts: Record<string, string[]> = {};
        if (item.variations) {
            try {
                const vars = JSON.parse(item.variations);
                const selectedOpts: any[] = [];
                for (const vGroup of vars) {
                    if (vGroup.options && vGroup.options.length > 0 && vGroup.type === 'SINGLE') {
                        const opt = vGroup.options[0];
                        defOpts[vGroup.name] = [opt.name];
                        selectedOpts.push(opt);
                    } else if (vGroup.type === 'MULTIPLE') {
                        defOpts[vGroup.name] = [];
                    }
                }"""

content = content.replace(old_quick_def_opts, new_quick_def_opts)

# 5. Update renderVariations onClick logic
old_render_vars = """                            const isSelected = modalOptions[group.name] === opt.name;
                            return (
                                <button 
                                    key={optIdx}
                                    onClick={() => setModalOptions({...modalOptions, [group.name]: opt.name})}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}"""

new_render_vars = """                            const isSelected = (modalOptions[group.name] || []).includes(opt.name);
                            const toggleOption = () => {
                                const current = modalOptions[group.name] || [];
                                let next;
                                if (group.type === 'SINGLE') {
                                    next = [opt.name]; // always select exactly one
                                } else {
                                    if (isSelected) next = current.filter((n: string) => n !== opt.name);
                                    else next = [...current, opt.name];
                                }
                                setModalOptions({...modalOptions, [group.name]: next});
                            };
                            return (
                                <button 
                                    key={optIdx}
                                    onClick={toggleOption}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}"""

content = content.replace(old_render_vars, new_render_vars)

with open('frontend/src/GuestApp.tsx', 'w') as f:
    f.write(content)
