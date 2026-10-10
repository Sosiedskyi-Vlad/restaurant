import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { getStompClient } from '../ws';
import { CheckCircleIcon, PlayIcon, FireIcon } from '@heroicons/react/24/solid';

export default function KitchenBoard({ role }: { role: string }) {
    const [orders, setOrders] = useState<any[]>([]);
    const fetchActive = () => api.get('/orders/active').then(res => setOrders(res.data));

    useEffect(() => {
        fetchActive();
        const client = getStompClient();
        if (!client) return;
        client.onConnect = () => client.subscribe('/topic/kitchen', () => fetchActive());
        return () => { if (client.connected) client.unsubscribe('/topic/kitchen'); };
    }, []);

    const updateStatus = async (id: string, target: string) => {
        try {
            await api.patch(`/orders/${id}/status`, { status: target });
            fetchActive();
        } catch (e: any) { alert(e.response?.data?.message || 'Помилка'); }
    };

    const canCook = role === 'ROLE_COOK' || role === 'ROLE_ADMIN';
    const canWait = role === 'ROLE_WAITER' || role === 'ROLE_ADMIN';

    return (
        <div className="h-full overflow-y-auto p-6 lg:p-10">
            <header className="mb-8 flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Дошка замовлень (KDS)</h1>
                <div className="flex items-center gap-2 text-sm font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full ring-1 ring-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Синхронізація активна
                </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 min-h-[80vh]">
                <Column title="НОВІ" count={orders.filter(o => o.status === 'NEW').length} color="blue">
                    {orders.filter(o => o.status === 'NEW').map(o => (
                        <OrderCard key={o.id} order={o} onNext={canCook ? () => updateStatus(o.id, 'PREPARING') : null} btnText="Почати готувати" btnColor="bg-blue-600 hover:bg-blue-500 text-white" icon={<PlayIcon className="w-4 h-4"/>} />
                    ))}
                </Column>

                <Column title="ГОТУЮТЬСЯ" count={orders.filter(o => o.status === 'PREPARING').length} color="amber">
                    {orders.filter(o => o.status === 'PREPARING').map(o => (
                        <OrderCard key={o.id} order={o} onNext={canCook ? () => updateStatus(o.id, 'READY') : null} btnText="Готово" btnColor="bg-amber-500 hover:bg-amber-400 text-white" icon={<FireIcon className="w-4 h-4"/>} />
                    ))}
                </Column>

                <Column title="ОЧІКУЮТЬ ВИДАЧІ" count={orders.filter(o => o.status === 'READY').length} color="emerald">
                    {orders.filter(o => o.status === 'READY').map(o => (
                        <OrderCard key={o.id} order={o} onNext={canWait ? () => updateStatus(o.id, 'PAID') : null} btnText="Видано і Оплачено" btnColor="bg-emerald-600 hover:bg-emerald-500 text-white" icon={<CheckCircleIcon className="w-4 h-4"/>} />
                    ))}
                </Column>
            </div>
        </div>
    );
}

function Column({ title, count, color, children }: any) {
    const borders: any = { blue: 'border-blue-500/30', amber: 'border-amber-500/30', emerald: 'border-emerald-500/30' };
    const bgHeadsLight: any = { blue: 'bg-blue-100 text-blue-800', amber: 'bg-amber-100 text-amber-800', emerald: 'bg-emerald-100 text-emerald-800' };
    const bgHeadsDark: any = { blue: 'dark:bg-blue-500/10 dark:text-blue-400', amber: 'dark:bg-amber-500/10 dark:text-amber-400', emerald: 'dark:bg-emerald-500/10 dark:text-emerald-400' };
    
    return (
        <div className="bg-slate-100 dark:bg-slate-950/50 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col">
            <h2 className={`font-bold mb-5 p-3 rounded-2xl text-center text-sm tracking-widest uppercase flex justify-center items-center gap-2 ${bgHeadsLight[color]} ${bgHeadsDark[color]} border ${borders[color]}`}>
                {title} <span className="bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-lg">{count}</span>
            </h2>
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 pb-10 custom-scrollbar">
                {children}
            </div>
        </div>
    );
}

function OrderCard({ order, onNext, btnText, btnColor, icon }: any) {
    const time = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div>
                    <span className="font-bold text-xl text-slate-900 dark:text-white">Стіл {order.tableNumber}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-sm ml-3 font-medium">{time}</span>
                </div>
                {order.paid && <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2 py-1 rounded-lg ring-1 ring-emerald-200 dark:ring-emerald-500/30 uppercase tracking-wide">Оплачено</span>}
            </div>
            <ul className="mb-6 space-y-2">
                {order.items.map((i: any, idx: number) => (
                    <li key={idx} className="flex justify-between items-center text-slate-700 dark:text-slate-200 font-medium text-lg">
                        <span className="flex gap-3"><span className="text-slate-400 dark:text-slate-500">{i.quantity}x</span> <span>{i.name}</span></span>
                    </li>
                ))}
            </ul>
            {onNext && <button onClick={onNext} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md ${btnColor}`}>
                {icon} {btnText}
            </button>}
        </div>
    );
}
