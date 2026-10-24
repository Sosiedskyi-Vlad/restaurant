import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { CalendarIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function AdminAnalytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    
    const [toDate, setToDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    const [topLimit, setTopLimit] = useState(10);

    const loadData = () => {
        setLoading(true);
        api.get(`/admin/analytics?from=${fromDate}&to=${toDate}&topLimit=${topLimit}`)
           .then(res => setData(res.data))
           .catch(e => alert(e.response?.data?.message || 'Помилка завантаження даних'))
           .finally(() => setLoading(false));
    };

    const downloadCSV = () => {
        if (!data) return;
        const lines = [];
        lines.push('Звіт за період', `${data.periodStart} - ${data.periodEnd}`);
        lines.push('');
        lines.push('Загальні показники');
        lines.push(`Виручка,${data.revenue} грн`);
        lines.push(`Замовлень,${data.paidOrders}`);
        lines.push(`Середній чек,${data.averageCheck} грн`);
        lines.push(`Середній час видачі,${data.avgCookingMinutes || '-'} хв`);
        lines.push(`Середній час реакції офіціанта,${data.avgWaiterReactionMinutes || '-'} хв`);
        lines.push('');
        lines.push('Топ страв');
        lines.push('Назва,Кількість,Виручка (грн)');
        data.topItems.forEach((i:any) => lines.push(`"${i.name.replace(/"/g, '""')}",${i.quantity},${i.revenue}`));
        lines.push('');
        lines.push('Виручка по днях');
        lines.push('Дата,Замовлень,Виручка (грн)');
        data.revenueByDay.forEach((d:any) => lines.push(`${d.date},${d.orders},${d.revenue}`));
        
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(lines.join('\n'));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `Звіт_${data.periodStart}_${data.periodEnd}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        loadData();
    }, [fromDate, toDate, topLimit]);

    return (
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Аналітика та звіти</h1>
                    <button onClick={downloadCSV} className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors">
                        <ArrowDownTrayIcon className="w-4 h-4" /> Завантажити CSV
                    </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center pl-3 text-slate-400">
                        <CalendarIcon className="w-5 h-5" />
                    </div>
                    <input 
                        type="date" 
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm text-slate-700 dark:text-slate-200 cursor-pointer"
                    />
                    <span className="text-slate-400">—</span>
                    <input 
                        type="date" 
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm text-slate-700 dark:text-slate-200 cursor-pointer"
                    />
                </div>
            </div>

            {loading && !data ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div>
                </div>
            ) : data ? (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                        <StatCard title="Виручка" value={`${data.revenue} ₴`} />
                        <StatCard title="Замовлень" value={data.paidOrders} />
                        <StatCard title="Середній чек" value={`${data.averageCheck} ₴`} />
                        <StatCard title="Кухня (сер. час)" value={data.avgCookingMinutes ? `${data.avgCookingMinutes} хв` : '—'} />
                        <StatCard title="Офіціанти (реакція)" value={data.avgWaiterReactionMinutes ? `${data.avgWaiterReactionMinutes} хв` : '—'} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                            <h3 className="text-base font-bold mb-6 text-slate-900 dark:text-white">Динаміка виручки</h3>
                            <div className="h-72">
                                {data.revenueByDay?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.revenueByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" opacity={0.2} />
                                            <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} minTickGap={30} />
                                            <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.25)', backgroundColor: '#0f172a', color: '#f8fafc' }}
                                                labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}
                                                itemStyle={{ color: '#fbbf24', fontWeight: 'bold' }}
                                            />
                                            <Area type="monotone" name="Виручка (₴)" dataKey="revenue" stroke="#d97706" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400">Немає даних для графіка</div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                            <h3 className="text-base font-bold mb-6 text-slate-900 dark:text-white">Кількість замовлень</h3>
                            <div className="h-72">
                                {data.revenueByDay?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.revenueByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" opacity={0.2} />
                                            <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} minTickGap={30} />
                                            <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <Tooltip 
                                                cursor={{fill: '#334155', opacity: 0.1}}
                                                contentStyle={{ borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.25)', backgroundColor: '#0f172a', color: '#f8fafc' }}
                                                labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}
                                                itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                                            />
                                            <Bar dataKey="orders" name="Замовлення" fill="#10b981" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400">Немає даних для графіка</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Популярні страви</h2>
                            <select 
                                value={topLimit} 
                                onChange={(e) => setTopLimit(parseInt(e.target.value))}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm px-3 py-1.5 focus:ring-amber-500 focus:border-amber-500"
                            >
                                <option value={5}>Топ 5</option>
                                <option value={10}>Топ 10</option>
                                <option value={20}>Топ 20</option>
                                <option value={50}>Топ 50</option>
                            </select>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                        <th className="pb-3 font-semibold">Назва страви</th>
                                        <th className="pb-3 font-semibold">Продано порцій</th>
                                        <th className="pb-3 font-semibold text-right">Виручка</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.topItems?.map((i:any, index: number) => (
                                        <tr key={i.menuItemId} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="py-3.5 flex items-center gap-3">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                                    {index + 1}
                                                </span>
                                                <span className="font-semibold text-slate-900 dark:text-slate-200">{i.name}</span>
                                            </td>
                                            <td className="py-3.5 text-slate-700 dark:text-slate-300 text-sm">
                                                {i.quantity} шт
                                            </td>
                                            <td className="py-3.5 font-bold text-slate-900 dark:text-white text-right">
                                                {i.revenue} ₴
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {(!data.topItems || data.topItems.length === 0) && (
                                <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl mt-4">
                                    Немає даних за обраний період
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}

function StatCard({ title, value }: { title: string, value: string | number, trend?: any }) {
    return (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs border-t-2 border-t-amber-500/80 transition-all">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{title}</div>
            <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{value}</div>
        </div>
    );
}
