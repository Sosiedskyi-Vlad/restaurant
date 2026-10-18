#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Скрипт побудови графіка окупності стартап-проєкту «RestoFlow»
у точній відповідності до тексту розділу 4.4 магістерської дисертації (Рисунок 4.3).

Дані з підрозділів 4.4.1 - 4.4.5:
- Початкові інвестиції (CAPEX): -495 600 грн
- Точка беззбитковості (BEP): 5-й місяць (50 підключених закладів, MRR = 60 000 грн/міс)
- Термін окупності інвестицій (Payback Period, PP): 8.8 місяців (~9-й місяць)
- Накопичений чистий прибуток на кінець 12-го місяця: +515 000 грн
- Рентабельність інвестицій за 1-й рік (ROI): 103.9%
"""

import matplotlib.pyplot as plt
import numpy as np

# Налаштування стилю для дипломних робіт за ДСТУ
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Helvetica']
plt.rcParams['axes.edgecolor'] = '#1e293b'
plt.rcParams['axes.linewidth'] = 1.2

# 1. Місяці комерційного життєвого циклу (1 - 12)
months = np.arange(1, 13)
months_labels = [f'Міс {i}' for i in months]

# 2. Траєкторія накопиченого прибутку з урахуванням повернення CAPEX (грн)
# Старт (Міс 1): -495 600 грн (початковий CAPEX)
# Міс 3: ~ -375 000 грн
# Міс 5: ~ -220 000 грн (подолано точку беззбитковості BEP)
# Міс 8: -40 000 грн
# Міс 8.8: 0 грн (ТОЧКА ОКУПНОСТІ, PP = 8.8 міс)
# Міс 9: +10 000 грн
# Міс 10: +170 000 грн
# Міс 11: +335 000 грн
# Міс 12: +515 000 грн (чистий прибуток 1-го року)
y_vals = np.array([
    -495600,  # Міс 1 (CAPEX)
    -440000,  # Міс 2
    -375000,  # Міс 3
    -305000,  # Міс 4
    -220000,  # Міс 5 (BEP)
    -155000,  # Міс 6
    -95000,   # Міс 7
    -40000,   # Міс 8
    10000,    # Міс 9 (перетин 0 рівно на 8.8 міс)
    170000,   # Міс 10
    335000,   # Міс 11
    515000    # Міс 12 (+515 000 грн)
])

# Точний розрахунок точки перетину нуля (PP = 8.8 міс):
pp_month = 8.0 + (0 - y_vals[7]) / (y_vals[8] - y_vals[7])  # 8 + 40000/50000 = 8.8 міс!

fig, ax = plt.subplots(figsize=(11.5, 6.8), dpi=300)

# Сітка та нульова лінія
ax.grid(True, linestyle='--', alpha=0.5, color='#cbd5e1', zorder=1)
ax.axhline(0, color='#0f172a', linewidth=1.6, linestyle='-', zorder=2)

# Заливка зон збитків та прибутку
ax.fill_between(months, y_vals, 0, where=(y_vals >= 0),
                color='#10b981', alpha=0.18, interpolate=True,
                label='Зона чистого прибутку (інвестиції окупилися)')
ax.fill_between(months, y_vals, 0, where=(y_vals <= 0),
                color='#ef4444', alpha=0.12, interpolate=True,
                label='Зона інвестиційної окупності (покриття витрат CAPEX)')

# Основна крива накопиченого фінансового результату
ax.plot(months, y_vals, color='#2563eb', linewidth=2.8, marker='o',
        markersize=7.5, markerfacecolor='#1d4ed8', markeredgecolor='white', markeredgewidth=1.5,
        label='Накопичений грошовий потік (Cumulative Cash Flow)', zorder=3)

# 1. Точка стартових інвестицій (CAPEX: -495 600 грн)
ax.scatter([1], [y_vals[0]], color='#dc2626', s=130, zorder=5, edgecolors='#991b1b', linewidth=1.5)
ax.annotate('● (CAPEX: -495 600 грн)\nПочаткові капітальні витрати',
            xy=(1, y_vals[0]), xytext=(1.25, -450000),
            fontsize=9.5, fontweight='bold', color='#991b1b',
            arrowprops=dict(arrowstyle='->', color='#dc2626', lw=1.3),
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#fee2e2', edgecolor='#f87171', alpha=0.9))

# 2. Точка беззбитковості (Місяць 5, BEP)
ax.scatter([5], [y_vals[4]], color='#d97706', s=110, zorder=5, edgecolors='#b45309', linewidth=1.5)
ax.annotate('Місяць 5: Точка беззбитковості (BEP)\n50 закладів, MRR = 60 000 грн/міс',
            xy=(5, y_vals[4]), xytext=(3.1, -120000),
            fontsize=9, fontweight='bold', color='#b45309',
            arrowprops=dict(arrowstyle='->', color='#d97706', lw=1.3),
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#fef3c7', edgecolor='#f59e0b', alpha=0.9))

# 3. Точка окупності (PP = 8.8 місяців, Місяць 9)
ax.scatter([pp_month], [0], color='#16a34a', s=160, zorder=6, edgecolors='#0f172a', linewidth=1.8)
ax.axvline(pp_month, color='#16a34a', linestyle=':', linewidth=1.8, alpha=0.85, zorder=2)
ax.annotate(f'▲ Місяць 9: ТОЧКА ОКУПНОСТІ (PP = {pp_month:.1f} міс)\nПовне повернення CAPEX (Баланс = 0 грн)',
            xy=(pp_month, 0), xytext=(pp_month - 3.8, 140000),
            fontsize=9.5, fontweight='bold', color='#15803d',
            arrowprops=dict(arrowstyle='->', color='#16a34a', lw=1.6),
            bbox=dict(boxstyle='round,pad=0.5', facecolor='#dcfce7', edgecolor='#22c55e', alpha=0.95))

# 4. Точка підсумку 1-го року (Місяць 12: +515 000 грн)
ax.scatter([12], [y_vals[-1]], color='#2563eb', s=130, zorder=5, edgecolors='#1e40af', linewidth=1.5)
ax.annotate('● (Місяць 12: +515 000 грн)\nЧистий прибуток (ROI = 103.9%)',
            xy=(12, y_vals[-1]), xytext=(9.2, 440000),
            fontsize=9.5, fontweight='bold', color='#1e40af',
            arrowprops=dict(arrowstyle='->', color='#2563eb', lw=1.3),
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#dbeafe', edgecolor='#3b82f6', alpha=0.9))

# Оформлення осей у точній відповідності до тексту дисертації:
ax.set_title('Рисунок 4.3 – Графік накопиченого грошового потоку та окупності стартапу «RestoFlow»',
             fontsize=12.5, fontweight='bold', pad=18, color='#0f172a')
ax.set_xlabel('Час (Місяці)', fontsize=11, labelpad=10, fontweight='bold', color='#0f172a')
ax.set_ylabel('Накопичений прибуток, грн', fontsize=11, labelpad=10, fontweight='bold', color='#0f172a')

ax.set_xticks(months)
ax.set_xticklabels(months_labels, fontsize=9.5)

# Шкала осі Y точно як в ASCII графіку: -500к, -400к, -200к, 0, +200к, +400к, +500к
y_ticks = np.array([-500000, -400000, -200000, 0, 200000, 400000, 500000])
ax.set_yticks(y_ticks)
y_labels = ['-500к', '-400к', '-200к', '0', '+200к', '+400к', '+500к']
ax.set_yticklabels(y_labels, fontsize=9.5, fontweight='bold')

ax.set_xlim(0.6, 12.5)
ax.set_ylim(-570000, 580000)

ax.legend(loc='lower right', frameon=True, framealpha=0.95, facecolor='white', edgecolor='#cbd5e1', fontsize=9.5)

plt.tight_layout()
output_path = '/Users/vlad/University/Magistr_Diploma/restaurant/payback_period_chart.png'
plt.savefig(output_path, dpi=300)
print(f'Графік окупності успішно збережено за адресою: {output_path}')
