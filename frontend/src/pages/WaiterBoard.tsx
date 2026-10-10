import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { getStompClient } from '../ws';
import { CheckIcon } from '@heroicons/react/24/solid';

export default function WaiterBoard() {
    const [calls, setCalls] = useState<any[]>([]);
    
    const load = () => api.get('/service-calls/active').then(res => setCalls(res.data));
    
    useEffect(() => {
        load();
        const client = getStompClient();
        if (!client) return;
        const sub = client.onConnect = () => client.subscribe('/topic/service-calls', () => load());
        return () => { if (client.connected) client.unsubscribe('/topic/service-calls'); };
    }, []);

    const resolve = async (id: string) => {
        await api.patch(`/service-calls/${id}/resolve`);
        load();
    };

    return (
        <div className="p-8 max-w-3xl">
            <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Виклики столів</h1>
            {calls.length === 0 && <div className="text-slate-500 font-medium">Немає активних викликів.</div>}
            <div className="space-y-4">
                {calls.map((c:any) => (
                    <div key={c.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center transition-colors">
                        <div>
                            <div className="font-bold text-2xl mb-1 text-indigo-900 dark:text-indigo-400 tracking-tight">Стіл {c.tableNumber}</div>
                            <div className="text-slate-700 dark:text-slate-300 font-medium text-lg flex items-center gap-3">
                                {c.type === 'WAITER' ? '👋 Просить підійти' : '💳 Просить рахунок'} 
                                <span className="text-sm text-slate-400 dark:text-slate-500 font-normal">{new Date(c.createdAt).toLocaleTimeString()}</span>
                            </div>
                        </div>
                        <button onClick={() => resolve(c.id)} className="bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-md flex items-center gap-2">
                            <CheckIcon className="w-5 h-5"/> Оброблено
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
