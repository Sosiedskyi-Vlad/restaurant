import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import {
    SparklesIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XMarkIcon,
    ShoppingBagIcon,
    BellAlertIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

export interface PromotionItem {
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
    promoType?: 'ORDER_PERCENT' | 'COMBO' | 'INFO';
    comboConfig?: string;
}

interface PromoCarouselProps {
    onSelectMenuItem?: (menuItemId: number) => void;
    onSelectCategory?: (category: string) => void;
    onCallWaiter?: () => void;
}

export default function PromoCarousel({ onSelectMenuItem, onSelectCategory, onCallWaiter }: PromoCarouselProps) {
    const [promotions, setPromotions] = useState<PromotionItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [selectedPromo, setSelectedPromo] = useState<PromotionItem | null>(null);

    // Стан для виклику офіціанта з модалки
    const [callingWaiter, setCallingWaiter] = useState(false);
    const [callSuccess, setCallSuccess] = useState(false);

    // Для свайпів на смартфонах
    const touchStartX = useRef<number | null>(null);

    useEffect(() => {
        api.get('/promotions/active')
            .then(res => {
                setPromotions(res.data);
            })
            .catch(() => {});
    }, []);

    // Автопрокрутка раз на 5.5 секунд
    useEffect(() => {
        if (promotions.length <= 1 || isPaused || selectedPromo !== null) return;
        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % promotions.length);
        }, 5500);
        return () => clearInterval(timer);
    }, [promotions.length, isPaused, selectedPromo]);

    if (promotions.length === 0) {
        return null;
    }

    const nextSlide = () => {
        setCurrentIndex(prev => (prev + 1) % promotions.length);
    };

    const prevSlide = () => {
        setCurrentIndex(prev => (prev - 1 + promotions.length) % promotions.length);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        setIsPaused(true);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX.current - touchEndX;

        if (Math.abs(diff) > 40) {
            if (diff > 0) nextSlide();
            else prevSlide();
        }
        touchStartX.current = null;
        setIsPaused(false);
    };

    const handlePromoCta = (promo: PromotionItem) => {
        if (promo.promoType === 'COMBO' && onSelectCategory) {
            setSelectedPromo(null);
            onSelectCategory('🔥 Комбо');
        } else if (promo.actionType === 'MENU_ITEM' && promo.targetMenuItemId && onSelectMenuItem) {
            setSelectedPromo(null);
            onSelectMenuItem(promo.targetMenuItemId);
        } else if (promo.actionType === 'CALL_WAITER') {
            triggerCallWaiter(promo.title);
        } else {
            setSelectedPromo(null);
        }
    };

    const triggerCallWaiter = (_promoTitle: string) => {
        setCallingWaiter(true);
        api.post('/service-calls', { type: 'WAITER' })
            .then(() => {
                setCallSuccess(true);
                setTimeout(() => {
                    setCallSuccess(false);
                    setCallingWaiter(false);
                    setSelectedPromo(null);
                    if (onCallWaiter) onCallWaiter();
                }, 2000);
            })
            .catch(() => {
                setCallingWaiter(false);
                alert('Не вдалося покликати офіціанта. Спробуйте кнопку дзвіночка у шапці.');
            });
    };

    const currentPromo = promotions[currentIndex];

    return (
        <div className="relative select-none">
            {/* Головний слайдер */}
            <div
                className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden shadow-lg cursor-pointer group bg-slate-900 border border-slate-200/50 dark:border-slate-800"
                onClick={() => setSelectedPromo(currentPromo)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Зображення банера */}
                <img
                    src={currentPromo.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&q=80'}
                    alt={currentPromo.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Градієнтні накладки */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent"></div>

                {/* Бейдж у верхньому лівому кутку */}
                {currentPromo.badgeText && (
                    <div className="absolute top-3.5 left-3.5 z-10 px-3 py-1 bg-amber-500/90 text-white text-[11px] font-black uppercase tracking-wider rounded-full shadow-md backdrop-blur-xs flex items-center gap-1">
                        <SparklesIcon className="w-3.5 h-3.5 stroke-2" />
                        <span>{currentPromo.badgeText}</span>
                    </div>
                )}

                {/* Текст та деталі внизу банера */}
                <div className="absolute bottom-3.5 inset-x-4 text-white z-10 pr-12">
                    <h3 className="font-black text-base sm:text-lg leading-tight drop-shadow-md">
                        {currentPromo.title}
                    </h3>
                    {currentPromo.shortDescription && (
                        <p className="text-xs text-slate-200/90 line-clamp-1 mt-0.5 font-medium drop-shadow-sm">
                            {currentPromo.shortDescription}
                        </p>
                    )}
                </div>

                {/* Кнопка швидкого відкриття деталей */}
                <div className="absolute bottom-3.5 right-3.5 z-10 px-2.5 py-1 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-white text-xs font-bold transition-colors">
                    Умови →
                </div>

                {/* Стрілки перемикання (для десктопу) */}
                {promotions.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white items-center justify-center backdrop-blur-md hover:bg-black/60 transition-colors z-20"
                            aria-label="Попередня акція"
                        >
                            <ChevronLeftIcon className="w-4 h-4 stroke-2" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white items-center justify-center backdrop-blur-md hover:bg-black/60 transition-colors z-20"
                            aria-label="Наступна акція"
                        >
                            <ChevronRightIcon className="w-4 h-4 stroke-2" />
                        </button>
                    </>
                )}
            </div>

            {/* Індикатори точок знизу */}
            {promotions.length > 1 && (
                <div className="flex justify-center items-center gap-1.5 mt-2.5">
                    {promotions.map((_, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                currentIndex === idx
                                    ? 'w-6 bg-indigo-600 dark:bg-indigo-400'
                                    : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                            }`}
                            aria-label={`Перейти до слайду ${idx + 1}`}
                        />
                    ))}
                </div>
            )}

            {/* Повнорозмірне модальне вікно перегляду умов акції (Interactive Promotion Sheet) */}
            {selectedPromo && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 sm:p-0 animate-slideUpFade"
                    onClick={() => setSelectedPromo(null)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Зображення в модалці */}
                        <div className="relative aspect-[16/9] w-full shrink-0 bg-slate-950">
                            {selectedPromo.imageUrl && (
                                <img
                                    src={selectedPromo.imageUrl}
                                    alt={selectedPromo.title}
                                    className="w-full h-full object-cover"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>

                            {/* Закрити */}
                            <button
                                onClick={() => setSelectedPromo(null)}
                                className="absolute top-4 right-4 w-9 h-9 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md z-10 hover:bg-black/75 transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>

                            {/* Бейдж */}
                            {selectedPromo.badgeText && (
                                <div className="absolute top-4 left-4 z-10 px-3.5 py-1 bg-amber-500 text-white text-xs font-black uppercase tracking-wider rounded-full shadow-md">
                                    {selectedPromo.badgeText}
                                </div>
                            )}

                            {/* Заголовок */}
                            <div className="absolute bottom-4 inset-x-5 text-white">
                                <h2 className="text-xl sm:text-2xl font-black leading-tight drop-shadow-md">
                                    {selectedPromo.title}
                                </h2>
                            </div>
                        </div>

                        {/* Тіло з описом та правилами */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            {selectedPromo.shortDescription && (
                                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 text-sm font-semibold border border-indigo-100 dark:border-indigo-900/40">
                                    {selectedPromo.shortDescription}
                                </div>
                            )}

                            {selectedPromo.fullContent ? (
                                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line space-y-2">
                                    {selectedPromo.fullContent}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">
                                    Деталі та умови дізнавайтесь у вашого офіціанта.
                                </p>
                            )}

                            {/* Блок успішного виклику офіціанта */}
                            {callSuccess && (
                                <div className="p-4 rounded-2xl bg-emerald-500 text-white flex items-center gap-3 animate-slideUpFade">
                                    <CheckCircleIcon className="w-6 h-6 text-emerald-100 shrink-0" />
                                    <div className="text-xs font-bold">
                                        Офіціант повідомлений про акцію та прямує до вашого столу!
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Футер дій */}
                        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-col gap-2.5">
                            {selectedPromo.promoType === 'COMBO' && (
                                <button
                                    onClick={() => handlePromoCta(selectedPromo)}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white p-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
                                >
                                    <span>🔥 Переглянути комбо в меню</span>
                                    <span>→</span>
                                </button>
                            )}

                            {/* CTA Кнопка страви */}
                            {selectedPromo.actionType === 'MENU_ITEM' && selectedPromo.targetMenuItemId && (
                                <button
                                    onClick={() => handlePromoCta(selectedPromo)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
                                >
                                    <ShoppingBagIcon className="w-5 h-5" />
                                    <span>Замовити акційну страву</span>
                                </button>
                            )}

                            {/* CTA Кнопка виклику офіціанта */}
                            {selectedPromo.actionType === 'CALL_WAITER' && (
                                <button
                                    onClick={() => handlePromoCta(selectedPromo)}
                                    disabled={callingWaiter || callSuccess}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white p-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98 disabled:opacity-50"
                                >
                                    <BellAlertIcon className="w-5 h-5" />
                                    <span>{callingWaiter ? 'Повідомляємо...' : (callSuccess ? 'Офіціант прямує!' : 'Покликати офіціанта для активації')}</span>
                                </button>
                            )}

                            <button
                                onClick={() => setSelectedPromo(null)}
                                className="w-full py-2.5 rounded-2xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
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
