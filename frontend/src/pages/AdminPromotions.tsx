import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    CheckIcon,
    GiftIcon,
    TagIcon,
    CubeIcon,
    ArrowUpTrayIcon
} from '@heroicons/react/24/outline';

export interface ComboSlot {
    id: string;
    name: string;
    selectionType: 'CATEGORY' | 'ITEMS';
    categoryId?: number;
    categoryName?: string;
    itemIds: number[];
    itemNames: string[];
    quantity: number;
}

export interface ComboReward {
    rewardType: 'FREE_ITEM' | 'FIXED_PRICE' | 'DISCOUNT_PERCENT';
    selectionType: 'CATEGORY' | 'ITEMS';
    categoryId?: number;
    categoryName?: string;
    itemIds: number[];
    itemNames: string[];
    quantity: number;
    discountPercent?: number;
    fixedPrice?: number;
}

export interface ComboConfig {
    slots: ComboSlot[];
    reward: ComboReward;
}

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
    showInSlider?: boolean;
    displayOrder: number;
    discountPercent?: number;
    usageCount?: number;
    totalDiscountGiven?: number;
    createdAt: string;
    promoType?: 'ORDER_PERCENT' | 'COMBO' | 'INFO';
    comboConfig?: string;
}

interface MenuItemOption {
    id: number;
    name: string;
    price: number;
    categoryId?: number;
    categoryName?: string;
    imageUrl?: string;
}

interface CategoryOption {
    id: number;
    name: string;
}

