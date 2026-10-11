with open('frontend/src/Kitchen.tsx', 'r') as f:
    content = f.read()

old_item_render = """                {order.items.map((i: any, idx: number) => (
                    <li key={idx} className="flex justify-between font-medium">
                        <span>{i.quantity}x {i.name}</span>
                    </li>
                ))}"""

new_item_render = """                {order.items.map((i: any, idx: number) => {
                    let optsDisplay = '';
                    if (i.selectedOptions) {
                        try {
                            const parsed = JSON.parse(i.selectedOptions);
                            const optList = Object.values(parsed).flat().filter(Boolean);
                            if (optList.length > 0) optsDisplay = '(' + optList.join(', ') + ')';
                        } catch(e) {}
                    }
                    return (
                        <li key={idx} className="flex flex-col font-medium mb-2 border-b border-gray-50 pb-1 last:border-0">
                            <div className="flex justify-between">
                                <span>{i.quantity}x {i.name}</span>
                            </div>
                            {optsDisplay && <span className="text-xs text-indigo-600 font-bold ml-5">{optsDisplay}</span>}
                        </li>
                    );
                })}"""

content = content.replace(old_item_render, new_item_render)

with open('frontend/src/Kitchen.tsx', 'w') as f:
    f.write(content)

with open('frontend/src/StaffApp.tsx', 'r') as f:
    content = f.read()

content = content.replace(old_item_render, new_item_render)

with open('frontend/src/StaffApp.tsx', 'w') as f:
    f.write(content)
