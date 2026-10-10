import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { LinkIcon } from '@heroicons/react/24/outline';

export default function AdminTables() {
    const [tables, setTables] = useState<any[]>([]);
    const [num, setNum] = useState('');

    const load = () => api.get('/tables').then(res => setTables(res.data));
    useEffect(() => { load(); }, []);

    const addTable = async () => {
        if(!num) return;
        try {
            await api.post('/tables', { number: parseInt(num) });
            setNum('');
            load();
        } catch(e:any) { alert(e.response?.data?.message || 'Помилка'); }
    };

    const regen = async (id: string) => {
        if(!confirm('Старий QR-код перестане працювати. Продовжити?')) return;
        await api.post(`/tables/${id}/regenerate-qr`);
        load();
    };

    const downloadQR = async (id: string, number: number) => {
        const res = await api.get(`/tables/${id}/qr.png?size=1024`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a'); link.href = url;
        link.setAttribute('download', `table-${number}-qr.png`);
        document.body.appendChild(link); link.click();
    };

    const openGuestUrl = (hash: string) => {
        // Відкриваємо гостьове меню в новій вкладці (для тестування)
        window.open(`/?qr=${hash}`, '_blank');
    };

    return (
        <div className="p-8 max-w-5xl">
            <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Столи та QR-коди</h1>
            <div className="flex gap-4 mb-8 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <input type="number" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg w-48 font-medium placeholder:text-slate-400" value={num} onChange={e=>setNum(e.target.value)} placeholder="Номер нового столу" />
                <button onClick={addTable} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors">Створити стіл</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {tables.map(t => (
                    <div key={t.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 w-full h-1.5 bg-indigo-500"></div>
                        
                        <div className="w-full flex justify-between items-center mb-4 mt-2">
                            <h3 className="font-bold text-xl text-slate-900 dark:text-white">Стіл {t.number}</h3>
                            <button onClick={() => openGuestUrl(t.qrCodeHash)} title="Відкрити меню гостя (Симуляція)" className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                                <LinkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <AuthImage id={t.id} hash={t.qrCodeHash} />
                        
                        <div className="flex gap-2 w-full">
                            <button onClick={() => downloadQR(t.id, t.number)} className="flex-1 bg-slate-100 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 py-2 rounded-lg text-xs sm:text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Завантажити</button>
                            <button onClick={() => regen(t.id)} className="flex-1 bg-red-50 dark:bg-red-500/10 font-bold text-red-600 dark:text-red-400 py-2 rounded-lg text-xs sm:text-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">Оновити</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Компонент для завантаження зображення із JWT-токеном
function AuthImage({ id, hash }: { id: string, hash: string }) {
    const [src, setSrc] = useState<string>('');
    
    useEffect(() => {
        let objectUrl = '';
        api.get(`/tables/${id}/qr.png?size=256`, { responseType: 'blob' })
           .then(res => {
               objectUrl = window.URL.createObjectURL(new Blob([res.data]));
               setSrc(objectUrl);
           })
           .catch(() => setSrc(''));
           
        return () => {
            if (objectUrl) window.URL.revokeObjectURL(objectUrl);
        };
    }, [id, hash]);

    if (!src) {
        return <div className="w-32 h-32 mb-6 border-4 border-white dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-900 animate-pulse"></div>;
    }

    return <img src={src} className="w-32 h-32 mb-6 border-4 border-white dark:border-slate-700 rounded-xl shadow-sm group-hover:scale-105 transition-transform cursor-pointer" title="QR-код столу" />;
}
