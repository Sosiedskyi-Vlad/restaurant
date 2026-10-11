with open('frontend/src/pages/WaiterBoard.tsx', 'r') as f:
    content = f.read()

# Add viewMode state
import_stmt = "import { CheckIcon, XMarkIcon, BellIcon, BanknotesIcon, ClockIcon } from '@heroicons/react/24/outline';"
new_import_stmt = "import { CheckIcon, XMarkIcon, BellIcon, BanknotesIcon, ClockIcon, MapIcon, ListBulletIcon } from '@heroicons/react/24/outline';"
content = content.replace(import_stmt, new_import_stmt)

state_declaration = "const [selectedTable, setSelectedTable] = useState<any>(null);"
new_state_declaration = "const [selectedTable, setSelectedTable] = useState<any>(null);\n    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');"
content = content.replace(state_declaration, new_state_declaration)

# Replace the header and the map block
old_header = """            <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Карта залу</h1>
            <div className="flex gap-4 mb-8 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl w-fit">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400"></div>Вільний</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400"></div>Є замовлення</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div>Рахунок</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div>Виклик</div>
            </div>

            {tables.length === 0 ? ("""

new_header = """            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Виклики столів</h1>
                
                <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                    <button onClick={() => setViewMode('map')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'map' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                        <MapIcon className="w-5 h-5"/> Карта залу
                    </button>
                    <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                        <ListBulletIcon className="w-5 h-5"/> Список
                    </button>
                </div>
            </div>

            {viewMode === 'map' ? (
                <>
                    <div className="flex gap-4 mb-8 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl w-fit">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400"></div>Вільний</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400"></div>Є замовлення</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div>Рахунок</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div>Виклик</div>
                    </div>

                    {tables.length === 0 ? ("""

content = content.replace(old_header, new_header)

old_map_end = """                </div>
            )}

            {/* Modal */}"""

new_map_end = """                </div>
            )}
            </>
            ) : (
                <div className="space-y-4 max-w-3xl">
                    {calls.length === 0 && <div className="text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 p-6 rounded-2xl">Немає активних викликів.</div>}
                    {calls.map((c:any) => (
                        <div key={c.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center transition-colors">
                            <div>
                                <div className="font-bold text-2xl mb-1 text-indigo-900 dark:text-indigo-400 tracking-tight">Стіл {c.tableNumber}</div>
                                <div className="text-slate-700 dark:text-slate-300 font-medium text-lg flex items-center gap-3">
                                    {c.type === 'WAITER' ? '👋 Просить підійти' : '💳 Просить рахунок'} 
                                    <span className="text-sm text-slate-400 dark:text-slate-500 font-normal">{new Date(c.createdAt).toLocaleTimeString()}</span>
                                </div>
                            </div>
                            <button onClick={() => resolveCall(c.id)} className="bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-md flex items-center gap-2">
                                <CheckIcon className="w-5 h-5"/> Оброблено
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}"""

content = content.replace(old_map_end, new_map_end)

with open('frontend/src/pages/WaiterBoard.tsx', 'w') as f:
    f.write(content)

