import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import { 
    ClockIcon, 
    MagnifyingGlassIcon, 
    ArrowPathIcon, 
    ArrowUturnLeftIcon, 
    DocumentTextIcon, 
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';

interface OrderItem {
    id: string;
    menuItemId: number;
    name: string;
    quantity: number;
    priceAtTime: number;
    selectedOptions?: string;
    categoryName?: string;
    status: string;
}

interface Order {
    id: string;
    tableNumber: number;
    status: 'NEW' | 'PREPARING' | 'READY' | 'PAID';
    createdAt: string;
    preparingAt?: string;
    readyAt?: string;
    paidAt?: string;
    items: OrderItem[];
    subtotal?: number;
    discountAmount?: number;
    appliedPromotionTitle?: string;
    total: number;
    paid: boolean;
}

export default function OrderHistory({ role }: { role: string }) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [page, setPage] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalElements, setTotalElements] = useState<number>(0);

    // Фільтри
    const [search, setSearch] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [periodFilter, setPeriodFilter] = useState<'TODAY' | 'YESTERDAY' | 'WEEK' | 'ALL'>('TODAY');
    const [tableFilter, setTableFilter] = useState<string>('');

    // Модальне вікно перегляду чека
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [recallingId, setRecallingId] = useState<string | null>(null);

    const canRecall = role === 'ROLE_WAITER' || role === 'ROLE_ADMIN' || role === 'ROLE_COOK';

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const params: any = {
                page,
                size: 15,
                sort: 'createdAt,desc'
            };

            if (statusFilter) params.status = statusFilter;
            if (tableFilter) params.tableNumber = parseInt(tableFilter, 10);
            if (search.trim()) params.search = search.trim();

            const now = new Date();
            const pad = (n: number) => n < 10 ? '0' + n : n;
            const formatLocalIso = (d: Date) => {
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            };

            if (periodFilter === 'TODAY') {
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                params.from = formatLocalIso(todayStart);
            } else if (periodFilter === 'YESTERDAY') {
                const yestStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
                const yestEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
                params.from = formatLocalIso(yestStart);
                params.to = formatLocalIso(yestEnd);
            } else if (periodFilter === 'WEEK') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                params.from = formatLocalIso(weekAgo);
            }

            const res = await api.get('/orders/history', { params });
            setOrders(res.data.content || []);
            setTotalPages(res.data.totalPages || 1);
            setTotalElements(res.data.totalElements || 0);
        } catch (e: any) {
            console.error('Помилка завантаження історії замовлень', e);
            if (e.response?.data) {
                console.error('Деталі помилки бекенду:', e.response.data);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [page, statusFilter, periodFilter, tableFilter]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(0);
        fetchHistory();
    };

    const handleRecall = async (orderId: string) => {
        if (!window.confirm('Повернути це замовлення на дошку в роботу («Очікують видачі»)?')) return;
        setRecallingId(orderId);
        try {
            await api.post(`/orders/${orderId}/recall`);
            alert('✓ Замовлення успішно повернено на дошку!');
            fetchHistory();
            if (selectedOrder?.id === orderId) {
                setSelectedOrder(null);
            }
            window.dispatchEvent(new Event('refresh-badges'));
        } catch (e: any) {
            alert(e.response?.data?.message || 'Помилка повернення замовлення');
        } finally {
            setRecallingId(null);
        }
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '—';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (isoString?: string) => {
        if (!isoString) return '—';
        return new Date(isoString).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const calcDuration = (start?: string, end?: string) => {
        if (!start || !end) return null;
        const diffMins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
        return diffMins > 0 ? `${diffMins} хв` : '< 1 хв';
    };

    // Підрахунок загальної суми та середнього чека
    const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    const avgCheck = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

    return (
        <div className="h-full overflow-y-auto p-6 lg:p-10 space-y-6">
            {/* Заголовок сторінки */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <ClockIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400 stroke-2" />
                        Історія замовлень
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Повний архів чеків, аудит часу приготування та можливість відновлення помилково закритих чеків
                    </p>
                </div>

                <button
                    onClick={() => fetchHistory()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-xs transition-all active:scale-95 text-sm self-start md:self-auto"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Оновити
                </button>
            </div>

            {/* Метрики вибірки */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Знайдено чеків
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {totalElements}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Сума на сторінці
                    </div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {totalRevenue.toLocaleString()} ₴
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Середній чек
                    </div>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                        {avgCheck.toLocaleString()} ₴
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Поточний фільтр
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                        {periodFilter === 'TODAY' && 'Сьогодні'}
                        {periodFilter === 'YESTERDAY' && 'Вчора'}
                        {periodFilter === 'WEEK' && 'Останні 7 днів'}
                        {periodFilter === 'ALL' && 'Весь час'}
                    </div>
                </div>
            </div>

            {/* Панель фільтрів */}
            <div className="bg-white dark:bg-slate-800/90 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-md">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Пошук за столом чи стравою..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-xs"
                    >
                        Знайти
                    </button>
                </form>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Перемикач періоду */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs font-bold">
                        {(['TODAY', 'YESTERDAY', 'WEEK', 'ALL'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => { setPeriodFilter(p); setPage(0); }}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    periodFilter === p
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                {p === 'TODAY' && 'Сьогодні'}
                                {p === 'YESTERDAY' && 'Вчора'}
                                {p === 'WEEK' && 'Тиждень'}
                                {p === 'ALL' && 'Всі'}
                            </button>
                        ))}
                    </div>

                    {/* Фільтр за статусом */}
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Усі статуси</option>
                        <option value="PAID">Оплачені (PAID)</option>
                        <option value="READY">Готові (READY)</option>
                        <option value="PREPARING">Готуються (PREPARING)</option>
                        <option value="NEW">Нові (NEW)</option>
                    </select>

                    {/* Фільтр за номером столу */}
                    <input
                        type="number"
                        placeholder="Стіл №"
                        value={tableFilter}
                        onChange={(e) => { setTableFilter(e.target.value); setPage(0); }}
                        className="w-20 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Таблиця замовлень */}
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <th className="p-4 pl-6">Стіл</th>
                                <th className="p-4">Час та тривалість</th>
                                <th className="p-4">Склад замовлення</th>
                                <th className="p-4">Статус</th>
                                <th className="p-4">Сума</th>
                                <th className="p-4 pr-6 text-right">Дії</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                                        {loading ? 'Завантаження замовлень...' : 'За вказаними фільтрами замовлень не знайдено'}
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => {
                                    const duration = calcDuration(order.createdAt, order.readyAt || order.paidAt);
                                    return (
                                        <tr key={order.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750 transition-colors">
                                            <td className="p-4 pl-6 font-bold">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white flex items-center justify-center font-black text-sm">
                                                        {order.tableNumber ?? '—'}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                                                        #{order.id.slice(0, 6)}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="p-4">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {formatTime(order.createdAt)}
                                                </div>
                                                <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                    <span>{formatDate(order.createdAt)}</span>
                                                    {duration && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                                ⏱ {duration}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-4 max-w-xs">
                                                <div className="truncate font-medium text-slate-800 dark:text-slate-200">
                                                    {order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    Всього {order.items.reduce((s, i) => s + i.quantity, 0)} страв
                                                </div>
                                            </td>

                                            <td className="p-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    {order.status === 'PAID' && (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                                            ✓ Видано / Оплачено
                                                        </span>
                                                    )}
                                                    {order.status === 'READY' && (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                                                            Готово до видачі
                                                        </span>
                                                    )}
                                                    {order.status === 'PREPARING' && (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                                            Готується
                                                        </span>
                                                    )}
                                                    {order.status === 'NEW' && (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                                            Нове
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-4 font-black text-slate-900 dark:text-white">
                                                <div>{order.total} ₴</div>
                                                {order.discountAmount && order.discountAmount > 0 ? (
                                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                                                        знижка -{order.discountAmount} ₴
                                                    </div>
                                                ) : null}
                                            </td>

                                            <td className="p-4 pr-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Кнопка повернення чека в роботу */}
                                                    {order.status === 'PAID' && canRecall && (
                                                        <button
                                                            onClick={() => handleRecall(order.id)}
                                                            disabled={recallingId === order.id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/30 transition-all active:scale-95"
                                                            title="Повернути замовлення назад на дошку KDS"
                                                        >
                                                            <ArrowUturnLeftIcon className="w-3.5 h-3.5 stroke-2" />
                                                            <span>Відновити</span>
                                                        </button>
                                                    )}

                                                    {/* Кнопка перегляду чека */}
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95"
                                                    >
                                                        <DocumentTextIcon className="w-3.5 h-3.5" />
                                                        <span>Чек</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Пагінація */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            Сторінка <span className="font-bold text-slate-900 dark:text-white">{page + 1}</span> з <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                            >
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Модальне вікно перегляду детального електронного чека */}
            {selectedOrder && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Шапка модалки */}
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
                            <div>
                                <h3 className="font-black text-xl text-slate-900 dark:text-white">
                                    Чек замовлення
                                </h3>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">
                                    ID: {selectedOrder.id}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Тіло чека */}
                        <div className="p-6 overflow-y-auto space-y-5 flex-1">
                            {/* Інформація про стіл та таймінги */}
                            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                                <div>
                                    <span className="text-slate-400">Стіл:</span>
                                    <div className="font-black text-base text-slate-900 dark:text-white">
                                        Стіл {selectedOrder.tableNumber}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-slate-400">Створено:</span>
                                    <div className="font-bold text-slate-800 dark:text-slate-200">
                                        {formatDate(selectedOrder.createdAt)} {formatTime(selectedOrder.createdAt)}
                                    </div>
                                </div>
                                {selectedOrder.readyAt && (
                                    <div>
                                        <span className="text-slate-400">Готово о:</span>
                                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatTime(selectedOrder.readyAt)}
                                        </div>
                                    </div>
                                )}
                                {selectedOrder.paidAt && (
                                    <div>
                                        <span className="text-slate-400">Оплачено о:</span>
                                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatTime(selectedOrder.paidAt)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Список страв */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                    Позиції замовлення
                                </h4>
                                <ul className="divide-y divide-slate-100 dark:divide-slate-800 border-y border-slate-100 dark:border-slate-800">
                                    {selectedOrder.items.map((i) => {
                                        let optsStr = '';
                                        if (i.selectedOptions) {
                                            try {
                                                const p = JSON.parse(i.selectedOptions);
                                                optsStr = Object.values(p).flat().filter(Boolean).join(', ');
                                            } catch (e) {}
                                        }
                                        return (
                                            <li key={i.id} className="py-2.5 flex justify-between items-start text-sm">
                                                <div>
                                                    <div className="font-semibold text-slate-900 dark:text-white">
                                                        {i.quantity}× {i.name}
                                                    </div>
                                                    {optsStr && (
                                                        <div className="text-xs text-indigo-500 font-medium">
                                                            ⚙️ {optsStr}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="font-black text-slate-800 dark:text-slate-200">
                                                    {(i.priceAtTime * i.quantity)} ₴
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            {/* Загальний підсумок */}
                            <div className="pt-2 flex flex-col gap-1.5 border-t border-slate-200 dark:border-slate-700">
                                {selectedOrder.discountAmount && selectedOrder.discountAmount > 0 ? (
                                    <>
                                        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                                            <span>Сума без знижки:</span>
                                            <span className="font-bold">{selectedOrder.subtotal || (Number(selectedOrder.total) + Number(selectedOrder.discountAmount))} ₴</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                            <span>🎉 {selectedOrder.appliedPromotionTitle || 'Знижка'}:</span>
                                            <span>-{selectedOrder.discountAmount} ₴</span>
                                        </div>
                                    </>
                                ) : null}
                                <div className="flex justify-between items-baseline pt-1">
                                    <span className="font-extrabold text-slate-900 dark:text-white text-base">
                                        Всього до сплати:
                                    </span>
                                    <span className="font-black text-2xl text-emerald-600 dark:text-emerald-400">
                                        {selectedOrder.total} ₴
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Футер дій */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-between gap-3">
                            {selectedOrder.status === 'PAID' && canRecall && (
                                <button
                                    onClick={() => handleRecall(selectedOrder.id)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-md active:scale-95"
                                >
                                    <ArrowUturnLeftIcon className="w-4 h-4 stroke-2" />
                                    <span>Повернути в роботу</span>
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-5 py-3 rounded-xl font-bold text-sm bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
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
