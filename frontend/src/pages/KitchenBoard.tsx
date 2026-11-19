import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import { getStompClient, onWsConnect } from '../ws';
import { 
    CheckCircleIcon, 
    PlayIcon, 
    FireIcon, 
    ClockIcon, 
    CheckIcon, 
    ArrowUturnLeftIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
    InformationCircleIcon
} from '@heroicons/react/24/solid';
import { Utensils, ChefHat, Coffee, SlidersHorizontal } from 'lucide-react';

interface SlaStatus {
    level: 'normal' | 'warning' | 'danger';
    mins: number;
    secs: number;
    formatted: string;
    badgeClass: string;
    cardBorder: string;
    label: string;
}

interface KdsMetrics {
    activeOrders: number;
    preparingOrders: number;
    readyOrders: number;
    completedToday: number;
    delayedOrders: number;
    avgCookingMinutesToday: number | null;
    totalDishesToday: number;
}

export function isBarItem(item: any): boolean {
    const cat = (item.categoryName || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    const barKeywords = [
        'напої', 'напій', 'бар', 'кава', 'чай', 'коктейл', 'лимонад', 'мохіто',
        'лате', 'капучино', 'еспресо', 'матча', 'фреш', 'сік', 'соки', 'вода',
        'пиво', 'вино', 'американо', 'раф', 'глясе', 'смузі', 'шот', 'лонг', 'drink', 'bar', 'coffee'
    ];
    return barKeywords.some(kw => cat.includes(kw) || name.includes(kw));
}

function getSlaInfo(createdAt: string, now: number): SlaStatus {
    const createdTime = new Date(createdAt).getTime();
    const elapsedSec = Math.max(0, Math.floor((now - createdTime) / 1000));
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    const formatted = `${mins > 0 ? `${mins} хв ` : ''}${secs < 10 ? '0' : ''}${secs} с`;

    if (mins >= 20) {
        return {
            level: 'danger',
            mins,
            secs,
            formatted,
            badgeClass: 'bg-red-600 text-white border-red-600',
            cardBorder: 'border-red-500/80 dark:border-red-500/70 shadow-md ring-2 ring-red-500/20',
            label: 'Критична затримка (> 20 хв)'
        };
    } else if (mins >= 10) {
        return {
            level: 'warning',
            mins,
            secs,
            formatted,
            badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40',
            cardBorder: 'border-amber-400/70 dark:border-amber-500/40 shadow-sm',
            label: 'Потребує уваги (10–20 хв)'
        };
    } else {
        return {
            level: 'normal',
            mins,
            secs,
            formatted,
            badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
            cardBorder: 'border-slate-200 dark:border-slate-700/70 shadow-sm',
            label: 'В межах норми (< 10 хв)'
        };
    }
}

export default function KitchenBoard({ role }: { role: string }) {
    const [orders, setOrders] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<KdsMetrics | null>(null);
    const [now, setNow] = useState<number>(Date.now());
    const [stationFilter, setStationFilter] = useState<'ALL' | 'KITCHEN' | 'BAR'>('ALL');

    const [showRecentClosed, setShowRecentClosed] = useState(false);
    const [recentClosedOrders, setRecentClosedOrders] = useState<any[]>([]);
    const [recallingId, setRecallingId] = useState<string | null>(null);

    const canCook = role === 'ROLE_COOK' || role === 'ROLE_ADMIN';
    const canWait = role === 'ROLE_WAITER' || role === 'ROLE_ADMIN';

    const fetchActive = () => api.get('/orders/active').then(res => setOrders(res.data)).catch(() => {});
    const fetchMetrics = () => api.get('/orders/kds-metrics').then(res => setMetrics(res.data)).catch(() => {});

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

    const fetchRecentClosed = async () => {
        try {
            const res = await api.get('/orders/recent-closed');
            setRecentClosedOrders(res.data);
        } catch (e) {
            console.error('Помилка завантаження закритих замовлень', e);
        }
    };

    const recallOrder = async (orderId: string) => {
        setRecallingId(orderId);
        try {
            const res = await api.post(`/orders/${orderId}/recall`);
            upsertOrRemoveOrder(res.data);
            fetchMetrics();
            fetchRecentClosed();
            window.dispatchEvent(new Event('refresh-badges'));
        } catch (e: any) {
            alert(e.response?.data?.message || 'Помилка відновлення замовлення');
        } finally {
            setRecallingId(null);
        }
    };

    useEffect(() => {
        fetchActive();
        fetchMetrics();
        const client = getStompClient();
        if (!client) return;
        const unsubConnect = onWsConnect(() => client.subscribe('/topic/kitchen', (msg) => {
            if (msg?.body) {
                try {
                    const data = JSON.parse(msg.body);
                    if (data?.order) {
                        upsertOrRemoveOrder(data.order);
                    } else {
                        fetchActive();
                    }
                } catch {
                    fetchActive();
                }
            } else {
                fetchActive();
            }
            fetchMetrics();
            if (showRecentClosed) fetchRecentClosed();
        }));
        return () => { unsubConnect(); if (client.connected) client.unsubscribe('/topic/kitchen'); };
    }, [showRecentClosed]);

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const updateStatus = async (id: string, target: string) => {
        try {
            const res = await api.patch(`/orders/${id}/status`, { status: target });
            upsertOrRemoveOrder(res.data);
            fetchMetrics();
            window.dispatchEvent(new Event('refresh-badges'));
        } catch (e: any) { 
            alert(e.response?.data?.message || 'Помилка'); 
        }
    };

    const toggleItemStatus = async (orderId: string, item: any) => {
        if (!canCook) return;
        const target = item.status === 'READY' ? 'PREPARING' : 'READY';
        try {
            setOrders(prev => prev.map(o => {
                if (o.id !== orderId) return o;
                return {
                    ...o,
                    items: o.items.map((i: any) => i.id === item.id ? { ...i, status: target } : i)
                };
            }));

            const res = await api.patch(`/orders/${orderId}/items/${item.id}/status`, { status: target });
            upsertOrRemoveOrder(res.data);
            fetchMetrics();
            window.dispatchEvent(new Event('refresh-badges'));
        } catch (e: any) {
            fetchActive();
            alert(e.response?.data?.message || 'Помилка оновлення статусу страви');
        }
    };

    const delayedCount = orders.filter(o => {
        const mins = Math.floor((now - new Date(o.createdAt).getTime()) / 60000);
        return mins >= 20;
    }).length;

    const totalOrdersCount = orders.length;
    const kitchenOrdersCount = orders.filter(o => o.items.some((i: any) => !isBarItem(i))).length;
    const barOrdersCount = orders.filter(o => o.items.some((i: any) => isBarItem(i))).length;

    const filteredOrders = orders.filter(o => {
        if (stationFilter === 'ALL') return true;
        if (stationFilter === 'KITCHEN') return o.items.some((i: any) => !isBarItem(i));
        if (stationFilter === 'BAR') return o.items.some((i: any) => isBarItem(i));
        return true;
    });

    return (
        <div className="h-full overflow-y-auto p-5 lg:p-8">
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                            Дошка замовлень (KDS)
                        </h1>
                        {delayedCount > 0 && (
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold shadow-sm">
                                <ExclamationTriangleIcon className="w-4 h-4" />
                                <span>{delayedCount} {delayedCount === 1 ? 'затримка' : 'затримки'}</span>
                            </span>
                        )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Позиційний контроль приготування страв та координація видачі в зал
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => {
                            fetchRecentClosed();
                            setShowRecentClosed(true);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition-all active:scale-95"
                        title="Відкрити нещодавно закриті чеки та відновити випадково видані"
                    >
                        <ArrowUturnLeftIcon className="w-3.5 h-3.5 text-amber-600" />
                        <span>Нещодавно закриті</span>
                    </button>

                    <div className="hidden xl:flex items-center gap-2 text-xs font-semibold select-none bg-white dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> &lt; 10 хв
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span> 10–20 хв
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span> &gt; 20 хв
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3.5 py-2 rounded-xl border border-emerald-500/20 select-none">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Live-синхронізація</span>
                    </div>
                </div>
            </header>

            {/* Показники зміни KDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <ClockIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                            Сер. час видачі
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                            {metrics?.avgCookingMinutesToday != null ? `${metrics.avgCookingMinutesToday} хв` : '—'}
                        </div>
                        <div className="text-2xs font-medium text-emerald-600 dark:text-emerald-400 truncate">
                            Ціль: &lt; 15 хв
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircleIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                            Видано за зміну
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                            {metrics?.completedToday ?? 0} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">чеків</span>
                        </div>
                        <div className="text-2xs font-medium text-slate-500 dark:text-slate-400 truncate">
                            {metrics?.totalDishesToday ?? 0} страв приготовано
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <FireIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                            Зараз в роботі
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                            {orders.length} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">активних</span>
                        </div>
                        <div className="text-2xs font-medium text-amber-600 dark:text-amber-400 truncate">
                            {orders.filter(o => o.status === 'PREPARING').length} готуються • {orders.filter(o => o.status === 'READY').length} готові
                        </div>
                    </div>
                </div>

                <div className={`p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 transition-all ${
                    delayedCount > 0 
                        ? 'bg-red-50/70 dark:bg-red-950/30 border-red-500/40' 
                        : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-800'
                }`}>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        delayedCount > 0 
                            ? 'bg-red-600 text-white' 
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    }`}>
                        {delayedCount > 0 ? (
                            <ExclamationTriangleIcon className="w-6 h-6" />
                        ) : (
                            <CheckIcon className="w-6 h-6 stroke-2" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                            Затримки (&gt; 20 хв)
                        </div>
                        <div className={`text-xl sm:text-2xl font-black leading-tight ${
                            delayedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'
                        }`}>
                            {delayedCount} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">чеків</span>
                        </div>
                        <div className={`text-2xs font-medium truncate ${
                            delayedCount > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                            {delayedCount > 0 ? 'Потребують уваги!' : 'Всі вчасні'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Панель вибору робочого цеху */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/90 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setStationFilter('ALL')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                            stationFilter === 'ALL'
                                ? 'bg-stone-900 text-white dark:bg-amber-600 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Utensils className="w-4 h-4" />
                        <span>Всі станції</span>
                        <span className={`px-1.5 py-0.5 rounded-md text-xs font-black ${
                            stationFilter === 'ALL' 
                                ? 'bg-white/20 text-white' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                            {totalOrdersCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setStationFilter('KITCHEN')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                            stationFilter === 'KITCHEN'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <ChefHat className="w-4 h-4" />
                        <span>Кухня</span>
                        <span className={`px-1.5 py-0.5 rounded-md text-xs font-black ${
                            stationFilter === 'KITCHEN' 
                                ? 'bg-white/20 text-white' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                            {kitchenOrdersCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setStationFilter('BAR')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                            stationFilter === 'BAR'
                                ? 'bg-cyan-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Coffee className="w-4 h-4" />
                        <span>Бар</span>
                        <span className={`px-1.5 py-0.5 rounded-md text-xs font-black ${
                            stationFilter === 'BAR' 
                                ? 'bg-white/20 text-white' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                            {barOrdersCount}
                        </span>
                    </button>
                </div>

                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1.5">
                    <InformationCircleIcon className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Натисніть на позицію в чеку, щоб позначити її готовність для виносу</span>
                </div>
            </div>
            
            {/* Канбан-дошка */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 min-h-[75vh]">
                <Column title="Нові замовлення" count={filteredOrders.filter(o => o.status === 'NEW').length} color="blue">
                    {filteredOrders.filter(o => o.status === 'NEW').map(o => (
                        <OrderCard 
                            key={o.id} 
                            order={o} 
                            now={now}
                            stationFilter={stationFilter}
                            onToggleItem={toggleItemStatus}
                            onNext={canCook ? () => updateStatus(o.id, 'PREPARING') : null} 
                            btnText="Почати готувати" 
                            btnColor="bg-stone-900 hover:bg-stone-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white" 
                            icon={<PlayIcon className="w-4 h-4"/>} 
                        />
                    ))}
                </Column>

                <Column title="Готуються" count={filteredOrders.filter(o => o.status === 'PREPARING').length} color="amber">
                    {filteredOrders.filter(o => o.status === 'PREPARING').map(o => (
                        <OrderCard 
                            key={o.id} 
                            order={o} 
                            now={now}
                            stationFilter={stationFilter}
                            onToggleItem={toggleItemStatus}
                            onPrev={canCook ? () => updateStatus(o.id, 'NEW') : null}
                            onNext={canCook ? () => updateStatus(o.id, 'READY') : null} 
                            btnText="Готово до видачі" 
                            btnColor="bg-amber-600 hover:bg-amber-500 text-white" 
                            icon={<FireIcon className="w-4 h-4"/>} 
                        />
                    ))}
                </Column>

                <Column title="Очікують видачі" count={filteredOrders.filter(o => o.status === 'READY').length} color="emerald">
                    {filteredOrders.filter(o => o.status === 'READY').map(o => (
                        <OrderCard 
                            key={o.id} 
                            order={o} 
                            now={now}
                            stationFilter={stationFilter}
                            onToggleItem={toggleItemStatus}
                            onPrev={canCook ? () => updateStatus(o.id, 'PREPARING') : null}
                            onNext={canWait ? () => updateStatus(o.id, 'PAID') : null} 
                            btnText="Видано гостям" 
                            btnColor="bg-emerald-600 hover:bg-emerald-500 text-white" 
                            icon={<CheckCircleIcon className="w-4 h-4"/>} 
                        />
                    ))}
                </Column>
            </div>

            {showRecentClosed && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
                    <div className="animate-slideUpFade bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                    <ArrowUturnLeftIcon className="w-5 h-5 stroke-2" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                        Нещодавно закриті чеки
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Останні видані замовлення — можна повернути назад на дошку
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowRecentClosed(false)}
                                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
                            {recentClosedOrders.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-sm font-medium">
                                    Немає нещодавно закритих замовлень за зміну
                                </div>
                            ) : (
                                recentClosedOrders.map((ro) => (
                                    <div key={ro.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-base text-slate-900 dark:text-white">
                                                    Стіл {ro.tableNumber}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    • {new Date(ro.paidAt || ro.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                    {ro.total} ₴
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                                                {ro.items.map((i: any) => `${i.quantity}× ${i.name}`).join(', ')}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => recallOrder(ro.id)}
                                            disabled={recallingId === ro.id}
                                            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-xs shrink-0 disabled:opacity-50"
                                        >
                                            <ArrowUturnLeftIcon className="w-3.5 h-3.5 stroke-2" />
                                            <span>Відновити</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-end">
                            <button
                                onClick={() => setShowRecentClosed(false)}
                                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                            >
                                Закрити
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

function Column({ title, count, color, children }: any) {
    const borders: any = { blue: 'border-slate-300 dark:border-slate-700', amber: 'border-amber-500/30', emerald: 'border-emerald-500/30' };
    const bgHeadsLight: any = { blue: 'bg-slate-200/80 text-slate-800', amber: 'bg-amber-100 text-amber-900', emerald: 'bg-emerald-100 text-emerald-900' };
    const bgHeadsDark: any = { blue: 'dark:bg-slate-800 dark:text-slate-200', amber: 'dark:bg-amber-500/15 dark:text-amber-300', emerald: 'dark:bg-emerald-500/15 dark:text-emerald-300' };
    
    return (
        <div className="bg-slate-100/80 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 flex flex-col">
            <h2 className={`font-bold mb-4 px-3.5 py-2.5 rounded-xl text-xs tracking-wider uppercase flex justify-between items-center ${bgHeadsLight[color]} ${bgHeadsDark[color]} border ${borders[color]}`}>
                <span>{title}</span>
                <span className="bg-white/70 dark:bg-black/30 px-2.5 py-0.5 rounded-md font-extrabold text-sm">{count}</span>
            </h2>
            <div className="space-y-4 flex-1 overflow-y-auto pr-1 pb-8 custom-scrollbar">
                {children}
            </div>
        </div>
    );
}

function OrderCard({ order, now, stationFilter, onToggleItem, onPrev, onNext, btnText, btnColor, icon }: any) {
    const time = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sla = getSlaInfo(order.createdAt, now);

    const hasKitchenItems = order.items.some((i: any) => !isBarItem(i));
    const hasBarItems = order.items.some((i: any) => isBarItem(i));

    const activeItems = order.items.filter((i: any) => {
        if (stationFilter === 'KITCHEN') return !isBarItem(i);
        if (stationFilter === 'BAR') return isBarItem(i);
        return true;
    });

    const completedActiveCount = activeItems.filter((i: any) => {
        return i.status === 'READY' || i.status === 'SERVED';
    }).length;

    const totalActiveCount = activeItems.length;
    const isAllCompleted = totalActiveCount > 0 && completedActiveCount === totalActiveCount;
    const progressPercent = totalActiveCount > 0 ? Math.round((completedActiveCount / totalActiveCount) * 100) : 0;

    return (
        <div className={`bg-white dark:bg-slate-800/95 p-4 sm:p-5 rounded-2xl border transition-all ${sla.cardBorder}`}>
            {/* Рядок 1: Стіл, статус оплати та живий SLA таймер */}
            <div className="flex justify-between items-center mb-2.5">
                <div className="flex items-center gap-2.5">
                    <span className="font-black text-xl sm:text-2xl text-slate-900 dark:text-white">
                        Стіл {order.tableNumber}
                    </span>
                    {order.paid ? (
                        <span className="bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-2xs font-bold px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/30 uppercase tracking-wide">
                            Оплачено
                        </span>
                    ) : (
                        <span className="bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 text-2xs font-medium px-2 py-0.5 rounded-md">
                            Не сплачено
                        </span>
                    )}
                </div>

                <div 
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border tracking-wide select-none ${sla.badgeClass}`}
                    title={sla.label}
                >
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span className="font-mono">{sla.formatted}</span>
                </div>
            </div>

            {/* Рядок 2: Час надходження та бейдж цеху чека */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-700/80">
                <span>Прийнято о {time}</span>

                <div className="flex items-center gap-1.5">
                    {hasKitchenItems && hasBarItems ? (
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-slate-700 text-stone-700 dark:text-slate-300 font-semibold text-2xs inline-flex items-center gap-1">
                            <Utensils className="w-3 h-3" /> Кухня + Бар
                        </span>
                    ) : hasBarItems ? (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-semibold text-2xs inline-flex items-center gap-1">
                            <Coffee className="w-3 h-3" /> Бар
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold text-2xs inline-flex items-center gap-1">
                            <ChefHat className="w-3 h-3" /> Кухня
                        </span>
                    )}
                </div>
            </div>

            {/* Рядок 3: Прогрес приготування */}
            <div className="mb-3.5">
                <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <span>Готовність позицій:</span>
                        <span className={isAllCompleted ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-900 dark:text-white font-bold'}>
                            {completedActiveCount} з {totalActiveCount}
                        </span>
                    </span>
                    <span className="text-2xs font-bold text-slate-400 dark:text-slate-500">
                        {progressPercent}%
                    </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-300 rounded-full ${
                            isAllCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Список позицій — великий читабельний шрифт для кухаря */}
            <ul className="space-y-2 mb-4">
                {order.items.map((i: any, idx: number) => {
                    let optsDisplay = '';
                    if (i.selectedOptions) {
                        try {
                            const parsed = JSON.parse(i.selectedOptions);
                            optsDisplay = Object.keys(parsed).map(k => parsed[k]).flat().filter(Boolean).join(', ');
                        } catch(e) {}
                    }

                    const isBar = isBarItem(i);
                    const isMuted = (stationFilter === 'KITCHEN' && isBar) || (stationFilter === 'BAR' && !isBar);
                    const isChecked = i.status === 'READY' || i.status === 'SERVED';

                    return (
                        <li 
                            key={i.id || idx} 
                            onClick={() => !isMuted && onToggleItem && onToggleItem(order.id, i)}
                            className={`p-3 rounded-xl border transition-all select-none ${
                                isMuted
                                    ? 'opacity-40 bg-slate-50 dark:bg-slate-900/30 border-transparent cursor-default'
                                    : isChecked
                                        ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/50 cursor-pointer'
                                        : 'bg-slate-50/90 dark:bg-slate-900/70 border-slate-200/90 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-500/60 cursor-pointer group'
                            }`}
                        >
                            <div className="flex justify-between items-start gap-2.5">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    {!isMuted ? (
                                        <div className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center transition-all shrink-0 ${
                                            isChecked 
                                                ? 'bg-emerald-600 text-white' 
                                                : 'border-2 border-slate-300 dark:border-slate-600 group-hover:border-amber-500 bg-white dark:bg-slate-800'
                                        }`}>
                                            {isChecked && <CheckIcon className="w-3.5 h-3.5 stroke-2" />}
                                        </div>
                                    ) : (
                                        <div className="w-5 h-5 mt-0.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shrink-0" />
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline gap-2 flex-wrap">
                                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-sm font-black shrink-0 ${
                                                isChecked
                                                    ? 'bg-emerald-200/70 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                                                    : 'bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950'
                                            }`}>
                                                {i.quantity}×
                                            </span>
                                            <span className={`font-bold text-base sm:text-lg leading-snug ${
                                                isChecked 
                                                    ? 'line-through text-slate-400 dark:text-slate-500 font-medium' 
                                                    : isMuted 
                                                        ? 'text-slate-400 dark:text-slate-500' 
                                                        : 'text-slate-900 dark:text-white'
                                            }`}>
                                                {i.name}
                                            </span>
                                        </div>

                                        {optsDisplay && (
                                            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800/70 text-xs sm:text-sm font-bold">
                                                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                                                <span>{optsDisplay}</span>
                                            </div>
                                        )}
                                        
                                        {isMuted && (
                                            <div className="text-2xs text-slate-400 dark:text-slate-500 font-medium italic mt-1">
                                                {isBar ? 'Готується на барі' : 'Готується на кухні'}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="shrink-0 flex flex-col items-end gap-1">
                                    {i.status === 'READY' && (
                                        <span className="text-2xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700">
                                            Готово
                                        </span>
                                    )}
                                    {i.status === 'SERVED' && (
                                        <span className="text-2xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                            Подано
                                        </span>
                                    )}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {/* Кнопки дій */}
            <div className="flex items-center gap-2">
                {onPrev && (
                    <button
                        onClick={onPrev}
                        className="px-3.5 py-3 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-95 border border-slate-200 dark:border-slate-600/60 flex items-center justify-center shrink-0"
                        title={order.status === 'PREPARING' ? "Повернути замовлення в «НОВІ»" : "Повернути замовлення в «ГОТУЮТЬСЯ»"}
                    >
                        <ArrowUturnLeftIcon className="w-4 h-4 stroke-2" />
                    </button>
                )}

                {onNext && (
                    <button 
                        onClick={onNext} 
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xs ${
                            isAllCompleted && order.status === 'PREPARING'
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-500/30'
                                : btnColor
                        }`}
                    >
                        {icon}
                        <span>
                            {isAllCompleted && order.status === 'PREPARING'
                                ? 'Всі страви готові — Видати'
                                : order.status === 'PREPARING' && completedActiveCount > 0
                                    ? `Видати замовлення (${completedActiveCount}/${totalActiveCount})`
                                    : btnText}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
}
