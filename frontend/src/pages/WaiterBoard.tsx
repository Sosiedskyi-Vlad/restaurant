import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { getStompClient, onWsConnect } from '../ws';
import { CheckIcon, XMarkIcon, BellIcon, BanknotesIcon, ClockIcon, MapIcon, ListBulletIcon } from '@heroicons/react/24/outline';

export default function WaiterBoard() {
    const [tables, setTables] = useState<any[]>([]);
    const [calls, setCalls] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedTable, setSelectedTable] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    
    const loadData = async () => {
        try {
            const [tRes, cRes, oRes] = await Promise.all([
                api.get('/tables'),
                api.get('/service-calls/active'),
                api.get('/orders/active')
            ]);
            // Sort tables by number
            setTables(tRes.data.sort((a:any, b:any) => a.number - b.number));
            setCalls(cRes.data);
            setOrders(oRes.data);
        } catch (e) {
            console.error("Failed to load Waiter Board data", e);
        }
    };
    
    useEffect(() => {
        loadData();
        const client = getStompClient();
        if (!client) return;
        const unsubConnect = onWsConnect(() => {
            client.subscribe('/topic/service-calls', () => loadData());
            client.subscribe('/topic/kitchen', () => loadData());
        });
        return () => { 
            unsubConnect(); 
            if (client.connected) {
                client.unsubscribe('/topic/service-calls');
                client.unsubscribe('/topic/kitchen');
            }
        };
    }, []);

    const resolveCall = async (id: string) => {
        await api.patch(`/service-calls/${id}/resolve`);
        loadData();
        window.dispatchEvent(new Event('refresh-badges'));
    };

    const getTableStatus = (tableNum: number) => {
        const tableCalls = calls.filter(c => c.tableNumber === tableNum);
        const hasWaiterCall = tableCalls.some(c => c.type === 'WAITER');
        const hasBillCall = tableCalls.some(c => c.type === 'BILL');
        const tableOrders = orders.filter(o => o.tableNumber === tableNum);

        if (hasWaiterCall) return 'red';
        if (hasBillCall) return 'blue';
        if (tableOrders.length > 0) return 'yellow';
        return 'green';
    };

    const getStatusClasses = (status: string) => {
        switch(status) {
            case 'red': return 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/40 animate-pulse border-red-400';
            case 'blue': return 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/40 border-blue-400';
            case 'yellow': return 'bg-amber-400 hover:bg-amber-500 text-amber-950 shadow-amber-400/40 border-amber-300';
            case 'green': return 'bg-emerald-400 hover:bg-emerald-500 text-emerald-950 shadow-emerald-400/40 border-emerald-300';
            default: return 'bg-slate-200 text-slate-800';
        }
    };

    const tableOrders = selectedTable ? orders.filter(o => o.tableNumber === selectedTable.number) : [];
    const tableCalls = selectedTable ? calls.filter(c => c.tableNumber === selectedTable.number) : [];

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
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

                    {tables.length === 0 ? (
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

            {/* Modal */}
            {selectedTable && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Стіл {selectedTable.number}</h2>
                            <button onClick={() => setSelectedTable(null)} className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors">
                                <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                            </button>
                        </div>

                        {tableCalls.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-lg font-bold mb-3 text-slate-900 dark:text-white border-b pb-2 dark:border-slate-700">Активні виклики</h3>
                                <div className="space-y-3">
                                    {tableCalls.map(c => (
                                        <div key={c.id} className={`p-4 rounded-2xl flex justify-between items-center ${c.type === 'WAITER' ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20' : 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20'}`}>
                                            <div className="flex items-center gap-3">
                                                {c.type === 'WAITER' ? <BellIcon className="w-6 h-6 text-red-500"/> : <BanknotesIcon className="w-6 h-6 text-blue-500"/>}
                                                <div>
                                                    <div className={`font-bold ${c.type==='WAITER'?'text-red-900 dark:text-red-400':'text-blue-900 dark:text-blue-400'}`}>
                                                        {c.type === 'WAITER' ? 'Просить підійти' : 'Просить рахунок'}
                                                    </div>
                                                    <div className="text-xs opacity-70">{new Date(c.createdAt).toLocaleTimeString()}</div>
                                                </div>
                                            </div>
                                            <button onClick={() => resolveCall(c.id)} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all">
                                                Оброблено
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-lg font-bold mb-3 text-slate-900 dark:text-white border-b pb-2 dark:border-slate-700">Активні замовлення</h3>
                            {tableOrders.length === 0 ? (
                                <p className="text-slate-500 italic">Немає активних замовлень.</p>
                            ) : (
                                <div className="space-y-4">
                                    {tableOrders.map(o => (
                                        <div key={o.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="font-bold text-slate-900 dark:text-white">Час: {new Date(o.createdAt).toLocaleTimeString()}</span>
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    o.status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                                                    o.status === 'PREPARING' ? 'bg-amber-100 text-amber-800' :
                                                    o.status === 'READY' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200'
                                                }`}>
                                                    {o.status}
                                                </span>
                                            </div>
                                            <ul className="space-y-2 mb-3">
                                                {o.items.map((i:any, idx:number) => {
                                                    let optsDisplay = '';
                                                    if (i.selectedOptions) {
                                                        try {
                                                            const parsed = JSON.parse(i.selectedOptions);
                                                            const optList = Object.values(parsed).flat().filter(Boolean);
                                                            if (optList.length > 0) optsDisplay = '(' + optList.join(', ') + ')';
                                                        } catch(e) {}
                                                    }
                                                    return (
                                                        <li key={idx} className="flex justify-between text-sm">
                                                            <div className="flex-1">
                                                                <span className="font-bold">{i.quantity}x</span> {i.name}
                                                                {optsDisplay && <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium ml-5">{optsDisplay}</div>}
                                                            </div>
                                                            <div className="text-slate-500 font-medium">{i.priceAtTime} ₴</div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                            <div className="text-right font-black text-lg border-t border-slate-200 dark:border-slate-700 pt-2">
                                                {o.total} ₴
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
