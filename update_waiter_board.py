with open('frontend/src/pages/WaiterBoard.tsx', 'r') as f:
    content = f.read()

old_grid = """            {tables.length === 0 ? (
                <div className="text-slate-500">Немає доданих столів. Адміністратор має створити їх.</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {tables.map(t => {
                        const status = getTableStatus(t.number);
                        return (
                            <button 
                                key={t.id}
                                onClick={() => setSelectedTable(t)}
                                className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center shadow-lg transition-all transform hover:scale-105 active:scale-95 border-2 ${getStatusClasses(status)}`}
                            >
                                <span className="text-4xl font-black mb-1 opacity-90">{t.number}</span>
                                <span className="text-xs font-bold uppercase tracking-widest opacity-75">Стіл</span>
                                
                                {status === 'red' && <BellIcon className="absolute top-2 right-2 w-6 h-6 opacity-80" />}
                                {status === 'blue' && <BanknotesIcon className="absolute top-2 right-2 w-6 h-6 opacity-80" />}
                                {status === 'yellow' && <ClockIcon className="absolute top-2 right-2 w-6 h-6 opacity-80" />}
                            </button>
                        );
                    })}
                </div>
            )}"""

new_grid = """            {tables.length === 0 ? (
                <div className="text-slate-500">Немає доданих столів. Адміністратор має створити їх.</div>
            ) : (
                <div className="relative w-full aspect-[4/3] md:aspect-[16/9] bg-slate-100 dark:bg-slate-900 rounded-3xl overflow-hidden border-4 border-slate-200 dark:border-slate-800 shadow-inner">
                    {tables.map((t, i) => {
                        const status = getTableStatus(t.number);
                        // Якщо координати не задані адміном, розташовуємо плиткою
                        const posX = t.positionX ?? (10 + (i % 8) * 10);
                        const posY = t.positionY ?? (10 + Math.floor(i / 8) * 15);
                        
                        return (
                            <button 
                                key={t.id}
                                onClick={() => setSelectedTable(t)}
                                className={`absolute w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-all transform hover:scale-110 active:scale-95 border-2 ${getStatusClasses(status)}`}
                                style={{ 
                                    left: `${posX}%`, 
                                    top: `${posY}%`,
                                    transform: 'translate(-50%, -50%)',
                                }}
                            >
                                <span className="text-2xl sm:text-3xl font-black opacity-90">{t.number}</span>
                                
                                {status === 'red' && <BellIcon className="absolute -top-3 -right-3 w-8 h-8 bg-white dark:bg-slate-800 rounded-full p-1 text-red-500 shadow-md animate-bounce" />}
                                {status === 'blue' && <BanknotesIcon className="absolute -top-3 -right-3 w-8 h-8 bg-white dark:bg-slate-800 rounded-full p-1 text-blue-500 shadow-md" />}
                                {status === 'yellow' && <ClockIcon className="absolute -top-3 -right-3 w-8 h-8 bg-white dark:bg-slate-800 rounded-full p-1 text-amber-500 shadow-md" />}
                            </button>
                        );
                    })}
                </div>
            )}"""

content = content.replace(old_grid, new_grid)

with open('frontend/src/pages/WaiterBoard.tsx', 'w') as f:
    f.write(content)

