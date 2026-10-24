import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import { getStompClient, onWsConnect } from '../ws';
import { 
    CheckIcon, 
    XMarkIcon, 
    BellIcon, 
    BanknotesIcon, 
    ClockIcon, 
    MapIcon, 
    ListBulletIcon,
    FireIcon,
    CheckCircleIcon,
    UsersIcon,
    TagIcon,
    HandRaisedIcon,
    CreditCardIcon
} from '@heroicons/react/24/outline';
import { Wine, ChefHat, DoorOpen, Bath, Trees } from 'lucide-react';
import { ZONES, HallElementItem } from './AdminTables';

export default function WaiterBoard() {
    const [tables, setTables] = useState<any[]>([]);
    const [calls, setCalls] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [hallElements, setHallElements] = useState<HallElementItem[]>([]);
    const [currentZone, setCurrentZone] = useState('MAIN');
    const [selectedTable, setSelectedTable] = useState<any>(null);
    const [availablePromos, setAvailablePromos] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    
    const fetchActiveCalls = () => api.get('/service-calls/active').then(res => setCalls(res.data)).catch(() => {});
    const fetchActiveOrders = () => api.get('/orders/active').then(res => setOrders(res.data)).catch(() => {});

    const upsertOrRemoveOrder = (updatedOrder: any) => {
        if (!updatedOrder || !updatedOrder.id) return;
        setOrders(prev => {
            if (updatedOrder.status === 'PAID') {
                return prev.filter(o => o.id !== updatedOrder.id);
            }
            const exists = prev.some(o => o.id === updatedOrder.id);
            if (exists) {
                return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
            }
            return [...prev, updatedOrder];
        });
    };

    const upsertOrRemoveCall = (type: string | undefined, callObj: any) => {
        if (!callObj || !callObj.id) return;
        setCalls(prev => {
            if (type === 'CALL_RESOLVED' || type === 'RESOLVED' || callObj.status === 'RESOLVED') {
                return prev.filter(c => c.id !== callObj.id);
            }
            const exists = prev.some(c => c.id === callObj.id);
            if (exists) {
                return prev.map(c => c.id === callObj.id ? callObj : c);
            }
            return [callObj, ...prev];
        });
    };

    const loadInitialData = async () => {
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
        loadInitialData();
        api.get('/promotions/active')
            .then(res => setAvailablePromos(res.data.filter((p: any) => p.discountPercent > 0)))
            .catch(() => {});
        const client = getStompClient();
        if (!client) return;
        const unsubConnect = onWsConnect(() => {
            client.subscribe('/topic/service-calls', (msg) => {
                if (msg?.body) {
                    try {
                        const data = JSON.parse(msg.body);
                        if (data?.call) {
                            upsertOrRemoveCall(data.type, data.call);
                            return;
                        }
                    } catch {}
                }
                fetchActiveCalls();
            });
            client.subscribe('/topic/kitchen', (msg) => {
                if (msg?.body) {
                    try {
                        const data = JSON.parse(msg.body);
                        if (data?.order) {
                            upsertOrRemoveOrder(data.order);
                            return;
                        }
                    } catch {}
                }
                fetchActiveOrders();
            });
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
        const res = await api.patch(`/service-calls/${id}/resolve`);
        upsertOrRemoveCall('CALL_RESOLVED', res.data || { id, status: 'RESOLVED' });
        window.dispatchEvent(new Event('refresh-badges'));
    };

    const updateOrderStatus = async (id: string, target: string) => {
        try {
            const res = await api.patch(`/orders/${id}/status`, { status: target });
            upsertOrRemoveOrder(res.data);
            window.dispatchEvent(new Event('refresh-badges'));
        } catch (e: any) {
            alert(e.response?.data?.message || 'Помилка оновлення статусу');
        }
    };

    const handleApplyPromotion = async (orderId: string, promotionId: string | null) => {
        try {
            const res = await api.post(`/orders/${orderId}/apply-promotion`, { promotionId });
            upsertOrRemoveOrder(res.data);
        } catch (e: any) {
            alert(e.response?.data?.message || 'Помилка зміни знижки');
        }
    };

    const updateItemStatus = async (orderId: string, itemId: string, target: string) => {
        try {
            const res = await api.patch(`/orders/${orderId}/items/${itemId}/status`, { status: target });
            upsertOrRemoveOrder(res.data);
            window.dispatchEvent(new Event('refresh-badges'));
        } catch (e: any) {
            alert(e.response?.data?.message || 'Помилка оновлення статусу страви');
        }
    };

    const getTableStatus = (tableNum: number) => {
        const tableCalls = calls.filter(c => c.tableNumber === tableNum);
        const hasWaiterCall = tableCalls.some(c => c.type === 'WAITER');
        const hasBillCall = tableCalls.some(c => c.type === 'BILL');
        const tableOrders = orders.filter(o => o.tableNumber === tableNum);
        const readyItemsCount = tableOrders.reduce((sum, o) => 
            sum + (o.items?.filter((i: any) => i.status === 'READY').length || 0), 0
        );
        const hasReadyFood = tableOrders.some(o => o.status === 'READY') || readyItemsCount > 0;

        if (hasWaiterCall) return 'red';
        if (hasBillCall) return 'blue';
        if (hasReadyFood) return 'orange';
        if (tableOrders.length > 0) return 'yellow';
        return 'green';
    };

    const getStatusClasses = (status: string) => {
        switch(status) {
            case 'red': 
                return 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg border-rose-300 ring-4 ring-rose-500/35';
            case 'blue': 
                return 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg border-blue-300 ring-2 ring-blue-400/30';
            case 'orange':
                return 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg border-amber-200 ring-4 ring-amber-400/40';
            case 'yellow': 
                return 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 border-amber-500/60 shadow-md';
            case 'green': 
                return 'bg-slate-800/90 hover:bg-slate-800 text-slate-200 border-emerald-500/50 shadow-sm';
            default: 
                return 'bg-slate-800 text-white border-slate-600';
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
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Карта залу та виклики</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Моніторинг посадки, активних рахунків та викликів персоналу в реальному часі
                    </p>
                </div>
                
                <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button 
                        onClick={() => setViewMode('map')} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${
                            viewMode === 'map' 
                                ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-white' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                        <MapIcon className="w-4 h-4"/> 2D Карта залу
                    </button>
                    <button 
                        onClick={() => setViewMode('list')} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${
                            viewMode === 'list' 
                                ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-white' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                        <ListBulletIcon className="w-4 h-4"/> Список викликів
                        {calls.length > 0 && (
                            <span className="bg-rose-600 text-white text-xs px-2 py-0.5 rounded-full font-bold ml-1">
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
                        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                            {ZONES.map(z => {
                                const callCount = getZoneCallCount(z.id);
                                return (
                                    <button
                                        key={z.id}
                                        onClick={() => { setSelectedTable(null); setCurrentZone(z.id); }}
                                        className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                                            currentZone === z.id
                                                ? 'bg-stone-900 text-white dark:bg-amber-600 shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <span>{z.name}</span>
                                        {callCount > 0 && (
                                            <span className="bg-rose-600 text-white text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                <BellIcon className="w-3 h-3 stroke-2" />
                                                <span>{callCount}</span>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Status Legend */}
                        <div className="flex flex-wrap gap-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/90 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Вільний
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Зайнятий (готується)
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-400/40"></span> Готово до виносу
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Просить рахунок
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 -ml-4"></span> Виклик офіціанта
                            </div>
                        </div>
                    </div>

                    {/* Interactive 2D Map Canvas */}
                    <div className="relative w-full aspect-[4/3] md:aspect-[16/9] rounded-2xl select-none shadow-lg border border-slate-800 overflow-hidden">
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" width="100%" height="100%">
                            <defs>
                                <mask id={`hall-mask-${currentZone}`} maskContentUnits="objectBoundingBox">
                                    <rect x="0" y="0" width="1" height="1" fill="white" />
                                    {zoneElements.filter(el => el.type === 'VOID').map(el => (
                                        <rect
                                            key={el.id}
                                            x={(el.positionX - el.width / 2) / 100}
                                            y={(el.positionY - el.height / 2) / 100}
                                            width={el.width / 100}
                                            height={el.height / 100}
                                            rx="0.02"
                                            ry="0.035"
                                            fill="black"
                                            transform={el.rotation ? `rotate(${el.rotation} ${el.positionX / 100} ${el.positionY / 100})` : undefined}
                                        />
                                    ))}
                                </mask>
                                <pattern id={`grid-dots-${currentZone}`} width="30" height="30" patternUnits="userSpaceOnUse">
                                    <circle cx="2" cy="2" r="1.2" fill="rgba(255, 255, 255, 0.07)" />
                                </pattern>
                            </defs>
                            <rect 
                                width="100%" 
                                height="100%" 
                                fill="#0c0a09" 
                                mask={zoneElements.some(el => el.type === 'VOID') ? `url(#hall-mask-${currentZone})` : undefined} 
                            />
                            <rect 
                                width="100%" 
                                height="100%" 
                                fill={`url(#grid-dots-${currentZone})`} 
                                mask={zoneElements.some(el => el.type === 'VOID') ? `url(#hall-mask-${currentZone})` : undefined} 
                            />
                        </svg>

                        {/* Zone Watermark */}
                        <div className="absolute top-4 left-6 text-stone-800 text-2xl font-black tracking-widest uppercase pointer-events-none">
                            {ZONES.find(z => z.id === currentZone)?.name}
                        </div>

                        {/* Render Interior Decor & Walls */}
                        {zoneElements.filter(el => el.type !== 'VOID').map(el => {
                            const rot = el.rotation || 0;

                            let bgStyle = 'bg-stone-900/90 border-stone-700 text-stone-300';
                            let IconComp: any = null;

                            if (el.type === 'WALL') {
                                bgStyle = 'bg-stone-700 border-stone-500 text-stone-200 shadow-sm';
                            } else if (el.type === 'BAR') {
                                bgStyle = 'bg-amber-950/70 border-amber-600/60 text-amber-200';
                                IconComp = Wine;
                            } else if (el.type === 'KITCHEN') {
                                bgStyle = 'bg-emerald-950/70 border-emerald-600/60 text-emerald-200';
                                IconComp = ChefHat;
                            } else if (el.type === 'ENTRANCE') {
                                bgStyle = 'bg-blue-950/70 border-blue-500/60 text-blue-200 border-dashed';
                                IconComp = DoorOpen;
                            } else if (el.type === 'WC') {
                                bgStyle = 'bg-purple-950/70 border-purple-600/60 text-purple-200';
                                IconComp = Bath;
                            } else if (el.type === 'PLANT') {
                                bgStyle = 'bg-teal-950/70 border-teal-600/60 text-teal-200';
                                IconComp = Trees;
                            }

                            return (
                                <div
                                    key={el.id}
                                    className={`absolute flex items-center justify-center rounded-xl border select-none pointer-events-none backdrop-blur-xs ${bgStyle}`}
                                    style={{
                                        left: `${el.positionX}%`,
                                        top: `${el.positionY}%`,
                                        width: `${el.width}%`,
                                        height: `${el.height}%`,
                                        transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                                        zIndex: 5
                                    }}
                                >
                                    {el.type !== 'WALL' && (
                                        <div 
                                            className="flex items-center justify-center gap-1.5 max-w-full px-1.5"
                                            style={{ transform: `rotate(${-rot}deg)` }}
                                        >
                                            {IconComp && <IconComp className="w-3.5 h-3.5 shrink-0 opacity-85" />}
                                            <span className="font-bold text-[11px] tracking-wide truncate opacity-90">
                                                {el.name}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Render Interactive Informative Tables */}
                        {zoneTables.map((t, i) => {
                            const status = getTableStatus(t.number);
                            const posX = t.positionX ?? (12 + (i % 6) * 14);
                            const posY = t.positionY ?? (15 + Math.floor(i / 6) * 20);
                            const shape = (t.shape === 'ROUND' ? 'SQUARE' : t.shape) || 'SQUARE';
                            const seats = t.seats || 4;
                            const rot = t.rotation || 0;
                            const isVertical = shape === 'RECTANGLE' && (rot % 180 === 90 || rot % 180 === 270);

                            const tCalls = calls.filter(c => c.tableNumber === t.number);
                            const tOrders = orders.filter(o => o.tableNumber === t.number);
                            const totalBill = tOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
                            const readyItemsCount = tOrders.reduce((sum, o) => 
                                sum + (o.items?.filter((item: any) => item.status === 'READY').length || 0), 0
                            );

                            const earliestOrderTime = tOrders.length > 0 
                                ? Math.min(...tOrders.map(o => new Date(o.createdAt).getTime()))
                                : null;
                            const orderMinutes = earliestOrderTime 
                                ? Math.max(0, Math.floor((Date.now() - earliestOrderTime) / 60000))
                                : null;

                            const earliestCallTime = tCalls.length > 0 
                                ? Math.min(...tCalls.map(c => new Date(c.createdAt).getTime()))
                                : null;
                            const callMinutes = earliestCallTime 
                                ? Math.max(0, Math.floor((Date.now() - earliestCallTime) / 60000))
                                : null;
                            const callDurationStr = callMinutes !== null ? (callMinutes <= 0 ? '<1 хв' : `${callMinutes} хв`) : null;

                            let shapeClasses = 'w-20 h-20 sm:w-24 sm:h-24 rounded-2xl';
                            if (shape === 'RECTANGLE') {
                                shapeClasses = isVertical 
                                    ? 'w-20 h-28 sm:w-24 sm:h-32 rounded-2xl'
                                    : 'w-28 h-20 sm:w-32 sm:h-24 rounded-2xl';
                            }

                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTable(t)}
                                    className={`absolute flex flex-col justify-between p-2.5 transition-all transform hover:scale-105 active:scale-95 border ${shapeClasses} ${getStatusClasses(status)}`}
                                    style={{
                                        left: `${posX}%`,
                                        top: `${posY}%`,
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: status === 'red' ? 30 : status === 'orange' ? 25 : 20
                                    }}
                                    title={`Стіл №${t.number} (${seats} місць)`}
                                >
                                    {/* Top row: Table number & seat count */}
                                    <div className="w-full flex items-center justify-between leading-none select-none">
                                        <span className="text-sm sm:text-base font-black tracking-tight">
                                            №{t.number}
                                        </span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/25 text-white/90 inline-flex items-center gap-0.5">
                                            <UsersIcon className="w-2.5 h-2.5" />
                                            <span>{seats}</span>
                                        </span>
                                    </div>

                                    {/* Bottom / Center: 1 clear primary status & metric */}
                                    <div className="w-full text-left leading-tight select-none mt-auto">
                                        {status === 'red' ? (
                                            <div>
                                                <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wide">
                                                    Кличе стіл
                                                </div>
                                                <div className="text-[10px] font-semibold opacity-90">
                                                    {callDurationStr || 'Щойно'}
                                                </div>
                                            </div>
                                        ) : status === 'blue' ? (
                                            <div>
                                                <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wide">
                                                    Рахунок
                                                </div>
                                                {totalBill > 0 && (
                                                    <div className="text-xs font-extrabold">
                                                        {totalBill} ₴
                                                    </div>
                                                )}
                                            </div>
                                        ) : status === 'orange' ? (
                                            <div>
                                                <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wide">
                                                    Готово ({readyItemsCount || 1})
                                                </div>
                                                {totalBill > 0 && (
                                                    <div className="text-[10px] font-bold opacity-85">
                                                        {totalBill} ₴
                                                    </div>
                                                )}
                                            </div>
                                        ) : status === 'yellow' ? (
                                            <div>
                                                <div className="text-xs font-extrabold text-amber-300">
                                                    {totalBill} ₴
                                                </div>
                                                <div className="text-[10px] font-medium text-amber-200/80">
                                                    {orderMinutes !== null ? `${orderMinutes} хв` : 'В роботі'}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                <span>Вільний</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Compact non-overlapping corner status badge */}
                                    {status === 'red' && (
                                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 rounded-full flex items-center justify-center text-white shadow-md border-2 border-stone-950">
                                            <BellIcon className="w-3.5 h-3.5 stroke-2" />
                                        </span>
                                    )}
                                    {status === 'blue' && (
                                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md border-2 border-stone-950">
                                            <BanknotesIcon className="w-3.5 h-3.5 stroke-2" />
                                        </span>
                                    )}
                                    {status === 'orange' && (
                                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-stone-950 shadow-md border-2 border-stone-950">
                                            <FireIcon className="w-3.5 h-3.5 stroke-2" />
                                        </span>
                                    )}
                                </button>
                            );
                        })}

                        {zoneTables.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-stone-500 text-sm font-semibold">
                                У зоні «{ZONES.find(z => z.id === currentZone)?.name}» ще немає доданих столів.
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* List View of Active Calls */
                <div className="space-y-3 max-w-3xl">
                    {calls.length === 0 && (
                        <div className="text-slate-500 font-medium bg-white dark:bg-slate-800 p-8 rounded-2xl text-center border border-slate-200 dark:border-slate-700">
                            Всі виклики оброблено. Активних запитів немає.
                        </div>
                    )}
                    {calls.map((c: any) => {
                        const targetTable = tables.find(t => t.number === c.tableNumber);
                        const zoneObj = ZONES.find(z => z.id === (targetTable?.zone || 'MAIN')) || ZONES[0];
                        return (
                            <div 
                                key={c.id} 
                                className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-700 flex justify-between items-center transition-colors"
                            >
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">
                                            Стіл №{c.tableNumber}
                                        </div>
                                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-stone-100 dark:bg-slate-700 text-stone-700 dark:text-slate-300">
                                            {zoneObj.name}
                                        </span>
                                    </div>
                                    
                                    <div className="text-slate-700 dark:text-slate-300 font-semibold text-sm flex items-center gap-2 mt-1.5">
                                        {c.type === 'WAITER' ? (
                                            <>
                                                <HandRaisedIcon className="w-4 h-4 text-rose-500" />
                                                <span>Просить підійти офіціанта</span>
                                            </>
                                        ) : (
                                            <>
                                                <CreditCardIcon className="w-4 h-4 text-blue-500" />
                                                <span>Просить рахунок</span>
                                            </>
                                        )}
                                        <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                                            • {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => resolveCall(c.id)} 
                                    className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-500 active:scale-95 transition-all shadow-xs flex items-center gap-2"
                                >
                                    <CheckIcon className="w-4 h-4 stroke-2"/> Виконано
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal for Table Details */}
            {selectedTable && createPortal(
                <div 
                    className="fixed inset-0 bg-slate-950/65 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-slideUpFade"
                    onClick={() => setSelectedTable(null)}
                >
                    <div 
                        className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                    Стіл №{selectedTable.number}
                                </h2>
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                                    {ZONES.find(z => z.id === (selectedTable.zone || 'MAIN'))?.name} • {selectedTable.seats || 4} посадкових місць
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedTable(null)} 
                                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                            </button>
                        </div>

                        {/* Active Calls Section */}
                        {tableCalls.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm font-bold uppercase tracking-wider mb-3 text-slate-500 dark:text-slate-400">
                                    Активні виклики
                                </h3>
                                <div className="space-y-2.5">
                                    {tableCalls.map(c => (
                                        <div 
                                            key={c.id} 
                                            className={`p-3.5 rounded-xl flex justify-between items-center ${
                                                c.type === 'WAITER' 
                                                    ? 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20' 
                                                    : 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {c.type === 'WAITER' ? (
                                                    <BellIcon className="w-5 h-5 text-rose-500"/>
                                                ) : (
                                                    <BanknotesIcon className="w-5 h-5 text-blue-500"/>
                                                )}
                                                <div>
                                                    <div className={`font-bold text-sm ${c.type === 'WAITER' ? 'text-rose-900 dark:text-rose-300' : 'text-blue-900 dark:text-blue-300'}`}>
                                                        {c.type === 'WAITER' ? 'Просить підійти' : 'Просить рахунок'}
                                                    </div>
                                                    <div className="text-xs opacity-70">
                                                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => resolveCall(c.id)} 
                                                className="bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-4 py-2 rounded-xl font-bold text-xs active:scale-95 transition-all shadow-xs"
                                            >
                                                Виконано
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Active Orders Section */}
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider mb-3 text-slate-500 dark:text-slate-400">
                                Активні замовлення
                            </h3>
                            {tableOrders.length === 0 ? (
                                <p className="text-slate-500 italic text-sm">
                                    Немає активних замовлень за цим столом.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {tableOrders.map(o => {
                                        const allItemsServed = o.items && o.items.length > 0 && o.items.every((i: any) => i.status === 'SERVED');
                                        const canCloseOrder = o.status === 'READY' || allItemsServed;

                                        return (
                                        <div key={o.id} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                                                    Прийнято о {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                                                        o.status === 'NEW' ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' :
                                                        o.status === 'PREPARING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' :
                                                        o.status === 'READY' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-slate-200'
                                                    }`}>
                                                        {o.status === 'NEW' ? 'Нове' : o.status === 'PREPARING' ? 'Готується' : o.status === 'READY' ? 'Готово до видачі' : o.status}
                                                    </span>
                                                    {canCloseOrder && (
                                                        <button
                                                            onClick={() => updateOrderStatus(o.id, 'PAID')}
                                                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95"
                                                            title="Позначити як видане гостям і закрити"
                                                        >
                                                            <CheckCircleIcon className="w-4 h-4"/> Закрити чек
                                                        </button>
                                                    )}
                                                </div>
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
                                                    const isItemReady = i.status === 'READY';
                                                    const isItemServed = i.status === 'SERVED';
                                                    const isItemPreparing = i.status === 'PREPARING';

                                                    return (
                                                        <li key={idx} className={`p-2.5 rounded-xl flex justify-between items-center text-sm border transition-all ${
                                                            isItemReady ? 'bg-amber-500/10 border-amber-500/40' :
                                                            isItemServed ? 'bg-slate-100/50 dark:bg-slate-800/40 border-transparent opacity-60' :
                                                            'border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800/40'
                                                        }`}>
                                                            <div className="flex-1 min-w-0 pr-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold shrink-0">{i.quantity}×</span> 
                                                                    <span className={`truncate ${isItemServed ? 'line-through text-slate-400 dark:text-slate-500' : 'font-semibold text-slate-900 dark:text-white'}`}>{i.name}</span>
                                                                </div>
                                                                {optsDisplay && (
                                                                    <div className="text-xs text-amber-700 dark:text-amber-400 font-medium ml-5 truncate">
                                                                        {optsDisplay}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <div className="text-slate-500 font-semibold text-xs">{i.priceAtTime} ₴</div>
                                                                {isItemReady && (
                                                                    <button
                                                                        onClick={() => updateItemStatus(o.id, i.id, 'SERVED')}
                                                                        className="flex items-center gap-1 bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs active:scale-95 transition-all"
                                                                        title="Позначити, що страву винесено гостю"
                                                                    >
                                                                        <CheckIcon className="w-3.5 h-3.5 stroke-2"/> Винести
                                                                    </button>
                                                                )}
                                                                {isItemServed && (
                                                                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                                                                        Подано
                                                                    </span>
                                                                )}
                                                                {isItemPreparing && (
                                                                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 dark:bg-amber-950/60 dark:text-amber-400 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                                                        <ClockIcon className="w-3 h-3" /> Готується
                                                                    </span>
                                                                )}
                                                                {(!i.status || i.status === 'NEW') && (
                                                                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/70 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                                                                        В черзі
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3 flex flex-col gap-2">
                                                {o.discountAmount > 0 ? (
                                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <TagIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                                                            <span className="text-emerald-800 dark:text-emerald-300 font-bold truncate">
                                                                {o.appliedPromotionTitle}
                                                            </span>
                                                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                                                                (-{o.discountAmount} ₴)
                                                            </span>
                                                        </div>
                                                        {!o.paid && (
                                                            <button
                                                                onClick={() => handleApplyPromotion(o.id, null)}
                                                                className="text-slate-400 hover:text-red-500 font-semibold px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors ml-2 shrink-0"
                                                                title="Скасувати знижку"
                                                            >
                                                                Скасувати
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    !o.paid && availablePromos.length > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] text-slate-400 font-bold shrink-0">Акція / знижка:</span>
                                                            <div className="flex flex-wrap gap-1.5 flex-1">
                                                                {availablePromos.map((promo: any) => (
                                                                    <button
                                                                        key={promo.id}
                                                                        onClick={() => handleApplyPromotion(o.id, promo.id)}
                                                                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-all active:scale-95 inline-flex items-center gap-1"
                                                                        title={`Застосувати знижку ${promo.discountPercent}%`}
                                                                    >
                                                                        <TagIcon className="w-3.5 h-3.5" />
                                                                        <span>{promo.title} (-{promo.discountPercent}%)</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )
                                                )}

                                                <div className="flex items-baseline justify-between pt-1">
                                                    {o.discountAmount > 0 ? (
                                                        <div className="text-xs text-slate-400">
                                                            Сума страв: <span className="line-through">{o.subtotal || (Number(o.total) + Number(o.discountAmount))} ₴</span>
                                                        </div>
                                                    ) : <div />}
                                                    <div className="text-right">
                                                        <span className="text-xs text-slate-400 mr-2">До оплати:</span>
                                                        <span className="font-black text-xl text-slate-900 dark:text-white">
                                                            {o.total} ₴
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                    })}
                                </div>
                            )}
                        </div>

                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
