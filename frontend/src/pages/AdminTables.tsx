import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { LinkIcon, MapIcon, ListBulletIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function AdminTables() {
    const [tables, setTables] = useState<any[]>([]);
    const [num, setNum] = useState('');
    const [isEditorMode, setIsEditorMode] = useState(false);

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
        window.open(`/?qr=${hash}`, '_blank');
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Столи та зал</h1>
                <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                    <button onClick={() => setIsEditorMode(false)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${!isEditorMode ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                        <ListBulletIcon className="w-5 h-5"/> Список і QR
                    </button>
                    <button onClick={() => setIsEditorMode(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${isEditorMode ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                        <MapIcon className="w-5 h-5"/> Карта залу
                    </button>
                </div>
            </div>

            {!isEditorMode ? (
                <>
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
                </>
            ) : (
                <TableMapEditor tables={tables} reloadTables={load} />
            )}
        </div>
    );
}

function TableMapEditor({ tables, reloadTables }: { tables: any[], reloadTables: () => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [positions, setPositions] = useState<Record<string, {x: number, y: number}>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const initial: Record<string, {x: number, y: number}> = {};
        tables.forEach((t, i) => {
            // Якщо координат ще немає, ставимо їх у рядок вгорі
            initial[t.id] = {
                x: t.positionX ?? (10 + (i % 8) * 10),
                y: t.positionY ?? (10 + Math.floor(i / 8) * 15)
            };
        });
        setPositions(initial);
    }, [tables]);

    const handlePointerDown = (e: React.PointerEvent, id: string) => {
        const container = containerRef.current;
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        
        // Поточні координати в %
        const startX = positions[id].x;
        const startY = positions[id].y;

        // Початкова точка мишки
        const startMouseX = e.clientX;
        const startMouseY = e.clientY;

        const handlePointerMove = (ev: PointerEvent) => {
            // Різниця в пікселях
            const dx = ev.clientX - startMouseX;
            const dy = ev.clientY - startMouseY;

            // Конвертуємо різницю у відсотки від розміру контейнера
            const percentDx = (dx / containerRect.width) * 100;
            const percentDy = (dy / containerRect.height) * 100;

            let newX = startX + percentDx;
            let newY = startY + percentDy;

            // Обмежуємо, щоб столи не вилітали за межі (приблизно)
            newX = Math.max(0, Math.min(95, newX));
            newY = Math.max(0, Math.min(90, newY));

            setPositions(prev => ({...prev, [id]: {x: newX, y: newY}}));
        };

        const handlePointerUp = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    const savePositions = async () => {
        setSaving(true);
        const payload = Object.entries(positions).map(([id, pos]) => ({
            id, positionX: pos.x, positionY: pos.y
        }));
        try {
            await api.patch('/tables/positions', payload);
            alert('Схему залу успішно збережено!');
            reloadTables();
        } catch(e:any) {
            alert('Помилка: ' + (e.response?.data?.message || e.message));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <p className="text-slate-500 dark:text-slate-400">Перетягніть столи мишкою або пальцем, щоб налаштувати схему залу.</p>
                <button onClick={savePositions} disabled={saving} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-colors disabled:opacity-50">
                    <CheckIcon className="w-5 h-5"/> {saving ? 'Збереження...' : 'Зберегти мапу'}
                </button>
            </div>
            
            <div 
                ref={containerRef} 
                className="w-full aspect-[4/3] md:aspect-[16/9] bg-slate-100 dark:bg-slate-900 rounded-xl relative overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700"
                style={{ touchAction: 'none' }}
            >
                {tables.map(t => {
                    const pos = positions[t.id];
                    if (!pos) return null;
                    return (
                        <div 
                            key={t.id}
                            onPointerDown={(e) => handlePointerDown(e, t.id)}
                            className="absolute w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 text-white rounded-2xl flex flex-col items-center justify-center shadow-lg cursor-grab active:cursor-grabbing hover:scale-105 transition-transform"
                            style={{ 
                                left: `${pos.x}%`, 
                                top: `${pos.y}%`,
                                transform: 'translate(-50%, -50%)',
                                touchAction: 'none'
                            }}
                            title={`Стіл ${t.number}`}
                        >
                            <span className="text-2xl sm:text-3xl font-black">{t.number}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

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
