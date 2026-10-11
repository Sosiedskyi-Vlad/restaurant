import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { getStompClient, onWsConnect } from '../ws';
import { 
    CheckIcon, 
    XMarkIcon, 
    BellIcon, 
    BanknotesIcon, 
    ClockIcon, 
    MapIcon, 
    ListBulletIcon 
} from '@heroicons/react/24/outline';
import { ZONES, HallElementItem } from './AdminTables';

export default function WaiterBoard() {
    const [tables, setTables] = useState<any[]>([]);
    const [calls, setCalls] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [hallElements, setHallElements] = useState<HallElementItem[]>([]);
    const [currentZone, setCurrentZone] = useState('MAIN');
    const [selectedTable, setSelectedTable] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    
    const loadData = async () => {
        try {
            const [tRes, cRes, oRes, elRes] = await Promise.all([
                api.get('/tables'),
                api.get('/service-calls/active'),
                api.get('/orders/active'),
                api.get('/hall-elements')
            ]);
            setTables(tRes.data.sort((a: any, b: any) => a.number - b.number));
            setCalls(cRes.data);
            setOrders(oRes.data);
            setHallElements(elRes.data);
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

    const getTableCallMinutes = (tableNum: number) => {
        const tableCalls = calls.filter(c => c.tableNumber === tableNum);
        if (tableCalls.length === 0) return null;
        const earliest = Math.min(...tableCalls.map(c => new Date(c.createdAt).getTime()));
        const diffMinutes = Math.floor((Date.now() - earliest) / 60000);
        return diffMinutes <= 0 ? '<1 хв' : `${diffMinutes} хв`;
    };

    const getStatusClasses = (status: string) => {
        switch(status) {
            case 'red': 
                return 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/50 animate-pulse border-red-300 ring-4 ring-red-400/40';
            case 'blue': 
                return 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/40 border-blue-400 ring-2 ring-blue-400/30';
            case 'yellow': 
                return 'bg-amber-400 hover:bg-amber-500 text-amber-950 shadow-amber-400/40 border-amber-300';
            case 'green': 
                return 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30 border-emerald-400';
            default: 
                return 'bg-slate-700 text-white border-slate-600';
        }
    };

    const zoneTables = tables.filter(t => (t.zone || 'MAIN') === currentZone);
    const zoneElements = hallElements.filter(el => (el.zone || 'MAIN') === currentZone);

    const getZoneCallCount = (zoneId: string) => {
        const zoneTableNumbers = new Set(tables.filter(t => (t.zone || 'MAIN') === zoneId).map(t => t.number));
        return calls.filter(c => zoneTableNumbers.has(c.tableNumber)).length;
    };

    const tableOrders = selectedTable ? orders.filter(o => o.tableNumber === selectedTable.number) : [];
    const tableCalls = selectedTable ? calls.filter(c => c.tableNumber === selectedTable.number) : [];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header: Title and View Switcher */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Карта залу та виклики</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Моніторинг стану столів, замовлень та викликів офіціанта в реальному часі
                    </p>
                </div>
                
                <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                    <button 
                        onClick={() => setViewMode('map')} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                            viewMode === 'map' 
                                ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <MapIcon className="w-5 h-5"/> 2D Карта залу
                    </button>
                    <button 
                        onClick={() => setViewMode('list')} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                            viewMode === 'list' 
                                ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <ListBulletIcon className="w-5 h-5"/> Список викликів
                        {calls.length > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold ml-1 animate-pulse">
                                {calls.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {viewMode === 'map' ? (
                <>
                    {/* Zone Tabs & Legend */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                            {ZONES.map(z => {
                                const callCount = getZoneCallCount(z.id);
                                return (
                                    <button
                                        key={z.id}
                                        onClick={() => setSelectedTable(null) || setCurrentZone(z.id)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                            currentZone === z.id
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {z.name}
                                        {callCount > 0 && (
                                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-bounce shadow">
                                                🔔 {callCount}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Status Legend */}
                        <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Вільний
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-amber-400"></div> Є замовлення
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-blue-600"></div> Рахунок
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping"></div>
                                <div className="w-3 h-3 rounded-full bg-red-500 -ml-4.5"></div> Виклик!
                            </div>
                        </div>
                    </div>

                    {/* Interactive 2D Map Canvas */}
                    <div className="relative w-full aspect-[4/3] md:aspect-[16/9] bg-slate-950 rounded-3xl overflow-hidden border-4 border-slate-800 shadow-2xl select-none"
                         style={{ 
                             backgroundImage: `
                                 radial-gradient(circle, rgba(255, 255, 255, 0.07) 1.5px, transparent 1.5px),
                                 linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                                 linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
                             `,
                             backgroundSize: '30px 30px, 60px 60px, 60px 60px'
                         }}
                    >
                        {/* Zone Watermark */}
                        <div className="absolute top-5 left-7 text-slate-800 text-3xl font-black tracking-widest uppercase pointer-events-none">
                            {ZONES.find(z => z.id === currentZone)?.name}
                        </div>

                        {/* Render Interior Decor, Walls and Cutouts */}
                        {zoneElements.map(el => {
                            const rot = el.rotation || 0;

                            // Зріз площі: на карті офіціанта це бездоганний зріз (колір фону сторінки + стіна по контуру)
                            // Без жодного зайвого тексту, смуг чи іконок!
                            if (el.type === 'VOID') {
                                return (
                                    <div
                                        key={el.id}
                                        className="absolute bg-slate-50 dark:bg-slate-900 border-4 border-slate-700 dark:border-slate-800 rounded-2xl pointer-events-none z-15"
                                        style={{
                                            left: `${el.positionX}%`,
                                            top: `${el.positionY}%`,
                                            width: `${el.width}%`,
                                            height: `${el.height}%`,
                                            transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                                        }}
                                    />
                                );
                            }

                            let bgStyle = 'bg-slate-900/90 border-slate-700 text-slate-300';
                            let icon = '🧱';

                            if (el.type === 'WALL') {
                                bgStyle = 'bg-slate-700 border-slate-500 text-slate-200 shadow-md';
                                icon = '';
                            } else if (el.type === 'BAR') {
                                bgStyle = 'bg-amber-950/70 border-amber-600/60 text-amber-200';
                                icon = '🍸';
                            } else if (el.type === 'KITCHEN') {
                                bgStyle = 'bg-emerald-950/70 border-emerald-600/60 text-emerald-200';
                                icon = '🍳';
                            } else if (el.type === 'ENTRANCE') {
                                bgStyle = 'bg-blue-950/70 border-blue-500/60 text-blue-200 border-dashed';
                                icon = '🚪';
                            } else if (el.type === 'WC') {
                                bgStyle = 'bg-purple-950/70 border-purple-600/60 text-purple-200';
                                icon = '🚻';
                            } else if (el.type === 'PLANT') {
                                bgStyle = 'bg-teal-950/70 border-teal-600/60 text-teal-200';
                                icon = '🌿';
                            }

                            return (
                                <div
                                    key={el.id}
                                    className={`absolute border-2 rounded-xl flex items-center justify-center gap-1.5 backdrop-blur-sm shadow-md pointer-events-none ${bgStyle}`}
                                    style={{
                                        left: `${el.positionX}%`,
                                        top: `${el.positionY}%`,
                                        width: `${el.width}%`,
                                        height: `${el.height}%`,
                                        transform: `translate(-50%, -50%) rotate(${rot}deg)`
                                    }}
                                >
                                    {icon && <span className="text-sm">{icon}</span>}
                                    <span className="font-bold text-[11px] tracking-wide truncate max-w-[85%] opacity-90">
                                        {el.name}
                                    </span>
                                </div>
                            );
                        })}

                        {/* Render Interactive Tables */}
                        {zoneTables.map((t, i) => {
                            const status = getTableStatus(t.number);
                            const callMinutes = getTableCallMinutes(t.number);
                            const posX = t.positionX ?? (12 + (i % 6) * 14);
                            const posY = t.positionY ?? (15 + Math.floor(i / 6) * 20);
                            const shape = t.shape || 'SQUARE';
                            const seats = t.seats || 4;
                            const rot = t.rotation || 0;

                            let shapeClasses = 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl';
                            if (shape === 'ROUND') {
                                shapeClasses = 'w-16 h-16 sm:w-20 sm:h-20 rounded-full';
                            } else if (shape === 'RECTANGLE') {
                                shapeClasses = 'w-24 h-14 sm:w-28 sm:h-16 rounded-2xl';
                            }

                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTable(t)}
                                    className={`absolute flex flex-col items-center justify-center shadow-xl transition-all transform hover:scale-110 active:scale-95 border-2 ${shapeClasses} ${getStatusClasses(status)}`}
                                    style={{
                                        left: `${posX}%`,
                                        top: `${posY}%`,
                                        transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                                        zIndex: status === 'red' ? 30 : 20
                                    }}
                                    title={`Стіл ${t.number} (${seats} місць)`}
                                >
                                    {/* Number and seats */}
                                    <span className="text-xl sm:text-2xl font-black leading-none drop-shadow-sm select-none">
                                        {t.number}
                                    </span>
                                    <span className="text-[10px] font-bold opacity-80 mt-0.5 select-none">
                                        👥 {seats}
                                    </span>

                                    {/* Status Badges */}
                                    {status === 'red' && (
                                        <div className="absolute -top-3 -right-3 flex items-center">
                                            <BellIcon className="w-8 h-8 bg-red-600 rounded-full p-1.5 text-white shadow-lg animate-bounce border-2 border-white dark:border-slate-900" />
                                            {callMinutes && (
                                                <span className="absolute -bottom-4 right-0 bg-red-950 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow whitespace-nowrap">
                                                    {callMinutes}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {status === 'blue' && (
                                        <div className="absolute -top-3 -right-3">
                                            <BanknotesIcon className="w-8 h-8 bg-blue-600 rounded-full p-1.5 text-white shadow-lg border-2 border-white dark:border-slate-900" />
                                        </div>
                                    )}
                                    {status === 'yellow' && (
                                        <div className="absolute -top-3 -right-3">
                                            <ClockIcon className="w-7 h-7 bg-amber-500 rounded-full p-1.5 text-amber-950 shadow-md border-2 border-white dark:border-slate-900" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}

                        {zoneTables.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-base font-semibold">
                                У зоні «{ZONES.find(z => z.id === currentZone)?.name}» ще немає доданих столів.
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* List View of Active Calls */
                <div className="space-y-4 max-w-3xl">
                    {calls.length === 0 && (
                        <div className="text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 p-8 rounded-3xl text-center">
                            Всі виклики оброблено! Активних запитів немає. 🎉
                        </div>
                    )}
                    {calls.map((c: any) => {
                        const targetTable = tables.find(t => t.number === c.tableNumber);
                        const zoneObj = ZONES.find(z => z.id === (targetTable?.zone || 'MAIN')) || ZONES[0];
                        return (
                            <div 
                                key={c.id} 
                                className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center transition-colors"
                            >
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div className="font-bold text-2xl text-slate-900 dark:text-white tracking-tight">
                                            Стіл {c.tableNumber}
                                        </div>
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                            {zoneObj.name}
                                        </span>
                                    </div>
                                    
                                    <div className="text-slate-700 dark:text-slate-300 font-medium text-lg flex items-center gap-3 mt-1.5">
                                        {c.type === 'WAITER' ? '👋 Просить підійти' : '💳 Просить рахунок'}
                                        <span className="text-sm text-slate-400 dark:text-slate-500 font-normal">
                                            {new Date(c.createdAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => resolveCall(c.id)} 
                                    className="bg-emerald-500 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-md flex items-center gap-2"
                                >
                                    <CheckIcon className="w-5 h-5"/> Оброблено
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal for Table Details */}
            {selectedTable && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                                    Стіл №{selectedTable.number}
                                </h2>
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-1">
                                    {ZONES.find(z => z.id === (selectedTable.zone || 'MAIN'))?.name} • {selectedTable.seats || 4} посадкових місць
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedTable(null)} 
                                className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                            </button>
                        </div>

                        {/* Active Calls Section */}
                        {tableCalls.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-lg font-bold mb-3 text-slate-900 dark:text-white border-b pb-2 dark:border-slate-700">
                                    Активні виклики
                                </h3>
                                <div className="space-y-3">
                                    {tableCalls.map(c => (
                                        <div 
                                            key={c.id} 
                                            className={`p-4 rounded-2xl flex justify-between items-center ${
                                                c.type === 'WAITER' 
                                                    ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20' 
                                                    : 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {c.type === 'WAITER' ? (
                                                    <BellIcon className="w-6 h-6 text-red-500"/>
                                                ) : (
                                                    <BanknotesIcon className="w-6 h-6 text-blue-500"/>
                                                )}
                                                <div>
                                                    <div className={`font-bold ${c.type === 'WAITER' ? 'text-red-900 dark:text-red-400' : 'text-blue-900 dark:text-blue-400'}`}>
                                                        {c.type === 'WAITER' ? 'Просить підійти' : 'Просить рахунок'}
                                                    </div>
                                                    <div className="text-xs opacity-70">
                                                        {new Date(c.createdAt).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => resolveCall(c.id)} 
                                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-md"
                                            >
                                                Оброблено
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Active Orders Section */}
                        <div>
                            <h3 className="text-lg font-bold mb-3 text-slate-900 dark:text-white border-b pb-2 dark:border-slate-700">
                                Активні замовлення
                            </h3>
                            {tableOrders.length === 0 ? (
                                <p className="text-slate-500 italic text-sm">
                                    Немає активних замовлень за цим столом.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {tableOrders.map(o => (
                                        <div key={o.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                                    Час: {new Date(o.createdAt).toLocaleTimeString()}
                                                </span>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                    o.status === 'NEW' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300' :
                                                    o.status === 'PREPARING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' :
                                                    o.status === 'READY' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-slate-200'
                                                }`}>
                                                    {o.status}
                                                </span>
                                            </div>
                                            <ul className="space-y-2 mb-3">
                                                {o.items.map((i: any, idx: number) => {
                                                    let optsDisplay = '';
                                                    if (i.selectedOptions) {
                                                        try {
                                                            const parsed = JSON.parse(i.selectedOptions);
                                                            const optList = Object.values(parsed).flat().filter(Boolean);
                                                            if (optList.length > 0) optsDisplay = '(' + optList.join(', ') + ')';
                                                        } catch (e) {}
                                                    }
                                                    return (
                                                        <li key={idx} className="flex justify-between text-sm">
                                                            <div className="flex-1">
                                                                <span className="font-bold">{i.quantity}x</span> {i.name}
                                                                {optsDisplay && (
                                                                    <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium ml-5">
                                                                        {optsDisplay}
                                                                    </div>
                                                                )}
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
