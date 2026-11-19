import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { 
    LinkIcon, 
    MapIcon, 
    ListBulletIcon, 
    CheckIcon, 
    PlusIcon, 
    TrashIcon, 
    ArrowPathIcon,
    SparklesIcon,
    XMarkIcon,
    UsersIcon
} from '@heroicons/react/24/outline';
import {
    Wine,
    ChefHat,
    DoorOpen,
    Bath,
    Trees,
    BrickWall,
    Scissors,
    MousePointerClick,
    Lightbulb
} from 'lucide-react';

export const ZONES = [
    { id: 'MAIN', name: 'Основний зал' },
    { id: 'TERRACE', name: 'Літня тераса' },
    { id: 'VIP', name: 'VIP-кімната' }
];

export interface HallElementItem {
    id: string;
    name: string;
    type: 'BAR' | 'KITCHEN' | 'ENTRANCE' | 'WC' | 'WALL' | 'PLANT' | 'VOID';
    zone: string;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    rotation: number;
}

function getElementIcon(type: HallElementItem['type'], className = 'w-4 h-4 shrink-0') {
    switch (type) {
        case 'VOID': return <Scissors className={className} />;
        case 'WALL': return <BrickWall className={className} />;
        case 'BAR': return <Wine className={className} />;
        case 'KITCHEN': return <ChefHat className={className} />;
        case 'ENTRANCE': return <DoorOpen className={className} />;
        case 'WC': return <Bath className={className} />;
        case 'PLANT': return <Trees className={className} />;
        default: return null;
    }
}

