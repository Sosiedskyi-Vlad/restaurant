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
    CheckCircleIcon,
    FireIcon,
    ArrowRightIcon
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
    showInSlider?: boolean;
    displayOrder: number;
    promoType?: 'ORDER_PERCENT' | 'COMBO' | 'INFO';
    comboConfig?: string;
}

interface PromoCarouselProps {
    onSelectMenuItem?: (menuItemId: number) => void;
    onSelectCategory?: (category: string) => void;
    onCallWaiter?: () => void;
}

// apple-design.md §6 — проєкція інерції (функція з Designing Fluid Interfaces)
const project = (velocity: number, decelerationRate = 0.998) =>
    (velocity / 1000) * decelerationRate / (1 - decelerationRate);

// apple-design.md §9 — м'який опір на межі замість жорсткого стопу
const rubberband = (overshoot: number, dimension: number, constant = 0.55) =>
    (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));

const SNAP_TRANSITION = 'transform 450ms cubic-bezier(0.32, 0.72, 0, 1)';

export default function PromoCarousel({ onSelectMenuItem, onSelectCategory, onCallWaiter }: PromoCarouselProps) {
    const [promotions, setPromotions] = useState<PromotionItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [selectedPromo, setSelectedPromo] = useState<PromotionItem | null>(null);

    const [callingWaiter, setCallingWaiter] = useState(false);
    const [callSuccess, setCallSuccess] = useState(false);

    // Pointer Events замість touchstart/touchend: 1:1 трекінг, мишка + тач + перо
    const trackRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{
        originX: number; originY: number; lastX: number; lastT: number;
        velocity: number; axis: 'x' | 'y' | null;
    } | null>(null);
    const suppressClick = useRef(false);
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        api.get('/promotions/active')
            .then(res => {
                const sliderPromos = (res.data || []).filter((p: PromotionItem) => p.showInSlider !== false);
                setPromotions(sliderPromos);
            })
            .catch(() => {});
    }, []);

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

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if ((e.target as HTMLElement).closest('button')) return; // стрілки мають власний tap
        suppressClick.current = false;
        setIsPaused(true);

        // §3 — якщо слайд ще «летить», підхоплюємо його з поточної (presentation) позиції
        const width = e.currentTarget.clientWidth;
        let live = 0;
        if (trackRef.current) {
            const m = new DOMMatrixReadOnly(getComputedStyle(trackRef.current).transform);
            live = m.m41 + currentIndex * width;
        }
        const inFlight = Math.abs(live) > 1;

        drag.current = {
            originX: e.clientX - live, originY: e.clientY,
            lastX: e.clientX, lastT: e.timeStamp, velocity: 0,
            axis: inFlight ? 'x' : null,
        };
        if (inFlight) {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragX(live);
            setIsDragging(true);
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const d = drag.current;
        if (!d) return;
        // кнопку миші відпустили поза слайдером до захоплення pointer — завершуємо «завислий» жест
        if (e.pointerType === 'mouse' && e.buttons === 0) { handlePointerEnd(e); return; }
        const dx = e.clientX - d.originX;
        const dy = e.clientY - d.originY;

        // §10 — гістерезис ~10px, потім фіксуємо напрям; вертикаль віддаємо скролу
        if (d.axis === null) {
            if (Math.hypot(dx, dy) < 10) return;
            d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            if (d.axis === 'x') {
                e.currentTarget.setPointerCapture(e.pointerId);
                setIsDragging(true);
            }
        }
        if (d.axis !== 'x') return;

        const dt = e.timeStamp - d.lastT;
        if (dt > 0) d.velocity = ((e.clientX - d.lastX) / dt) * 1000; // px/s
        d.lastX = e.clientX;
        d.lastT = e.timeStamp;

        // §2 — контент їде разом із пальцем; один слайд → гумовий опір
        setDragX(promotions.length > 1 ? dx : rubberband(dx, e.currentTarget.clientWidth));
    };

    const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
        const d = drag.current;
        drag.current = null;
        if (d?.axis === 'x') {
            suppressClick.current = true;
            const width = e.currentTarget.clientWidth;
            // §6 — ціль обираємо за спроєктованою точкою, а не за точкою відпускання
            // палець зупинився перед відпусканням (>100 мс без руху) → інерції немає
            const velocity = e.timeStamp - d.lastT > 100 ? 0 : d.velocity;
            const projected = dragX + project(velocity);
            if (e.type !== 'pointercancel' && promotions.length > 1) {
                if (projected < -width / 2) nextSlide();
                else if (projected > width / 2) prevSlide();
            }
        }
        setIsDragging(false);
        setDragX(0);
        setIsPaused(false);
    };

    const handlePromoCta = (promo: PromotionItem) => {
        if (promo.promoType === 'COMBO' && onSelectCategory) {
            setSelectedPromo(null);
            onSelectCategory('COMBO');
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
        api.post('/service-calls', { type: 'WAITER' }
        ).then(() => {
            setCallSuccess(true);
            setTimeout(() => {
                setCallSuccess(false);
                setCallingWaiter(false);
                setSelectedPromo(null);
                if (onCallWaiter) onCallWaiter();
            }, 2000);
        }).catch(() => {
            setCallingWaiter(false);
            alert('Не вдалося покликати офіціанта. Спробуйте кнопку дзвіночка у шапці.');
        });
    };

    const currentPromo = promotions[currentIndex];

    return (
        <div className="relative select-none">
            {/* Головний слайдер */}
            <div
                data-press="off"
                className="relative aspect-[16/9] sm:aspect-[21/9] w-full rounded-2xl overflow-hidden shadow-md cursor-pointer group bg-stone-900 border border-stone-200/60 dark:border-stone-800"
                style={{ touchAction: 'pan-y' }}
                onClick={() => {
                    if (suppressClick.current) { suppressClick.current = false; return; }
                    setSelectedPromo(currentPromo);
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
            >
                {/* Стрічка слайдів: під час жесту — без transition (1:1), після — snap */}
                <div
                    ref={trackRef}
                    className="flex h-full will-change-transform"
                    style={{
                        transform: `translate3d(calc(${-currentIndex * 100}% + ${dragX}px), 0, 0)`,
                        transition: isDragging ? 'none' : SNAP_TRANSITION,
                    }}
                >
                    {promotions.map(promo => (
                        <div key={promo.id} className="relative w-full h-full shrink-0">
                            <img
                                src={promo.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&q=80'}
                                alt={promo.title}
                                draggable={false}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-transparent"></div>

                            {promo.badgeText && (
                                <div className="absolute top-3.5 left-3.5 z-10 px-3 py-1 bg-amber-600 text-white text-2xs font-bold uppercase tracking-wider rounded-full shadow-sm flex items-center gap-1.5">
                                    <SparklesIcon className="w-3.5 h-3.5 stroke-2" />
                                    <span>{promo.badgeText}</span>
                                </div>
                            )}

                            <div className="absolute bottom-3.5 inset-x-4 text-white z-10 pr-24">
                                <h3 className="font-bold text-base sm:text-lg leading-snug drop-shadow-sm">
                                    {promo.title}
                                </h3>
                                {promo.shortDescription && (
                                    <p className="text-xs sm:text-sm text-stone-200/90 line-clamp-1 mt-0.5 font-medium">
                                        {promo.shortDescription}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="absolute bottom-3.5 right-3.5 z-10 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-white text-xs font-semibold transition-colors flex items-center gap-1">
                    <span>Деталі</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                </div>

                {promotions.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                            className="hidden sm:flex absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white items-center justify-center backdrop-blur-md hover:bg-black/65 transition-colors z-20"
                            aria-label="Попередня акція"
                        >
                            <ChevronLeftIcon className="w-4 h-4 stroke-2" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                            className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white items-center justify-center backdrop-blur-md hover:bg-black/65 transition-colors z-20"
                            aria-label="Наступна акція"
                        >
                            <ChevronRightIcon className="w-4 h-4 stroke-2" />
                        </button>
                    </>
                )}
            </div>

            {promotions.length > 1 && (
                <div className="flex justify-center items-center gap-1.5 mt-2.5">
                    {promotions.map((_, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                currentIndex === idx
                                    ? 'w-6 bg-amber-600 dark:bg-amber-500'
                                    : 'w-1.5 bg-stone-300 dark:bg-stone-700 hover:bg-stone-400'
                            }`}
                            aria-label={`Перейти до слайду ${idx + 1}`}
                        />
                    ))}
                </div>
            )}

            {selectedPromo && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/70 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn"
                    onClick={() => setSelectedPromo(null)}
                >
                    <div
                        className="animate-slideUpFade bg-white dark:bg-stone-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] border border-stone-200/80 dark:border-stone-800"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="relative aspect-[16/9] w-full shrink-0 bg-stone-950">
                            {selectedPromo.imageUrl && (
                                <img
                                    src={selectedPromo.imageUrl}
                                    alt={selectedPromo.title}
                                    className="w-full h-full object-cover"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-transparent to-transparent"></div>

                            <button
                                onClick={() => setSelectedPromo(null)}
                                className="absolute top-4 right-4 w-9 h-9 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md z-10 hover:bg-black/75 transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>

                            {selectedPromo.badgeText && (
                                <div className="absolute top-4 left-4 z-10 px-3.5 py-1 bg-amber-600 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md">
                                    {selectedPromo.badgeText}
                                </div>
                            )}

                            <div className="absolute bottom-4 inset-x-5 text-white">
                                <h2 className="text-xl sm:text-2xl font-bold leading-tight drop-shadow-sm">
                                    {selectedPromo.title}
                                </h2>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            {selectedPromo.shortDescription && (
                                <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 text-sm font-semibold border border-amber-200/70 dark:border-amber-800/40">
                                    {selectedPromo.shortDescription}
                                </div>
                            )}

                            {selectedPromo.fullContent ? (
                                <div className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line space-y-2">
                                    {selectedPromo.fullContent}
                                </div>
                            ) : (
                                <p className="text-sm text-stone-400 italic">
                                    Деталі та умови дізнавайтесь у вашого офіціанта.
                                </p>
                            )}

                            {callSuccess && (
                                <div className="p-4 rounded-xl bg-emerald-600 text-white flex items-center gap-3 animate-slideUpFade">
                                    <CheckCircleIcon className="w-6 h-6 text-emerald-100 shrink-0" />
                                    <div className="text-xs font-semibold">
                                        Офіціант повідомлений про акцію та прямує до вашого столу!
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 sm:p-5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 flex flex-col gap-2.5">
                            {selectedPromo.promoType === 'COMBO' && (
                                <button
                                    onClick={() => handlePromoCta(selectedPromo)}
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white p-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
                                >
                                    <FireIcon className="w-5 h-5" />
                                    <span>Переглянути комбо-набори</span>
                                    <ArrowRightIcon className="w-4 h-4" />
                                </button>
                            )}

                            {selectedPromo.actionType === 'MENU_ITEM' && selectedPromo.targetMenuItemId && (
                                <button
                                    onClick={() => handlePromoCta(selectedPromo)}
                                    className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white p-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
                                >
                                    <ShoppingBagIcon className="w-5 h-5" />
                                    <span>Замовити акційну страву</span>
                                </button>
                            )}

                            {selectedPromo.actionType === 'CALL_WAITER' && (
                                <button
                                    onClick={() => handlePromoCta(selectedPromo)}
                                    disabled={callingWaiter || callSuccess}
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white p-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    <BellAlertIcon className="w-5 h-5" />
                                    <span>{callingWaiter ? 'Повідомляємо...' : (callSuccess ? 'Офіціант прямує!' : 'Покликати офіціанта для активації')}</span>
                                </button>
                            )}

                            <button
                                onClick={() => setSelectedPromo(null)}
                                className="w-full py-2.5 rounded-xl text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
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