export default function AdminPromotions() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [loading, setLoading] = useState(true);

    // Стан модального вікна
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Загальні поля форми
    const [title, setTitle] = useState('');
    const [badgeText, setBadgeText] = useState('');
    const [shortDescription, setShortDescription] = useState('');
    const [fullContent, setFullContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [actionType, setActionType] = useState<'NONE' | 'MENU_ITEM' | 'CALL_WAITER'>('NONE');
    const [targetMenuItemId, setTargetMenuItemId] = useState<number | ''>('');
    const [displayOrder, setDisplayOrder] = useState<number>(0);
    const [discountPercent, setDiscountPercent] = useState<number>(0);
    const [active, setActive] = useState(true);
    const [showInSlider, setShowInSlider] = useState(true);
    const [promoType, setPromoType] = useState<'ORDER_PERCENT' | 'COMBO' | 'INFO'>('ORDER_PERCENT');

    // Стан для комбо-акції
    const [comboSlots, setComboSlots] = useState<ComboSlot[]>([]);
    const [comboReward, setComboReward] = useState<ComboReward>({
        rewardType: 'FREE_ITEM',
        selectionType: 'CATEGORY',
        itemIds: [],
        itemNames: [],
        quantity: 1,
        discountPercent: 100,
        fixedPrice: 0
    });

    // Стан пошуку та вибору прив'язаної страви (CTA)
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

    const fetchMenuData = async () => {
        try {
            const [itemsRes, catsRes] = await Promise.all([
                api.get('/menu/items'),
                api.get('/menu/categories').catch(() => ({ data: [] }))
            ]);
            setMenuItems(itemsRes.data || []);

            if (catsRes.data && catsRes.data.length > 0) {
                setCategories(catsRes.data);
            } else {
                // Витягуємо унікальні категорії зі страв, якщо ендпоінт пустий
                const uniqueCats: CategoryOption[] = [];
                const seen = new Set<string>();
                (itemsRes.data || []).forEach((item: any) => {
                    if (item.categoryName && !seen.has(item.categoryName)) {
                        seen.add(item.categoryName);
                        uniqueCats.push({
                            id: item.categoryId || uniqueCats.length + 1,
                            name: item.categoryName
                        });
                    }
                });
                setCategories(uniqueCats);
            }
        } catch (e) {
            console.error('Помилка завантаження меню', e);
        }
    };

    useEffect(() => {
        fetchPromotions();
        fetchMenuData();
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
        setDiscountPercent(0);
        setActive(true);
        setShowInSlider(true);
        setPromoType('ORDER_PERCENT');

        const initialCatId = categories[0]?.id;
        const initialCatName = categories[0]?.name;

        setComboSlots([
            {
                id: 'slot_1',
                name: 'Основна страва',
                selectionType: 'CATEGORY',
                categoryId: initialCatId,
                categoryName: initialCatName,
                itemIds: [],
                itemNames: [],
                quantity: 1
            }
        ]);

        setComboReward({
            rewardType: 'FREE_ITEM',
            selectionType: 'CATEGORY',
            categoryId: initialCatId,
            categoryName: initialCatName,
            itemIds: [],
            itemNames: [],
            quantity: 1,
            discountPercent: 100,
            fixedPrice: 0
        });

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
        setDiscountPercent(p.discountPercent || 0);
        setActive(p.active);
        setShowInSlider(p.showInSlider !== false);

        const type = p.promoType || (p.discountPercent && p.discountPercent > 0 ? 'ORDER_PERCENT' : 'INFO');
        setPromoType(type);

        if (p.comboConfig) {
            try {
                const parsed = JSON.parse(p.comboConfig);
                if (parsed.slots && Array.isArray(parsed.slots)) {
                    setComboSlots(parsed.slots);
                }
                if (parsed.reward) {
                    setComboReward(parsed.reward);
                }
            } catch (e) {
                console.error('Помилка парсингу комбо-конфігурації', e);
            }
        } else {
            const initialCatId = categories[0]?.id;
            const initialCatName = categories[0]?.name;
            setComboSlots([
                {
                    id: 'slot_1',
                    name: 'Основна страва',
                    selectionType: 'CATEGORY',
                    categoryId: initialCatId,
                    categoryName: initialCatName,
                    itemIds: [],
                    itemNames: [],
                    quantity: 1
                }
            ]);
            setComboReward({
                rewardType: 'FREE_ITEM',
                selectionType: 'CATEGORY',
                categoryId: initialCatId,
                categoryName: initialCatName,
                itemIds: [],
                itemNames: [],
                quantity: 1,
                discountPercent: 100,
                fixedPrice: 0
            });
        }

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

        if (promoType === 'COMBO') {
            if (comboSlots.length === 0) {
                alert('Будь ласка, додайте хоча б один слот вимог (Блок А)');
                return;
            }
            for (let i = 0; i < comboSlots.length; i++) {
                const s = comboSlots[i];
                if (s.selectionType === 'CATEGORY' && !s.categoryId) {
                    alert(`Будь ласка, оберіть категорію для слоту #${i + 1}`);
                    return;
                }
                if (s.selectionType === 'ITEMS' && (!s.itemIds || s.itemIds.length === 0)) {
                    alert(`Будь ласка, оберіть хоча б одну страву для слоту #${i + 1}`);
                    return;
                }
            }
            if (comboReward.rewardType === 'FREE_ITEM') {
                if (comboReward.selectionType === 'CATEGORY' && !comboReward.categoryId) {
                    alert('Будь ласка, оберіть категорію для подарунка');
                    return;
                }
                if (comboReward.selectionType === 'ITEMS' && (!comboReward.itemIds || comboReward.itemIds.length === 0)) {
                    alert('Будь ласка, оберіть хоча б одну подарункову страву');
                    return;
                }
            }
        }

        setSubmitting(true);
        try {
            let comboConfigJson: string | null = null;
            if (promoType === 'COMBO') {
                comboConfigJson = JSON.stringify({
                    slots: comboSlots,
                    reward: comboReward
                });
            }

            const payload = {
                title: title.trim(),
                badgeText: badgeText.trim() || null,
                shortDescription: shortDescription.trim() || null,
                fullContent: fullContent.trim() || null,
                imageUrl: imageUrl.trim() || null,
                actionType,
                targetMenuItemId: actionType === 'MENU_ITEM' && targetMenuItemId ? Number(targetMenuItemId) : null,
                displayOrder: Number(displayOrder) || 0,
                discountPercent: promoType === 'ORDER_PERCENT' ? (Number(discountPercent) || 0) : (comboReward.rewardType === 'DISCOUNT_PERCENT' ? (comboReward.discountPercent || 0) : 0),
                active,
                showInSlider,
                promoType,
                comboConfig: comboConfigJson
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

    const handleToggleSlider = async (id: string) => {
        try {
            await api.patch(`/promotions/${id}/toggle-slider`);
            setPromotions(prev => prev.map(p => p.id === id ? { ...p, showInSlider: p.showInSlider === false ? true : false } : p));
        } catch (e) {
            alert('Не вдалося змінити показ у банері');
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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/promotions/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data && res.data.imageUrl) {
                setImageUrl(res.data.imageUrl);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Помилка завантаження зображення');
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const uploadImageForPromoCard = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post(`/promotions/${id}/image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data && res.data.imageUrl) {
                setPromotions(prev => prev.map(p => p.id === id ? { ...p, imageUrl: res.data.imageUrl } : p));
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Помилка завантаження зображення');
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

    // Фільтрація страв для прив'язки CTA
    const filteredDishes = useMemo(() => {
        if (!dishSearch.trim()) return menuItems;
        const q = dishSearch.toLowerCase();
        return menuItems.filter(item =>
            item.name.toLowerCase().includes(q) ||
            (item.categoryName && item.categoryName.toLowerCase().includes(q))
        );
    }, [dishSearch, menuItems]);

    const selectedDish = useMemo(() => {
        if (!targetMenuItemId) return null;
        return menuItems.find(i => i.id === targetMenuItemId) || null;
    }, [targetMenuItemId, menuItems]);

    // Допоміжні функції для слотів комбо
    const addComboSlot = () => {
        const initialCat = categories[0];
        setComboSlots(prev => [
            ...prev,
            {
                id: `slot_${Date.now()}`,
                name: `Страва #${prev.length + 1}`,
                selectionType: 'CATEGORY',
                categoryId: initialCat?.id,
                categoryName: initialCat?.name,
                itemIds: [],
                itemNames: [],
                quantity: 1
            }
        ]);
    };

    const removeComboSlot = (slotId: string) => {
        if (comboSlots.length <= 1) return;
        setComboSlots(prev => prev.filter(s => s.id !== slotId));
    };

    const updateComboSlot = (slotId: string, patch: Partial<ComboSlot>) => {
        setComboSlots(prev => prev.map(s => s.id === slotId ? { ...s, ...patch } : s));
    };

    // Текст формули для прев'ю
    const getFormulaSummary = (slots: ComboSlot[], reward: ComboReward) => {
        const slotsText = slots.map(s => {
            const qty = s.quantity || 1;
            if (s.selectionType === 'CATEGORY') {
                return `${qty}× [Категорія: ${s.categoryName || 'Будь-яка'}]`;
            } else {
                const names = s.itemNames.length > 0 ? s.itemNames.join(', ') : 'Обрані страви';
                return `${qty}× [${names}]`;
            }
        }).join(' + ');

        let rewardText = '';
        if (reward.rewardType === 'FREE_ITEM') {
            const target = reward.selectionType === 'CATEGORY'
                ? `Категорія ${reward.categoryName || ''}`
                : (reward.itemNames.length > 0 ? reward.itemNames.join(', ') : 'Обрана страва');
            rewardText = `🎁 ${reward.quantity || 1}× ${target} (Безкоштовно)`;
        } else if (reward.rewardType === 'FIXED_PRICE') {
            rewardText = `🏷️ Всього ${reward.fixedPrice || 0} ₴ за комбо`;
        } else if (reward.rewardType === 'DISCOUNT_PERCENT') {
            rewardText = `🏷️ Знижка -${reward.discountPercent || 0}% на комбо`;
        }

        return `${slotsText} ➔ ${rewardText}`;
    };

    return (
        <div className="p-6 sm:p-8 max-w-7xl space-y-8 animate-fadeIn">
            {/* Заголовок та кнопка створення */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                            <MegaphoneIcon className="w-6 h-6 stroke-2" />
                        </span>
                        Акції, Комбо та Банери
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Керування промо-слайдером, знижками на чеки та комбо-пропозиціями ресторану
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/25 active:scale-95 transition-all w-full sm:w-auto cursor-pointer"
                >
                    <PlusIcon className="w-5 h-5 stroke-2" />
                    <span>Створити акцію</span>
                </button>
            </div>

            {/* Метрики */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Всього акцій</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                        {promotions.length}
                    </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Активних</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                        {promotions.filter(p => p.active).length}
                    </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Застосовано</span>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                        {promotions.reduce((sum, p) => sum + (p.usageCount || 0), 0)} разів
                    </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Сума знижок</span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block whitespace-nowrap">
                        {promotions.reduce((sum, p) => sum + (Number(p.totalDiscountGiven) || 0), 0).toLocaleString()}&nbsp;₴
                    </span>
                </div>
            </div>

            {/* Список карток */}
            {promotions.length === 0 && !loading ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
                    <SparklesIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Акцій поки немає</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        Створіть святкову знижку, комбо-набір або банер про сезонне меню.
                    </p>
                    <button
                        onClick={openCreateModal}
                        className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 transition-colors"
                    >
                        + Додати першу акцію
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {promotions.map((p) => {
                        let parsedCombo: ComboConfig | null = null;
                        if (p.promoType === 'COMBO' && p.comboConfig) {
                            try { parsedCombo = JSON.parse(p.comboConfig); } catch (e) {}
                        }

                        return (
                            <div
                                key={p.id}
                                className={`group bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                                    p.active 
                                        ? 'border-slate-200 dark:border-slate-800' 
                                        : 'border-slate-200/60 dark:border-slate-800/60 opacity-60'
                                }`}
                            >
                                <div>
                                    {/* Зображення банера */}
                                    <div className="relative aspect-[16/9] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden group/img">
                                        {p.imageUrl ? (
                                            <img
                                                src={p.imageUrl}
                                                alt={p.title}
                                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-2">
                                                <PhotoIcon className="w-10 h-10 stroke-1" />
                                                <span className="text-xs font-medium">Без постера</span>
                                            </div>
                                        )}

                                        {/* Швидка зміна фото з комп'ютера при наведенні */}
                                        <label
                                            className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white font-bold text-xs cursor-pointer backdrop-blur-[2px] z-10"
                                            title="Натисніть щоб змінити постер"
                                        >
                                            <div className="p-2 rounded-full bg-white/20 backdrop-blur-md">
                                                <PhotoIcon className="w-5 h-5 text-white stroke-2" />
                                            </div>
                                            <span>Змінити постер</span>
                                            <span className="text-3xs text-slate-300 font-normal">обрати з комп'ютера</span>
                                            <input
                                                type="file"
                                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                                onChange={(e) => uploadImageForPromoCard(p.id, e)}
                                                className="hidden"
                                            />
                                        </label>

                                        {/* Бейдж промо */}
                                        {p.badgeText && (
                                            <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md text-white text-2xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md z-20 pointer-events-none">
                                                {p.badgeText}
                                            </div>
                                        )}

                                        {/* Тип промо */}
                                        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20 pointer-events-none">
                                            {p.showInSlider === false && (
                                                <span className="bg-slate-950/80 backdrop-blur-md text-amber-300 border border-amber-500/30 text-3xs font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-md">
                                                    🚫 Без банеру
                                                </span>
                                            )}
                                            {p.promoType === 'COMBO' ? (
                                                <span className="bg-amber-500/90 backdrop-blur-md text-white text-3xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                                                    🔥 Комбо
                                                </span>
                                            ) : p.discountPercent && p.discountPercent > 0 ? (
                                                <span className="bg-emerald-600/90 backdrop-blur-md text-white text-3xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                                                    🏷️ -{p.discountPercent}%
                                                </span>
                                            ) : (
                                                <span className="bg-indigo-600/90 backdrop-blur-md text-white text-3xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                                                    ℹ️ Інфо
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Інформація */}
                                    <div className="p-5 space-y-3">
                                        <div>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                                {p.title}
                                            </h3>
                                            {p.shortDescription && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                                    {p.shortDescription}
                                                </p>
                                            )}
                                        </div>

                                        {/* Якщо комбо - показуємо формулу */}
                                        {parsedCombo && (
                                            <div className="p-2.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-2xs text-amber-900 dark:text-amber-200">
                                                <div className="font-bold mb-1 flex items-center gap-1 text-amber-700 dark:text-amber-400">
                                                    <span>🔥 Склад комбо:</span>
                                                </div>
                                                <div className="line-clamp-2 font-medium">
                                                    {getFormulaSummary(parsedCombo.slots || [], parsedCombo.reward)}
                                                </div>
                                            </div>
                                        )}

                                        {/* Статистика */}
                                        <div className="flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <span>Застосовано: <strong className="text-slate-800 dark:text-slate-200">{p.usageCount || 0}</strong> р.</span>
                                            <span>Знижка: <strong className="text-emerald-600 dark:text-emerald-400">{Number(p.totalDiscountGiven || 0).toLocaleString()} ₴</strong></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Панель дій */}
                                <div className="p-5 pt-0">
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
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

                                            <button
                                                onClick={() => handleToggleSlider(p.id)}
                                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                    p.showInSlider !== false
                                                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                                title={p.showInSlider !== false ? 'Показується в банері (клікніть, щоб вимкнути)' : 'Приховано з банеру (клікніть, щоб увімкнути)'}
                                            >
                                                <span>{p.showInSlider !== false ? '🖼️ Банер' : '🚫 Без банеру'}</span>
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
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
                        );
                    })}
                </div>
            )}

            {/* Модальне вікно Створення / Редагування */}
            {modalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
                        {/* 1. Шапка модалки (завжди видима, shrink-0) */}
                        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-950/50 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                    {editingPromotion ? 'Редагування акції' : 'Створення нової акції'}
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Налаштуйте тип акції, формулу комбо або знижку на замовлення
                                </p>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 2. Тіло форми (прокручується всередині, кнопки футера не перекривають!) */}
                        <form id="promo-form" onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm flex-1">
                            {/* Вибір типу акції */}
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Тип промоції *
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setPromoType('ORDER_PERCENT')}
                                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                                            promoType === 'ORDER_PERCENT'
                                                ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50 ring-2 ring-emerald-500/20'
                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <TagIcon className={`w-5 h-5 mb-1.5 ${promoType === 'ORDER_PERCENT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                                        <div>
                                            <div className="font-bold text-xs text-slate-900 dark:text-white">Знижка % на чек</div>
                                            <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">Наприклад -15% ДН</div>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPromoType('COMBO')}
                                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                                            promoType === 'COMBO'
                                                ? 'border-amber-600 dark:border-amber-500 bg-amber-50/70 dark:bg-amber-950/50 ring-2 ring-amber-500/20'
                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <CubeIcon className={`w-5 h-5 mb-1.5 ${promoType === 'COMBO' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                                        <div>
                                            <div className="font-bold text-xs text-slate-900 dark:text-white">🔥 Комбо-набір</div>
                                            <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">Піца + Напій = Десерт</div>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPromoType('INFO')}
                                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                                            promoType === 'INFO'
                                                ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20'
                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <InformationCircleIcon className={`w-5 h-5 mb-1.5 ${promoType === 'INFO' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                                        <div>
                                            <div className="font-bold text-xs text-slate-900 dark:text-white">Інформаційна</div>
                                            <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">Банер / Новина</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Заголовок */}
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Заголовок акції *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="наприклад: Замов 2 піци та отримай каву або Знижка 15% до ДН"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Бейдж на банері
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="🎂 СВЯТО, 🔥 КОМБО"
                                        value={badgeText}
                                        onChange={(e) => setBadgeText(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                    />
                                </div>

                                {promoType === 'ORDER_PERCENT' ? (
                                    <div>
                                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Знижка на чек (%) *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                required
                                                placeholder="15"
                                                value={discountPercent || ''}
                                                onChange={(e) => setDiscountPercent(parseInt(e.target.value, 10) || 0)}
                                                className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Сортування
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={displayOrder}
                                            onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        />
                                    </div>
                                )}

                                {promoType === 'ORDER_PERCENT' && (
                                    <div>
                                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Сортування
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={displayOrder}
                                            onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* КОНСТРУКТОР КОМБО (якщо promoType === 'COMBO') */}
                            {promoType === 'COMBO' && (
                                <div className="space-y-6 pt-2 border-t border-slate-200 dark:border-slate-800 animate-fadeIn">
                                    {/* БЛОК А: ВИМОГИ ДО КОШИКА */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-white font-bold flex items-center justify-center text-xs">A</span>
                                                    Що гість має замовити (Вимоги до кошика)
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    Оберіть всю категорію або конкретні страви-аналоги (напр. обрані 3 піци з 5)
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {comboSlots.map((slot, sIdx) => (
                                                <div
                                                    key={slot.id}
                                                    className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 relative"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                                                            Слот #{sIdx + 1}
                                                        </span>
                                                        {comboSlots.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeComboSlot(slot.id)}
                                                                className="text-xs text-red-500 hover:text-red-700 font-medium"
                                                            >
                                                                Видалити слот
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                                Назва вимоги
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="наприклад: Піца на вибір, Напій"
                                                                value={slot.name}
                                                                onChange={(e) => updateComboSlot(slot.id, { name: e.target.value })}
                                                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                                Кількість (шт.)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={slot.quantity}
                                                                onChange={(e) => updateComboSlot(slot.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                                                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Перемикач: Вся категорія АБО Обрані товари */}
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                                                            Правило вибору страв для слоту:
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateComboSlot(slot.id, { selectionType: 'CATEGORY' })}
                                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                                    slot.selectionType === 'CATEGORY'
                                                                        ? 'bg-indigo-600 text-white shadow-xs'
                                                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                                                }`}
                                                            >
                                                                📂 Вся категорія
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateComboSlot(slot.id, { selectionType: 'ITEMS' })}
                                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                                    slot.selectionType === 'ITEMS'
                                                                        ? 'bg-indigo-600 text-white shadow-xs'
                                                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                                                }`}
                                                            >
                                                                🍕 Конкретні страви / аналоги
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Варіант 1: Вся категорія */}
                                                    {slot.selectionType === 'CATEGORY' ? (
                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                                Оберіть категорію:
                                                            </label>
                                                            <select
                                                                value={slot.categoryId || ''}
                                                                onChange={(e) => {
                                                                    const cId = Number(e.target.value);
                                                                    const cat = categories.find(c => c.id === cId);
                                                                    updateComboSlot(slot.id, {
                                                                        categoryId: cId,
                                                                        categoryName: cat?.name
                                                                    });
                                                                }}
                                                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                                                            >
                                                                {categories.map(c => (
                                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        /* Варіант 2: Конкретні товари / аналоги */
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="font-semibold text-slate-600 dark:text-slate-400">
                                                                    Оберіть страви, що підходять під цей слот ({slot.itemIds.length} обрано):
                                                                </span>
                                                            </div>

                                                            {/* Обрані чіпси */}
                                                            {slot.itemIds.length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5 pb-1">
                                                                    {slot.itemIds.map((itemId, idx) => (
                                                                        <span
                                                                            key={itemId}
                                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 text-xs font-bold"
                                                                        >
                                                                            <span>{slot.itemNames[idx] || `Страва #${itemId}`}</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const newItemIds = slot.itemIds.filter(id => id !== itemId);
                                                                                    const newItemNames = slot.itemNames.filter((_, i) => i !== idx);
                                                                                    updateComboSlot(slot.id, { itemIds: newItemIds, itemNames: newItemNames });
                                                                                }}
                                                                                className="hover:text-red-500"
                                                                            >
                                                                                <XMarkIcon className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Скрол-список страв для вибору з чекбоксами */}
                                                            <div className="max-h-40 overflow-y-auto space-y-1 p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                                                                {menuItems.map(item => {
                                                                    const isChecked = slot.itemIds.includes(item.id);
                                                                    return (
                                                                        <label
                                                                            key={item.id}
                                                                            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs"
                                                                        >
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isChecked}
                                                                                    onChange={(e) => {
                                                                                        if (e.target.checked) {
                                                                                            updateComboSlot(slot.id, {
                                                                                                itemIds: [...slot.itemIds, item.id],
                                                                                                itemNames: [...slot.itemNames, item.name]
                                                                                            });
                                                                                        } else {
                                                                                            const idx = slot.itemIds.indexOf(item.id);
                                                                                            updateComboSlot(slot.id, {
                                                                                                itemIds: slot.itemIds.filter(id => id !== item.id),
                                                                                                itemNames: slot.itemNames.filter((_, i) => i !== idx)
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                                                                />
                                                                                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                                                                                {item.categoryName && (
                                                                                    <span className="text-3xs text-slate-400">({item.categoryName})</span>
                                                                                )}
                                                                            </div>
                                                                            <span className="text-slate-500 font-bold ml-2 shrink-0">{item.price} ₴</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={addComboSlot}
                                            className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <PlusIcon className="w-4 h-4 stroke-2" />
                                            <span>+ Додати ще один слот вимог</span>
                                        </button>
                                    </div>

                                    {/* БЛОК Б: ВИНАГОРОДА */}
                                    <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                                        <div>
                                            <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">Б</span>
                                                Винагорода для гостя
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Що отримує гість (подарункова страва, фіксована спец-ціна або знижка)
                                            </p>
                                        </div>

                                        {/* Тип винагороди */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setComboReward(prev => ({ ...prev, rewardType: 'FREE_ITEM' }))}
                                                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                                                    comboReward.rewardType === 'FREE_ITEM'
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                🎁 Подарунок (100% знижка)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setComboReward(prev => ({ ...prev, rewardType: 'FIXED_PRICE' }))}
                                                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                                                    comboReward.rewardType === 'FIXED_PRICE'
                                                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-200'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                🏷️ Фіксована ціна за набір
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setComboReward(prev => ({ ...prev, rewardType: 'DISCOUNT_PERCENT' }))}
                                                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                                                    comboReward.rewardType === 'DISCOUNT_PERCENT'
                                                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-800 dark:text-indigo-200'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                % Знижка на комбо
                                            </button>
                                        </div>

                                        {/* Налаштування подарунка */}
                                        {comboReward.rewardType === 'FREE_ITEM' && (
                                            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setComboReward(prev => ({ ...prev, selectionType: 'CATEGORY' }))}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                            comboReward.selectionType === 'CATEGORY'
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                                        }`}
                                                    >
                                                        📂 Будь-яка страва з категорії
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setComboReward(prev => ({ ...prev, selectionType: 'ITEMS' }))}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                            comboReward.selectionType === 'ITEMS'
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                                        }`}
                                                    >
                                                        🍰 Конкретна страва або на вибір
                                                    </button>
                                                </div>

                                                {comboReward.selectionType === 'CATEGORY' ? (
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                            Подарункова категорія:
                                                        </label>
                                                        <select
                                                            value={comboReward.categoryId || ''}
                                                            onChange={(e) => {
                                                                const cId = Number(e.target.value);
                                                                const cat = categories.find(c => c.id === cId);
                                                                setComboReward(prev => ({
                                                                    ...prev,
                                                                    categoryId: cId,
                                                                    categoryName: cat?.name
                                                                }));
                            }}
                                                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                                                        >
                                                            {categories.map(c => (
                                                                <option key={c.id} value={c.id}>{c.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                            Оберіть подарункові страви ({comboReward.itemIds.length} обрано):
                                                        </span>

                                                        {comboReward.itemIds.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 pb-1">
                                                                {comboReward.itemIds.map((itemId, idx) => (
                                                                    <span
                                                                        key={itemId}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs font-bold"
                                                                    >
                                                                        <span>{comboReward.itemNames[idx] || `Страва #${itemId}`}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setComboReward(prev => ({
                                                                                    ...prev,
                                                                                    itemIds: prev.itemIds.filter(id => id !== itemId),
                                                                                    itemNames: prev.itemNames.filter((_, i) => i !== idx)
                                                                                }));
                                                                            }}
                                                                            className="hover:text-red-500"
                                                                        >
                                                                            <XMarkIcon className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                                                            {menuItems.map(item => {
                                                                const isChecked = comboReward.itemIds.includes(item.id);
                                                                return (
                                                                    <label
                                                                        key={item.id}
                                                                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs"
                                                                    >
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) {
                                                                                        setComboReward(prev => ({
                                                                                            ...prev,
                                                                                            itemIds: [...prev.itemIds, item.id],
                                                                                            itemNames: [...prev.itemNames, item.name]
                                                                                        }));
                                                                                    } else {
                                                                                        const idx = comboReward.itemIds.indexOf(item.id);
                                                                                        setComboReward(prev => ({
                                                                                            ...prev,
                                                                                            itemIds: prev.itemIds.filter(id => id !== item.id),
                                                                                            itemNames: prev.itemNames.filter((_, i) => i !== idx)
                                                                                        }));
                                                                                    }
                                                                                }}
                                                                                className="rounded text-emerald-600 focus:ring-emerald-500"
                                                                            />
                                                                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                                                                        </div>
                                                                        <span className="text-slate-400 font-bold ml-2 shrink-0">{item.price} ₴</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                        Кількість подарунків (шт.)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={comboReward.quantity}
                                                        onChange={(e) => setComboReward(prev => ({ ...prev, quantity: parseInt(e.target.value, 10) || 1 }))}
                                                        className="w-24 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {comboReward.rewardType === 'FIXED_PRICE' && (
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                    Фіксована спец-ціна за весь набір (₴) *
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    required
                                                    placeholder="наприклад: 249"
                                                    value={comboReward.fixedPrice || ''}
                                                    onChange={(e) => setComboReward(prev => ({ ...prev, fixedPrice: parseFloat(e.target.value) || 0 }))}
                                                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-amber-600 dark:text-amber-400"
                                                />
                                            </div>
                                        )}

                                        {comboReward.rewardType === 'DISCOUNT_PERCENT' && (
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                    Відсоток знижки на комбо (%) *
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    required
                                                    placeholder="наприклад: 20"
                                                    value={comboReward.discountPercent || ''}
                                                    onChange={(e) => setComboReward(prev => ({ ...prev, discountPercent: parseInt(e.target.value, 10) || 0 }))}
                                                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-indigo-600 dark:text-indigo-400"
                                                />
                                            </div>
                                        )}

                                        {/* Прев'ю формули */}
                                        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                                            <span className="font-bold text-slate-900 dark:text-white block mb-1">✨ Прев'ю формули акції:</span>
                                            <span className="font-mono text-2xs text-indigo-600 dark:text-indigo-400">
                                                {getFormulaSummary(comboSlots, comboReward)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Постер акції */}
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Постер акції (співвідношення 16:9)
                                </label>
                                
                                {uploadingImage ? (
                                    <div className="aspect-[16/9] w-full max-h-40 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30 flex flex-col items-center justify-center gap-2">
                                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Завантаження зображення...</span>
                                    </div>
                                ) : imageUrl ? (
                                    <div className="space-y-2">
                                        <div className="relative aspect-[16/9] w-full max-h-44 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group">
                                            <img src={imageUrl} alt="Прев'ю" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                                <label className="px-3.5 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs cursor-pointer shadow-md hover:bg-slate-100 transition-all flex items-center gap-1.5 active:scale-95">
                                                    <PhotoIcon className="w-4 h-4 text-indigo-600" />
                                                    <span>Замінити файл</span>
                                                    <input
                                                        type="file"
                                                        accept="image/png, image/jpeg, image/jpg, image/webp"
                                                        onChange={handleImageUpload}
                                                        className="hidden"
                                                    />
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setImageUrl('')}
                                                    className="px-3.5 py-2 rounded-xl bg-red-600 text-white font-bold text-xs shadow-md hover:bg-red-500 transition-all flex items-center gap-1.5 active:scale-95"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                    <span>Видалити</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span className="shrink-0 font-medium">Шлях/URL:</span>
                                            <input
                                                type="text"
                                                value={imageUrl}
                                                onChange={(e) => setImageUrl(e.target.value)}
                                                className="flex-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-2xs truncate focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                placeholder="URL або шлях до файлу"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-5 text-center transition-all bg-slate-50/50 dark:bg-slate-800/40">
                                            <PhotoIcon className="w-9 h-9 text-slate-400 mx-auto mb-2" />
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                                                Завантажте фотографію для постера
                                            </p>
                                            <p className="text-2xs text-slate-400 mb-3">
                                                Підтримуються формати JPG, PNG, WEBP (рекомендовано 16:9)
                                            </p>
                                            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95 transition-all">
                                                <ArrowUpTrayIcon className="w-4 h-4 stroke-2" />
                                                <span>Обрати файл з комп'ютера</span>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    accept="image/png, image/jpeg, image/jpg, image/webp"
                                                    onChange={handleImageUpload}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                                            <span className="shrink-0">Або вкажіть URL:</span>
                                            <input
                                                type="url"
                                                placeholder="https://images.unsplash.com/..."
                                                value={imageUrl}
                                                onChange={(e) => setImageUrl(e.target.value)}
                                                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Короткий слоган */}
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

                            {/* Повний текст умов */}
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Повний текст умов акції (відкривається при кліку)
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Детальні правила: дні дії, час, необхідні документи, обмеження..."
                                    value={fullContent}
                                    onChange={(e) => setFullContent(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y"
                                />
                            </div>

                            {/* CTA блок (для банера слайдера) */}
                            {promoType !== 'COMBO' && (
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                                        Цільова дія клієнта на банері (Call to Action)
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
                                                <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">Лише правила</div>
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
                                                <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">Кнопка «Замовити»</div>
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
                                                <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">Повідомити стіл</div>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Інтерактивний вибір страви */}
                                    {actionType === 'MENU_ITEM' && (
                                        <div className="space-y-2 pt-1 animate-fadeIn">
                                            <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                                                Прив'язана страва з меню *
                                            </label>

                                            {selectedDish && !isDishDropdownOpen ? (
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
                                                                    <span className="text-3xs px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
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
                                                                                    <div className="text-3xs text-slate-400 truncate mt-0.5">
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
                                </div>
                            )}

                            {/* Активність та показ у промо-банері */}
                            <div className="pt-2 space-y-3 border-t border-slate-100 dark:border-slate-800">
                                <div 
                                    onClick={() => setActive(!active)}
                                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                                >
                                    <div className="pr-4">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white block">
                                            Активувати акцію
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                                            Видима для гостей у додатку та для офіціантів
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={active}
                                        onClick={(e) => { e.stopPropagation(); setActive(!active); }}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-out focus:outline-none ${
                                            active ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-spring ${
                                                active ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>

                                <div 
                                    onClick={() => setShowInSlider(!showInSlider)}
                                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                                >
                                    <div className="pr-4">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white block">
                                            Показувати у промо-банері (каруселі)
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                                            Якщо вимкнено — акція/комбо буде прихована з верхнього слайдера, але залишиться доступною в меню
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={showInSlider}
                                        onClick={(e) => { e.stopPropagation(); setShowInSlider(!showInSlider); }}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-out focus:outline-none ${
                                            showInSlider ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-spring ${
                                                showInSlider ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* 3. Статичний Футер (завжди внизу, shrink-0, нічого не перекриває!) */}
                        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                                Скасувати
                            </button>
                            <button
                                form="promo-form"
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {submitting ? 'Збереження...' : (editingPromotion ? 'Оновити акцію' : 'Створити')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