export default function AdminTables() {
    const [tables, setTables] = useState<any[]>([]);
    const [num, setNum] = useState('');
    const [newZone, setNewZone] = useState('MAIN');
    const [newShape, setNewShape] = useState('SQUARE');
    const [newSeats, setNewSeats] = useState(4);
    const [isEditorMode, setIsEditorMode] = useState(false);

    const load = () => api.get('/tables').then(res => setTables(res.data));
    useEffect(() => { load(); }, []);

    const addTable = async () => {
        if (!num) return;
        try {
            await api.post('/tables', { 
                number: parseInt(num),
                zone: newZone,
                shape: newShape,
                seats: newSeats,
                rotation: 0
            });
            setNum('');
            load();
        } catch (e: any) { 
            alert(e.response?.data?.message || 'Помилка'); 
        }
    };

    const regen = async (id: string) => {
        if (!confirm('Старий QR-код перестане працювати. Продовжити?')) return;
        await api.post(`/tables/${id}/regenerate-qr`);
        load();
    };

    const downloadQR = async (id: string, number: number) => {
        const res = await api.get(`/tables/${id}/qr.png?size=1024`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a'); 
        link.href = url;
        link.setAttribute('download', `table-${number}-qr.png`);
        document.body.appendChild(link); 
        link.click();
    };

    const openGuestUrl = (hash: string) => {
        window.open(`/?qr=${hash}`, '_blank');
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Столи та планування залу</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Керуйте списком столів, генерацією QR-кодів та інтерактивним 2D-конструктором
                    </p>
                </div>
                
                <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                    <button 
                        onClick={() => setIsEditorMode(false)} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${!isEditorMode ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                        <ListBulletIcon className="w-5 h-5"/> Список і QR
                    </button>
                    <button 
                        onClick={() => setIsEditorMode(true)} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${isEditorMode ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                        <MapIcon className="w-5 h-5"/> 2D Конструктор залу
                    </button>
                </div>
            </div>

            {!isEditorMode ? (
                <>
                    <div className="flex flex-wrap gap-4 mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">№:</span>
                            <input 
                                type="number" 
                                className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-xl w-28 font-medium placeholder:text-slate-400 text-center" 
                                value={num} 
                                onChange={e => setNum(e.target.value)} 
                                placeholder="Стіл №" 
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Зона:</span>
                            <select 
                                value={newZone} 
                                onChange={e => setNewZone(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-xl text-sm font-medium"
                            >
                                {ZONES.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Форма:</span>
                            <select 
                                value={newShape} 
                                onChange={e => setNewShape(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-xl text-sm font-medium"
                            >
                                <option value="SQUARE">Квадратний</option>
                                <option value="RECTANGLE">Прямокутний</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Місць:</span>
                            <select 
                                value={newSeats} 
                                onChange={e => setNewSeats(Number(e.target.value))}
                                className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-xl text-sm font-medium"
                            >
                                <option value={2}>2 місця</option>
                                <option value={4}>4 місця</option>
                                <option value={6}>6 місць</option>
                                <option value={8}>8 місць</option>
                            </select>
                        </div>

                        <button 
                            onClick={addTable} 
                            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 ml-auto"
                        >
                            <PlusIcon className="w-5 h-5"/> Створити стіл
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {tables.map(t => {
                            const zoneObj = ZONES.find(z => z.id === t.zone) || ZONES[0];
                            return (
                                <div key={t.id} className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                    <div className="absolute top-0 w-full h-1.5 bg-amber-500"></div>
                                    
                                    <div className="w-full flex justify-between items-center mb-3 mt-1">
                                        <div>
                                            <h3 className="font-bold text-xl text-slate-900 dark:text-white">Стіл {t.number}</h3>
                                            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                                {zoneObj.name} • {t.seats || 4} місць
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => openGuestUrl(t.qrCodeHash)} 
                                            title="Відкрити меню гостя (Симуляція)" 
                                            className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                                        >
                                            <LinkIcon className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <AuthImage id={t.id} hash={t.qrCodeHash} />
                                    
                                    <div className="flex gap-2 w-full mt-2">
                                        <button 
                                            onClick={() => downloadQR(t.id, t.number)} 
                                            className="flex-1 bg-slate-100 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 py-2.5 rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            Завантажити
                                        </button>
                                        <button 
                                            onClick={() => regen(t.id)} 
                                            className="flex-1 bg-red-50 dark:bg-red-500/10 font-bold text-red-600 dark:text-red-400 py-2.5 rounded-xl text-xs hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                                        >
                                            Оновити
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
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
    const [currentZone, setCurrentZone] = useState('MAIN');
    const [positions, setPositions] = useState<Record<string, {
        x: number;
        y: number;
        shape: string;
        seats: number;
        rotation: number;
        zone: string;
    }>>({});
    const [elements, setElements] = useState<HallElementItem[]>([]);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [saving, setSaving] = useState(false);

    // Завантаження елементів інтер'єру для поточної зони
    const loadElements = async (zone: string) => {
        try {
            const res = await api.get(`/hall-elements?zone=${zone}`);
            setElements(res.data);
        } catch (e) {
            console.error('Failed to load hall elements', e);
        }
    };

    useEffect(() => {
        loadElements(currentZone);
    }, [currentZone]);

    useEffect(() => {
        setPositions(prev => {
            const next = { ...prev };
            tables.forEach((t, i) => {
                if (!next[t.id]) {
                    next[t.id] = {
                        x: t.positionX ?? (12 + (i % 6) * 14),
                        y: t.positionY ?? (15 + Math.floor(i / 6) * 20),
                        shape: t.shape || 'SQUARE',
                        seats: t.seats || 4,
                        rotation: t.rotation || 0,
                        zone: t.zone || 'MAIN'
                    };
                }
            });
            return next;
        });
    }, [tables]);

    // Допоміжна функція прив'язки до сітки
    const snapValue = (val: number, step = 2.5) => {
        if (!snapToGrid) return Math.round(val * 10) / 10;
        return Math.round(val / step) * step;
    };

    // Перетягування столу з використанням Pointer Capture
    const handleTablePointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
        if (e.button !== 0) return;
        e.stopPropagation();

        const targetEl = e.currentTarget;
        const pointerId = e.pointerId;
        try {
            targetEl.setPointerCapture(pointerId);
        } catch (_) {}

        setSelectedTableId(id);
        setSelectedElementId(null);

        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const startX = positions[id]?.x ?? 50;
        const startY = positions[id]?.y ?? 50;
        const startMouseX = e.clientX;
        const startMouseY = e.clientY;
        let isDragging = false;

        const handlePointerMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startMouseX;
            const dy = ev.clientY - startMouseY;

            if (!isDragging && Math.hypot(dx, dy) > 4) {
                isDragging = true;
            }

            if (isDragging) {
                const percentDx = (dx / containerRect.width) * 100;
                const percentDy = (dy / containerRect.height) * 100;

                let newX = snapValue(startX + percentDx);
                let newY = snapValue(startY + percentDy);

                newX = Math.max(4, Math.min(96, newX));
                newY = Math.max(5, Math.min(95, newY));

                setPositions(prev => ({
                    ...prev,
                    [id]: { ...prev[id], x: newX, y: newY }
                }));
            }
        };

        const handlePointerUp = () => {
            try {
                targetEl.releasePointerCapture(pointerId);
            } catch (_) {}

            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    };

    // Перетягування елемента інтер'єру або зрізу
    const handleElementPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
        if (e.button !== 0) return;
        e.stopPropagation();

        const targetEl = e.currentTarget;
        const pointerId = e.pointerId;
        try {
            targetEl.setPointerCapture(pointerId);
        } catch (_) {}

        setSelectedElementId(id);
        setSelectedTableId(null);

        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const el = elements.find(item => item.id === id);
        if (!el) return;

        const startX = el.positionX;
        const startY = el.positionY;
        const startMouseX = e.clientX;
        const startMouseY = e.clientY;
        let isDragging = false;

        const handlePointerMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startMouseX;
            const dy = ev.clientY - startMouseY;

            if (!isDragging && Math.hypot(dx, dy) > 4) {
                isDragging = true;
            }

            if (isDragging) {
                const percentDx = (dx / containerRect.width) * 100;
                const percentDy = (dy / containerRect.height) * 100;

                let newX = snapValue(startX + percentDx);
                let newY = snapValue(startY + percentDy);

                newX = Math.max(0, Math.min(100, newX));
                newY = Math.max(0, Math.min(100, newY));

                setElements(prev => prev.map(item => item.id === id ? { ...item, positionX: newX, positionY: newY } : item));
            }
        };

        const handlePointerUp = () => {
            try {
                targetEl.releasePointerCapture(pointerId);
            } catch (_) {}

            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    };

    // Додавання нового елемента інтер'єру або зрізу
    const addDecorElement = (type: HallElementItem['type'], defaultName: string) => {
        let defaultWidth = 16;
        let defaultHeight = 10;
        let defaultX = 50;
        let defaultY = 50;
        
        if (type === 'WALL') {
            defaultWidth = 30;
            defaultHeight = 4;
        } else if (type === 'VOID') {
            defaultWidth = 35;
            defaultHeight = 35;
            defaultX = 80;
            defaultY = 20;
        } else if (type === 'BAR') {
            defaultWidth = 24;
            defaultHeight = 12;
        }

        const newEl: HallElementItem = {
            id: 'temp-' + Date.now(),
            name: defaultName,
            type: type,
            zone: currentZone,
            positionX: defaultX,
            positionY: defaultY,
            width: defaultWidth,
            height: defaultHeight,
            rotation: 0
        };
        setElements(prev => [...prev, newEl]);
        setSelectedElementId(newEl.id);
        setSelectedTableId(null);
    };

    // Зміна розмірів виділеного елемента (ширина / висота)
    const changeElementSize = (deltaW: number, deltaH: number) => {
        if (!selectedElementId) return;
        setElements(prev => prev.map(item => {
            if (item.id === selectedElementId) {
                const newW = Math.max(2.5, Math.min(95, Math.round((item.width + deltaW) * 10) / 10));
                const newH = Math.max(2.5, Math.min(95, Math.round((item.height + deltaH) * 10) / 10));
                return { ...item, width: newW, height: newH };
            }
            return item;
        }));
    };

    // Видалення елемента
    const deleteElement = (id: string) => {
        setElements(prev => prev.filter(item => item.id !== id));
        if (selectedElementId === id) setSelectedElementId(null);
    };

    // Обертання елемента або столу
    const rotateSelectedTable = () => {
        if (!selectedTableId) return;
        setPositions(prev => {
            const current = prev[selectedTableId];
            if (!current) return prev;
            return {
                ...prev,
                [selectedTableId]: {
                    ...current,
                    rotation: (current.rotation + 90) % 360
                }
            };
        });
    };

    const rotateSelectedElement = () => {
        if (!selectedElementId) return;
        setElements(prev => prev.map(item => {
            if (item.id === selectedElementId) {
                return { ...item, rotation: (item.rotation + 45) % 360 };
            }
            return item;
        }));
    };

    // Зміна форми виділеного столу
    const setTableShape = (shape: string) => {
        if (!selectedTableId) return;
        setPositions(prev => ({
            ...prev,
            [selectedTableId]: { ...prev[selectedTableId], shape }
        }));
    };

    // Зміна місць виділеного столу
    const changeSeats = (delta: number) => {
        if (!selectedTableId) return;
        setPositions(prev => {
            const cur = prev[selectedTableId];
            const newSeats = Math.max(1, Math.min(12, (cur?.seats || 4) + delta));
            return {
                ...prev,
                [selectedTableId]: { ...cur, seats: newSeats }
            };
        });
    };

    // Зміна зони виділеного столу
    const setTableZone = (targetZone: string) => {
        if (!selectedTableId) return;
        setPositions(prev => ({
            ...prev,
            [selectedTableId]: { ...prev[selectedTableId], zone: targetZone }
        }));
    };

    // Збереження всієї схеми
    const saveLayout = async () => {
        setSaving(true);
        try {
            const tablesPayload = Object.entries(positions).map(([id, pos]) => ({
                id,
                positionX: pos.x,
                positionY: pos.y,
                zone: pos.zone,
                shape: pos.shape,
                seats: pos.seats,
                rotation: pos.rotation
            }));
            await api.patch('/tables/positions', tablesPayload);

            const elementsPayload = elements.map(el => ({
                id: el.id && !el.id.startsWith('temp-') ? el.id : null,
                name: el.name,
                type: el.type,
                zone: currentZone,
                positionX: el.positionX,
                positionY: el.positionY,
                width: el.width,
                height: el.height,
                rotation: el.rotation
            }));
            const res = await api.put(`/hall-elements/zone/${currentZone}`, elementsPayload);
            if (res.data) {
                setElements(res.data);
            } else {
                loadElements(currentZone);
            }

            alert('Схему залу успішно збережено!');
            reloadTables();
        } catch (e: any) {
            alert('Помилка збереження: ' + (e.response?.data?.message || e.message));
        } finally {
            setSaving(false);
        }
    };

    const zoneTables = tables.filter(t => (positions[t.id]?.zone || t.zone || 'MAIN') === currentZone);
    const selectedTableData = selectedTableId ? { ...tables.find(t => t.id === selectedTableId), ...positions[selectedTableId] } : null;
    const selectedElementData = selectedElementId ? elements.find(el => el.id === selectedElementId) : null;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            
            {/* Header: Zone Selector & Action Buttons */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl w-fit">
                        {ZONES.map(z => {
                            const count = tables.filter(t => (positions[t.id]?.zone || t.zone || 'MAIN') === z.id).length;
                            return (
                                <button
                                    key={z.id}
                                    onClick={() => {
                                        setCurrentZone(z.id);
                                        setSelectedTableId(null);
                                        setSelectedElementId(null);
                                    }}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                        currentZone === z.id
                                            ? 'bg-amber-600 text-white shadow-md'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {z.name}
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        currentZone === z.id ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button
                        onClick={() => setSnapToGrid(!snapToGrid)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            snapToGrid
                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500'
                        }`}
                        title="Магнітна сітка допомагає вирівнювати столи"
                    >
                        <SparklesIcon className="w-4 h-4"/>
                        Сітка: {snapToGrid ? 'Увімк (2.5%)' : 'Вимк'}
                    </button>

                    <button 
                        onClick={saveLayout} 
                        disabled={saving} 
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                        <CheckIcon className="w-5 h-5"/> {saving ? 'Збереження...' : 'Зберегти схему'}
                    </button>
                </div>
            </div>

            {/* Toolbar for Adding Interior / Architecture Elements */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400 mr-2 uppercase tracking-wider">
                    Контур залу та інтер'єр:
                </span>

                <button 
                    onClick={() => addDecorElement('VOID', 'Зріз площі')} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold transition-colors border border-amber-500/40 shadow-sm"
                    title="Додає прямокутник, який вирізає частину площі залу. Можна додати кілька таких блоків і перетягувати куди завгодно."
                >
                    <Scissors className="w-3.5 h-3.5" /> + Зріз площі
                </button>

                <button 
                    onClick={() => addDecorElement('WALL', 'Стіна / Перегородка')} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 dark:text-slate-300 font-bold transition-colors border border-slate-500/20"
                >
                    <BrickWall className="w-3.5 h-3.5" /> Стіна
                </button>
                
                <button 
                    onClick={() => addDecorElement('BAR', 'Барна стійка')} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold transition-colors border border-amber-500/20"
                >
                    <Wine className="w-3.5 h-3.5" /> Барна стійка
                </button>

                <button 
                    onClick={() => addDecorElement('KITCHEN', 'Роздача кухні')} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold transition-colors border border-emerald-500/20"
                >
                    <ChefHat className="w-3.5 h-3.5" /> Роздача кухні
                </button>

                <button 
                    onClick={() => addDecorElement('ENTRANCE', 'Вхід / Вихід')} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold transition-colors border border-blue-500/20"
                >
                    <DoorOpen className="w-3.5 h-3.5" /> Вхід
                </button>

                <button 
                    onClick={() => addDecorElement('WC', 'Вбиральня')} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 font-bold transition-colors border border-purple-500/20"
                >
                    <Bath className="w-3.5 h-3.5" /> WC
                </button>

                <button 
                    onClick={() => addDecorElement('PLANT', 'Озеленення')} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-400 font-bold transition-colors border border-teal-500/20"
                >
                    <Trees className="w-3.5 h-3.5" /> Озеленення
                </button>
            </div>

            {/* Persistent Control Bar */}
            <div className="min-h-[64px] flex items-center">
                {selectedTableData ? (
                    <div className="w-full flex flex-wrap items-center justify-between gap-4 p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/80 animate-fadeIn">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white font-black flex items-center justify-center text-base shadow-sm">
                                {selectedTableData.number}
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 dark:text-white text-sm">
                                    Стіл №{selectedTableData.number}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    X: {Math.round(selectedTableData.x)}%, Y: {Math.round(selectedTableData.y)}%
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Форма */}
                            <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-amber-200 dark:border-slate-700 text-xs font-semibold">
                                <button 
                                    onClick={() => setTableShape('SQUARE')}
                                    className={`px-3 py-1 rounded-lg transition-colors ${selectedTableData.shape !== 'RECTANGLE' ? 'bg-amber-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                                >
                                    Квадрат
                                </button>
                                <button 
                                    onClick={() => setTableShape('RECTANGLE')}
                                    className={`px-3 py-1 rounded-lg transition-colors ${selectedTableData.shape === 'RECTANGLE' ? 'bg-amber-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                                >
                                    Прямокутник
                                </button>
                            </div>

                            {/* Кількість місць */}
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-amber-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
                                <span className="text-slate-400 mr-1">Місць:</span>
                                <button onClick={() => changeSeats(-1)} className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-amber-600 dark:text-amber-400">-</button>
                                <span className="px-1">{selectedTableData.seats || 4}</span>
                                <button onClick={() => changeSeats(1)} className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-amber-600 dark:text-amber-400">+</button>
                            </div>

                            {/* Обертання / Орієнтація */}
                            <button 
                                onClick={rotateSelectedTable}
                                className="flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-slate-700 text-xs font-bold transition-colors"
                                title="Змінити орієнтацію на 90°"
                            >
                                <ArrowPathIcon className="w-4 h-4"/>
                                {selectedTableData.shape === 'RECTANGLE' 
                                    ? ((selectedTableData.rotation % 180 === 90 || selectedTableData.rotation % 180 === 270) ? '↕ Вертикально' : '↔ Горизонтально') 
                                    : `${selectedTableData.rotation || 0}°`}
                            </button>

                            {/* Перемістити в іншу зону */}
                            <select
                                value={selectedTableData.zone || 'MAIN'}
                                onChange={e => setTableZone(e.target.value)}
                                className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-amber-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
                            >
                                {ZONES.map(z => <option key={z.id} value={z.id}>Зона: {z.name}</option>)}
                            </select>

                            {/* Закрити */}
                            <button 
                                onClick={() => setSelectedTableId(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors ml-1"
                                title="Закрити панель"
                            >
                                <XMarkIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                ) : selectedElementData ? (
                    <div className="w-full flex flex-wrap items-center justify-between gap-4 p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/80 animate-fadeIn">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                                {getElementIcon(selectedElementData.type, 'w-5 h-5')}
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 dark:text-white text-sm">
                                    {selectedElementData.type === 'VOID' ? 'Зріз площі залу (Вирізана зона)' : selectedElementData.name}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {selectedElementData.type === 'VOID' 
                                        ? 'Перетягуйте по полотну для відсікання кутів або ніш приміщення'
                                        : `X: ${Math.round(selectedElementData.positionX)}%, Y: ${Math.round(selectedElementData.positionY)}%`}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Налаштування ширини/довжини */}
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
                                <span className="text-slate-400 mr-1">Довжина:</span>
                                <button onClick={() => changeElementSize(-5, 0)} className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-400">-</button>
                                <span className="px-1 min-w-[28px] text-center">{Math.round(selectedElementData.width)}%</span>
                                <button onClick={() => changeElementSize(5, 0)} className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-400">+</button>
                            </div>

                            {/* Налаштування висоти/товщини */}
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
                                <span className="text-slate-400 mr-1">Товщина:</span>
                                <button onClick={() => changeElementSize(0, -2)} className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-400">-</button>
                                <span className="px-1 min-w-[28px] text-center">{Math.round(selectedElementData.height)}%</span>
                                <button onClick={() => changeElementSize(0, 2)} className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-400">+</button>
                            </div>

                            {/* Обертання */}
                            <button 
                                onClick={rotateSelectedElement}
                                className="flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-slate-700 text-xs font-bold transition-colors"
                                title="Повернути на 45°"
                            >
                                <ArrowPathIcon className="w-4 h-4"/>
                                {selectedElementData.rotation || 0}°
                            </button>

                            {/* Видалити */}
                            <button 
                                onClick={() => deleteElement(selectedElementData.id)}
                                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-sm"
                            >
                                <TrashIcon className="w-4 h-4"/> Видалити
                            </button>

                            {/* Закрити */}
                            <button 
                                onClick={() => setSelectedElementId(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors ml-1"
                                title="Закрити панель"
                            >
                                <XMarkIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-2">
                            <MousePointerClick className="w-4 h-4 text-amber-600 shrink-0" />
                            <span><b>Налаштування:</b> Клікніть на будь-який стіл, стіну чи зріз площі на плані, щоб змінити розміри, форму чи перемістити.</span>
                        </span>
                        <span className="text-2xs opacity-75 hidden sm:inline">
                            Перетягуйте мишкою або пальцем
                        </span>
                    </div>
                )}
            </div>

            {/* Interactive Blueprint Canvas */}
            <div 
                ref={containerRef} 
                onPointerDown={(e) => {
                    if (e.target === containerRef.current) {
                        setSelectedTableId(null);
                        setSelectedElementId(null);
                    }
                }}
                className="w-full aspect-[4/3] md:aspect-[16/9] rounded-3xl relative overflow-hidden shadow-2xl cursor-default select-none"
                style={{ touchAction: 'none' }}
            >
                {/* SVG Blueprint Floor natively masked inside SVG */}
                <svg className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden pointer-events-none" width="100%" height="100%">
                    <defs>
                        <mask id={`admin-hall-mask-${currentZone}`} maskContentUnits="objectBoundingBox">
                            <rect x="0" y="0" width="1" height="1" fill="white" />
                            {elements.filter(el => (el.zone || 'MAIN') === currentZone && el.type === 'VOID').map(el => (
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
                        <pattern id={`admin-grid-dots-${currentZone}`} width="30" height="30" patternUnits="userSpaceOnUse">
                            <circle cx="2" cy="2" r="1.5" fill="rgba(255, 255, 255, 0.08)" />
                        </pattern>
                    </defs>
                    <rect 
                        width="100%" 
                        height="100%" 
                        fill="#0c0a09" 
                        mask={elements.some(el => (el.zone || 'MAIN') === currentZone && el.type === 'VOID') ? `url(#admin-hall-mask-${currentZone})` : undefined} 
                    />
                    <rect 
                        width="100%" 
                        height="100%" 
                        fill={`url(#admin-grid-dots-${currentZone})`} 
                        mask={elements.some(el => (el.zone || 'MAIN') === currentZone && el.type === 'VOID') ? `url(#admin-hall-mask-${currentZone})` : undefined} 
                    />
                </svg>

                {/* Zone Label Watermark */}
                <div className="absolute top-4 left-6 text-stone-700 text-2xl font-black tracking-[0.02em] uppercase pointer-events-none select-none">
                    {ZONES.find(z => z.id === currentZone)?.name}
                </div>

                {/* Render Hall Interior Decor, Walls and Multiple Area Cutouts */}
                {elements.map(el => {
                    const isSelected = selectedElementId === el.id;
                    const rot = el.rotation || 0;

                    if (el.type === 'VOID') {
                        return (
                            <div
                                key={el.id}
                                onPointerDown={(e) => handleElementPointerDown(e, el.id)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedElementId(el.id);
                                    setSelectedTableId(null);
                                }}
                                className={`absolute border-2 border-dashed rounded-2xl flex items-center justify-center cursor-grab active:cursor-grabbing transition-[border-color,background-color,box-shadow] ${
                                    isSelected 
                                        ? 'border-amber-400 bg-amber-500/15 ring-4 ring-amber-400/40 z-30 scale-102' 
                                        : 'border-stone-500/50 bg-stone-950/70 hover:border-amber-400/60 z-15'
                                }`}
                                style={{
                                    left: `${el.positionX}%`,
                                    top: `${el.positionY}%`,
                                    width: `${el.width}%`,
                                    height: `${el.height}%`,
                                    transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                                    touchAction: 'none'
                                }}
                                title="Зріз площі (Перетягніть мишкою або змініть розміри в панелі)"
                            >
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-xs text-amber-300 font-bold text-2xs select-none pointer-events-none border border-amber-500/30">
                                    <Scissors className="w-3.5 h-3.5" />
                                    <span>Зріз {Math.round(el.width)}×{Math.round(el.height)}%</span>
                                </div>
                            </div>
                        );
                    }

                    let bgStyle = 'bg-stone-800/90 border-stone-600 text-stone-200';
                    let iconNode: React.ReactNode = <BrickWall className="w-3.5 h-3.5 shrink-0" />;

                    if (el.type === 'WALL') {
                        bgStyle = 'bg-stone-700 border-stone-500 text-stone-200 shadow-md';
                        iconNode = null;
                    } else if (el.type === 'BAR') {
                        bgStyle = 'bg-amber-950/80 border-amber-600/80 text-amber-200';
                        iconNode = <Wine className="w-3.5 h-3.5 shrink-0" />;
                    } else if (el.type === 'KITCHEN') {
                        bgStyle = 'bg-emerald-950/80 border-emerald-600/80 text-emerald-200';
                        iconNode = <ChefHat className="w-3.5 h-3.5 shrink-0" />;
                    } else if (el.type === 'ENTRANCE') {
                        bgStyle = 'bg-blue-950/80 border-blue-500/80 text-blue-200 border-dashed';
                        iconNode = <DoorOpen className="w-3.5 h-3.5 shrink-0" />;
                    } else if (el.type === 'WC') {
                        bgStyle = 'bg-purple-950/80 border-purple-600/80 text-purple-200';
                        iconNode = <Bath className="w-3.5 h-3.5 shrink-0" />;
                    } else if (el.type === 'PLANT') {
                        bgStyle = 'bg-teal-950/80 border-teal-600/80 text-teal-200';
                        iconNode = <Trees className="w-3.5 h-3.5 shrink-0" />;
                    }

                    return (
                        <div
                            key={el.id}
                            onPointerDown={(e) => handleElementPointerDown(e, el.id)}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedElementId(el.id);
                                setSelectedTableId(null);
                            }}
                            className={`absolute border-2 rounded-xl flex items-center justify-center gap-1.5 cursor-grab active:cursor-grabbing backdrop-blur-md shadow-lg transition-transform ${bgStyle} ${
                                isSelected ? 'ring-4 ring-amber-400 z-30 scale-102' : 'hover:scale-101 z-10'
                            }`}
                            style={{
                                left: `${el.positionX}%`,
                                top: `${el.positionY}%`,
                                width: `${el.width}%`,
                                height: `${el.height}%`,
                                transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                                touchAction: 'none'
                            }}
                            title={el.name}
                        >
                            {el.type !== 'WALL' && (
                                <div 
                                    className="flex items-center justify-center gap-1.5 max-w-full px-1"
                                    style={{ transform: `rotate(${-rot}deg)` }}
                                >
                                    {iconNode}
                                    <span className="font-bold text-2xs select-none tracking-wide truncate opacity-90">
                                        {el.name}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Render Tables */}
                {zoneTables.map(t => {
                    const pos = positions[t.id];
                    if (!pos) return null;

                    const isSelected = selectedTableId === t.id;
                    const shape = (pos.shape === 'ROUND' ? 'SQUARE' : pos.shape) || 'SQUARE';
                    const seats = pos.seats || 4;
                    const rot = pos.rotation || 0;
                    const isVertical = shape === 'RECTANGLE' && (rot % 180 === 90 || rot % 180 === 270);

                    let shapeClasses = 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl';
                    if (shape === 'RECTANGLE') {
                        shapeClasses = isVertical 
                            ? 'w-20 h-28 sm:w-24 sm:h-36 md:w-28 md:h-40 rounded-2xl'
                            : 'w-28 h-20 sm:w-36 sm:h-24 md:w-40 md:h-28 rounded-2xl';
                    }

                    return (
                        <div
                            key={t.id}
                            onPointerDown={(e) => handleTablePointerDown(e, t.id)}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTableId(t.id);
                                setSelectedElementId(null);
                            }}
                            className={`absolute bg-stone-800 text-white flex flex-col justify-between items-center p-2.5 shadow-xl cursor-grab active:cursor-grabbing border-2 border-amber-500/80 transition-transform ${shapeClasses} ${
                                isSelected ? 'ring-4 ring-amber-400 z-40 scale-105 bg-amber-700 border-amber-300' : 'hover:scale-102 z-20'
                            }`}
                            style={{
                                left: `${pos.x}%`,
                                top: `${pos.y}%`,
                                transform: 'translate(-50%, -50%)',
                                touchAction: 'none'
                            }}
                            title={`Стіл №${t.number} (${seats} місць)`}
                        >
                            <div className="w-full flex items-center justify-between px-0.5 leading-none select-none">
                                <span className="text-sm sm:text-base md:text-lg font-black">
                                    №{t.number}
                                </span>
                                <span className="flex items-center gap-0.5 text-3xs sm:text-xs font-bold px-1.5 py-0.5 rounded-md bg-black/30 text-stone-100">
                                    <UsersIcon className="w-3 h-3" /> {seats}
                                </span>
                            </div>

                            <div className="text-3xs sm:text-2xs font-bold text-amber-200 select-none my-auto">
                                {shape === 'RECTANGLE' ? (isVertical ? 'Вертикальний' : 'Горизонтальний') : 'Квадрат'}
                            </div>

                            <div className="text-4xs text-stone-300 font-mono font-medium select-none">
                                {Math.round(pos.x)}%, {Math.round(pos.y)}%
                            </div>
                        </div>
                    );
                })}

                {zoneTables.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-stone-500 text-sm font-medium pointer-events-none">
                        У цій зоні ще немає столів. Перетягніть стіл сюди або створіть новий.
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                    <span><b>Підказка:</b> Додавайте <b>«+ Зріз площі»</b>, щоб відсікати будь-яку кількість кутів та ніш, надаючи залу нестандартної форми.</span>
                </div>
                <div>
                    Перетягуйте мишкою або пальцем.
                </div>
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
