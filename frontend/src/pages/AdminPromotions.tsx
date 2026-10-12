import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import {
    MegaphoneIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    PhotoIcon,
    XMarkIcon,
    SparklesIcon,
    ShoppingBagIcon,
    BellAlertIcon,
    InformationCircleIcon,
    MagnifyingGlassIcon,
    CheckIcon
} from '@heroicons/react/24/outline';

interface Promotion {
    id: string;
    title: string;
    badgeText?: string;
    shortDescription?: string;
    fullContent?: string;
    imageUrl?: string;
    actionType: 'NONE' | 'MENU_ITEM' | 'CALL_WAITER';
    targetMenuItemId?: number;
    targetMenuItemName?: string;
    active: boolean;
    displayOrder: number;
    createdAt: string;
}

interface MenuItemOption {
    id: number;
    name: string;
    price: number;
    categoryName?: string;
    imageUrl?: string;
}

export default function AdminPromotions() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
    const [loading, setLoading] = useState(true);

    // Стан модального вікна
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Поля форми
    const [title, setTitle] = useState('');
    const [badgeText, setBadgeText] = useState('');
    const [shortDescription, setShortDescription] = useState('');
    const [fullContent, setFullContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [actionType, setActionType] = useState<'NONE' | 'MENU_ITEM' | 'CALL_WAITER'>('NONE');
    const [targetMenuItemId, setTargetMenuItemId] = useState<number | ''>('');
    const [displayOrder, setDisplayOrder] = useState<number>(0);
    const [active, setActive] = useState(true);

    // Стан пошуку та вибору страви
    const [dishSearch, setDishSearch] = useState('');
    const [isDishDropdownOpen, setIsDishDropdownOpen] = useState(false);

    const fetchPromotions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/promotions');
            setPromotions(res.data);
        } catch (e) {
            console.error('Помилка завантаження акцій', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchMenuItems = async () => {
        try {
            const res = await api.get('/menu/items');
            // res.data вже містить активні страви з бекенду
            setMenuItems(res.data || []);
        } catch (e) {
            console.error('Помилка завантаження страв', e);
        }
    };

    useEffect(() => {
        fetchPromotions();
        fetchMenuItems();
    }, []);

    const openCreateModal = () => {
        setEditingPromotion(null);
        setTitle('');
        setBadgeText('');
        setShortDescription('');
        setFullContent('');
        setImageUrl('');
        setActionType('NONE');
        setTargetMenuItemId('');
        setDisplayOrder(promotions.length);
        setActive(true);
        setDishSearch('');
        setIsDishDropdownOpen(false);
        setModalOpen(true);
    };

    const openEditModal = (p: Promotion) => {
        setEditingPromotion(p);
        setTitle(p.title);
        setBadgeText(p.badgeText || '');
        setShortDescription(p.shortDescription || '');
        setFullContent(p.fullContent || '');
        setImageUrl(p.imageUrl || '');
        setActionType(p.actionType || 'NONE');
        setTargetMenuItemId(p.targetMenuItemId || '');
        setDisplayOrder(p.displayOrder || 0);
        setActive(p.active);
        setDishSearch('');
        setIsDishDropdownOpen(false);
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            alert('Будь ласка, вкажіть заголовок акції');
            return;
        }

        if (actionType === 'MENU_ITEM' && !targetMenuItemId) {
            alert('Будь ласка, оберіть страву з меню для цієї акції');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                title: title.trim(),
                badgeText: badgeText.trim() || null,
                shortDescription: shortDescription.trim() || null,
                fullContent: fullContent.trim() || null,
                imageUrl: imageUrl.trim() || null,
                actionType,
                targetMenuItemId: actionType === 'MENU_ITEM' && targetMenuItemId ? Number(targetMenuItemId) : null,
                displayOrder: Number(displayOrder) || 0,
                active
            };

            if (editingPromotion) {
                await api.put(`/promotions/${editingPromotion.id}`, payload);
            } else {
                await api.post('/promotions', payload);
            }

            setModalOpen(false);
            fetchPromotions();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Помилка збереження акції');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggle = async (id: string) => {
        try {
            await api.patch(`/promotions/${id}/toggle`);
            setPromotions(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
        } catch (e) {
            alert('Не вдалося змінити статус акції');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Видалити акцію «${name}»?`)) return;
        try {
            await api.delete(`/promotions/${id}`);
            setPromotions(prev => prev.filter(p => p.id !== id));
        } catch (e) {
            alert('Не вдалося видалити акцію');
        }
    };

    // Фільтрація страв за пошуковим запитом
    const filteredDishes = useMemo(() => {
        if (!dishSearch.trim()) return menuItems;
        const q = dishSearch.toLowerCase();
        return menuItems.filter(item =>
            item.name.toLowerCase().includes(q) ||
            (item.categoryName && item.categoryName.toLowerCase().includes(q))
        );
    }, [menuItems, dishSearch]);

    const selectedDish = useMemo(() => {
        return menuItems.find(m => m.id === targetMenuItemId);
    }, [menuItems, targetMenuItemId]);

    const activeCount = promotions.filter(p => p.active).length;
    const ctaCount = promotions.filter(p => p.actionType !== 'NONE').length;

    return (
        <div className="h-full overflow-y-auto p-6 lg:p-10 space-y-6">
            {/* Заголовок сторінки */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <MegaphoneIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400 stroke-2" />
                        Акції та спеціальні пропозиції
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Управління промо-слайдером для гостей, сторінками знижок та кнопками швидкої дії
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-500/20 active:scale-95"
                    >
                        <PlusIcon className="w-5 h-5 stroke-2" />
                        <span>Створити акцію</span>
                    </button>
                </div>
            </div>

            {/* Метрики */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Всього створено акцій
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {promotions.length}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Активні на слайдері зараз
                    </div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-2">
                        {activeCount}
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        З прямою дією (CTA / Замовлення)
                    </div>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                        {ctaCount}
                    </div>
                </div>
            </div>

            {/* Список карток акцій */}
            {promotions.length === 0 && !loading ? (
                <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 text-slate-400">
                    <SparklesIcon className="w-12 h-12 mx-auto text-indigo-400 stroke-1 mb-3 opacity-60" />
                    <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">Поки що немає акцій</h3>
                    <p className="text-sm mt-1 max-w-sm mx-auto">
                        Створіть свій перший рекламний банер або знижку, щоб зацікавити гостей та підвищити продажі
                    </p>
                    <button
                        onClick={openCreateModal}
                        className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-500 shadow-xs"
                    >
                        <PlusIcon className="w-4 h-4 stroke-2" /> Додати акцію
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {promotions.map((p) => (
                        <div
                            key={p.id}
                            className={`bg-white dark:bg-slate-800/90 rounded-3xl overflow-hidden border transition-all flex flex-col shadow-xs ${
                                p.active 
                                    ? 'border-slate-200 dark:border-slate-750 hover:shadow-md' 
                                    : 'border-slate-200/50 dark:border-slate-800/50 opacity-60 bg-slate-50/50 dark:bg-slate-900/40'
                            }`}
                        >
                            {/* Постер акції */}
                            <div className="relative aspect-[16/9] w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                                {p.imageUrl ? (
                                    <img
                                        src={p.imageUrl}
                                        alt={p.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
                                        <PhotoIcon className="w-10 h-10 stroke-1" />
                                        <span className="text-xs">Без зображення</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>

                                {/* Бейдж зверху */}
                                {p.badgeText && (
                                    <div className="absolute top-3 left-3 px-3 py-1 bg-amber-500/90 text-white text-xs font-black uppercase tracking-wider rounded-full shadow-md backdrop-blur-xs">
                                        {p.badgeText}
                                    </div>
                                )}

                                {/* Індикатор порядку */}
                                <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/50 text-white/90 text-[11px] font-mono font-bold rounded-lg backdrop-blur-xs">
                                    #{p.displayOrder}
                                </div>

                                {/* Заголовок на банері */}
                                <div className="absolute bottom-3 inset-x-3 text-white">
                                    <h3 className="font-extrabold text-base leading-snug drop-shadow-sm">
                                        {p.title}
                                    </h3>
                                </div>
                            </div>

                            {/* Тіло картки */}
                            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                <div className="space-y-2">
                                    {p.shortDescription && (
                                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                                            {p.shortDescription}
                                        </p>
                                    )}

                                    {/* Інформація про цільову дію CTA */}
                                    <div className="pt-2">
                                        {p.actionType === 'MENU_ITEM' && (
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-xl border border-emerald-500/20">
                                                <ShoppingBagIcon className="w-4 h-4 shrink-0" />
                                                <span className="truncate">Страва: {p.targetMenuItemName || `#${p.targetMenuItemId}`}</span>
                                            </div>
                                        )}
                                        {p.actionType === 'CALL_WAITER' && (
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-xl border border-amber-500/20">
                                                <BellAlertIcon className="w-4 h-4 shrink-0" />
                                                <span>Виклик офіціанта гостем</span>
                                            </div>
                                        )}
                                        {p.actionType === 'NONE' && (
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl">
                                                <InformationCircleIcon className="w-4 h-4 shrink-0" />
                                                <span>Інформаційний перегляд</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Панель дій та перемикач активності */}
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-750 flex items-center justify-between">
                                    {/* Перемикач */}
                                    <button
                                        onClick={() => handleToggle(p.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            p.active 
                                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' 
                                                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${p.active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                        <span>{p.active ? 'Активна' : 'Прихована'}</span>
                                    </button>

                                    {/* Кнопки редагування / видалення */}
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => openEditModal(p)}
                                            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                            title="Редагувати"
                                        >
                                            <PencilSquareIcon className="w-4 h-4 stroke-2" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(p.id, p.title)}
                                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                            title="Видалити"
                                        >
                                            <TrashIcon className="w-4 h-4 stroke-2" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Модальне вікно Створення / Редагування */}
            {modalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
                        {/* Шапка модалки */}
                        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-950/50">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                    {editingPromotion ? 'Редагування акції' : 'Створення нової акції'}
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Заповніть параметри банера та умови для гостей
                                </p>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Форма */}
                        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Заголовок акції *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="наприклад: Знижка 15% до Дня народження"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Бейдж на банері
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="🎂 СВЯТО, 🔥 -20%, ☕ 1+1=3"
                                        value={badgeText}
                                        onChange={(e) => setBadgeText(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Порядок показу (сортування)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={displayOrder}
                                        onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    URL зображення постера (співвідношення 16:9)
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://images.unsplash.com/..."
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                                />
                                {imageUrl && (
                                    <div className="mt-2 relative aspect-[16/9] w-full max-h-36 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                        <img src={imageUrl} alt="Прев'ю" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Короткий слоган для слайдера
                                </label>
                                <input
                                    type="text"
                                    placeholder="Короткий опис на 1-2 рядки для швидкого перегляду"
                                    value={shortDescription}
                                    onChange={(e) => setShortDescription(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Повний текст умов акції (відкривається при кліку)
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder="Детальні правила: дні дії, час, необхідні документи, обмеження..."
                                    value={fullContent}
                                    onChange={(e) => setFullContent(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y"
                                />
                            </div>

                            {/* Блок вибору CTA */}
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Цільова дія клієнта (Call to Action)
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => { setActionType('NONE'); setTargetMenuItemId(''); }}
                                            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                                                actionType === 'NONE'
                                                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20'
                                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <InformationCircleIcon className={`w-5 h-5 mb-2 ${actionType === 'NONE' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                                            <div>
                                                <div className="font-bold text-xs text-slate-900 dark:text-white">Інформаційна</div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Лише правила</div>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setActionType('MENU_ITEM')}
                                            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                                                actionType === 'MENU_ITEM'
                                                    ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50 ring-2 ring-emerald-500/20'
                                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <ShoppingBagIcon className={`w-5 h-5 mb-2 ${actionType === 'MENU_ITEM' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                                            <div>
                                                <div className="font-bold text-xs text-slate-900 dark:text-white">Страва з меню</div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Кнопка «Замовити»</div>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => { setActionType('CALL_WAITER'); setTargetMenuItemId(''); }}
                                            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                                                actionType === 'CALL_WAITER'
                                                    ? 'border-amber-600 dark:border-amber-500 bg-amber-50/70 dark:bg-amber-950/50 ring-2 ring-amber-500/20'
                                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <BellAlertIcon className={`w-5 h-5 mb-2 ${actionType === 'CALL_WAITER' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                                            <div>
                                                <div className="font-bold text-xs text-slate-900 dark:text-white">Виклик офіціанта</div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Повідомити стіл</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Інтерактивний вибір страви */}
                                {actionType === 'MENU_ITEM' && (
                                    <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                                        <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                                            Прив'язана страва з меню *
                                        </label>

                                        {selectedDish && !isDishDropdownOpen ? (
                                            /* Картка обраної страви */
                                            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-emerald-500/30 dark:border-emerald-500/40">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {selectedDish.imageUrl ? (
                                                        <img src={selectedDish.imageUrl} alt={selectedDish.name} className="w-11 h-11 rounded-xl object-cover shrink-0" />
                                                    ) : (
                                                        <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-400">
                                                            <ShoppingBagIcon className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                            {selectedDish.name}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                                                {selectedDish.price} ₴
                                                            </span>
                                                            {selectedDish.categoryName && (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                                                                    {selectedDish.categoryName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsDishDropdownOpen(true)}
                                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-2xs"
                                                    >
                                                        Змінити
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTargetMenuItemId('')}
                                                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
                                                        title="Очистити вибір"
                                                    >
                                                        <XMarkIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Пошуковий селектор страв */
                                            <div className="space-y-2 rounded-2xl p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                                <div className="relative">
                                                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        placeholder="Пошук страви за назвою або категорією..."
                                                        value={dishSearch}
                                                        onChange={(e) => setDishSearch(e.target.value)}
                                                        className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        autoFocus
                                                    />
                                                    {dishSearch && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDishSearch('')}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                                        >
                                                            <XMarkIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl p-1 bg-white/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                                                    {filteredDishes.length === 0 ? (
                                                        <div className="text-center py-4 text-xs text-slate-400">
                                                            Страв не знайдено
                                                        </div>
                                                    ) : (
                                                        filteredDishes.map((item) => {
                                                            const isSelected = item.id === targetMenuItemId;
                                                            return (
                                                                <button
                                                                    key={item.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setTargetMenuItemId(item.id);
                                                                        setIsDishDropdownOpen(false);
                                                                        setDishSearch('');
                                                                    }}
                                                                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                                                                        isSelected
                                                                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                                                                            : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                        {item.imageUrl ? (
                                                                            <img src={item.imageUrl} alt={item.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                                                                        ) : (
                                                                            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-400">
                                                                                <ShoppingBagIcon className="w-4 h-4" />
                                                                            </div>
                                                                        )}
                                                                        <div className="min-w-0">
                                                                            <div className="font-semibold text-xs leading-tight truncate">
                                                                                {item.name}
                                                                            </div>
                                                                            {item.categoryName && (
                                                                                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                                                                    {item.categoryName}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                                                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                                            {item.price} ₴
                                                                        </span>
                                                                        {isSelected && (
                                                                            <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-2" />
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })
                                                    )}
                                                </div>

                                                {selectedDish && (
                                                    <div className="flex justify-end pt-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsDishDropdownOpen(false)}
                                                            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                                                        >
                                                            Скасувати зміну
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center gap-3 pt-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={active}
                                            onChange={(e) => setActive(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                        <span className="ml-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                                            Активувати показ на слайдері гостя
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Кнопки футера */}
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Скасувати
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
                                >
                                    {submitting ? 'Збереження...' : (editingPromotion ? 'Оновити акцію' : 'Створити')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
