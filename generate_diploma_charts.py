#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Скрипт побудови графіка окупності та точки беззбитковості стартап-проєкту «RestoFlow»
для магістерської дисертації (Розділ 4: «Розроблення стартап-проєкту системи», підрозділ 4.4).

Параметри з дисертації:
- CAPEX (початкові інвестиції на розробку): 495 600 грн
- Точка беззбитковості (BEP): 5-й місяць (50 підключених закладів, 60 000 грн/міс)
- Термін окупності інвестицій (PP): 8.8 місяців (~9-й місяць)
- Чистий накопичений фінансовий результат за 1-й рік: +515 000 грн
- Рентабельність інвестицій (ROI): 103.9%
- Чистий приведений дохід (NPV за 2 роки при r=15%): ~1 180 000 грн
"""

import matplotlib.pyplot as plt
import numpy as np

# Загальні налаштування стилю (вимоги ДСТУ / ВАК для дипломних робіт)
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Liberation Sans']
plt.rcParams['font.size'] = 10
plt.rcParams['axes.edgecolor'] = '#334155'
plt.rcParams['axes.linewidth'] = 1.0

def plot_payback_period():
    """
    Побудова графіка накопиченого грошового потоку та окупності (Рисунок 4.3 дипломної роботи).
    """
    months = np.arange(0, 13)
    months_labels = ['Старт (0)'] + [f'Міс {i}' for i in range(1, 13)]

    # Траєкторія накопиченого грошового потоку (грн):
    # Старт: -495 600 грн (CAPEX)
    # Місяць 5: досягнення точки беззбитковості (BEP)
    # Місяць 8.8: перетин 0 грн (Точка окупності, PP = 8.8 міс)
    # Місяць 12: +515 000 грн чистого прибутку
    cum_cash_flow = np.array([
        -495600,  # 0
        -455000,  # 1
        -410000,  # 2
        -360000,  # 3
        -300000,  # 4
        -235000,  # 5 (BEP подолано, щомісячний прибуток додатний)
        -165000,  # 6
        -95000,   # 7
        -35000,   # 8
        45000,    # 9 (інвестиції повністю повернуто!)
        160000,   # 10
        320000,   # 11
        515000    # 12
    ])

    fig, ax = plt.subplots(figsize=(11.5, 6.8), dpi=300)

    # Сітка
    ax.grid(True, linestyle='--', alpha=0.5, color='#cbd5e1', zorder=1)
    ax.axhline(0, color='#0f172a', linewidth=1.5, linestyle='-', zorder=2)

    # Заливка зон збитків та прибутку
    ax.fill_between(months, cum_cash_flow, 0, where=(cum_cash_flow >= 0),
                    color='#10b981', alpha=0.18, interpolate=True,
                    label='Зона чистого прибутку (інвестиції окупилися)')
    ax.fill_between(months, cum_cash_flow, 0, where=(cum_cash_flow <= 0),
                    color='#ef4444', alpha=0.12, interpolate=True,
                    label='Зона інвестиційної окупності (покриття витрат)')

    # Основна крива
    ax.plot(months, cum_cash_flow, color='#2563eb', linewidth=3.0, marker='o',
            markersize=7, markerfacecolor='#1d4ed8', markeredgecolor='white', markeredgewidth=1.5,
            label='Накопичений грошовий потік (Cumulative Cash Flow)', zorder=4)

    # 1. Початкова точка інвестицій CAPEX
    ax.scatter([0], [-495600], color='#dc2626', s=110, zorder=5)
    ax.annotate('Стартові інвестиції (CAPEX)\n-495 600 грн',
                xy=(0, -495600), xytext=(0.4, -450000),
                fontsize=9.5, fontweight='bold', color='#991b1b',
                arrowprops=dict(arrowstyle='->', color='#dc2626', lw=1.3),
                bbox=dict(boxstyle='round,pad=0.4', facecolor='#fee2e2', edgecolor='#f87171', alpha=0.9))

    # 2. Точка беззбитковості (BEP на 5-й місяць)
    ax.scatter([5], [cum_cash_flow[5]], color='#d97706', s=100, zorder=5)
    ax.annotate('Точка беззбитковості (BEP)\nМісяць 5 (50 закладів)\nMRR = 60 000 грн',
                xy=(5, cum_cash_flow[5]), xytext=(3.2, -130000),
                fontsize=9, fontweight='bold', color='#b45309',
                arrowprops=dict(arrowstyle='->', color='#d97706', lw=1.3),
                bbox=dict(boxstyle='round,pad=0.4', facecolor='#fef3c7', edgecolor='#f59e0b', alpha=0.9))

    # 3. Точка окупності (PP = 8.8 місяців)
    # Точний перетин нуля між 8 і 9 місяцем:
    pp_x = 8 + (0 - cum_cash_flow[8]) / (cum_cash_flow[9] - cum_cash_flow[8])
    ax.scatter([pp_x], [0], color='#16a34a', s=140, zorder=6, edgecolors='#0f172a', linewidth=1.8)
    ax.axvline(pp_x, color='#16a34a', linestyle=':', linewidth=1.6, alpha=0.85, zorder=2)
    ax.annotate(f'ТОЧКА ОКУПНОСТІ (PP = {pp_x:.1f} міс)\nПовне повернення CAPEX\n(Баланс проекту = 0 грн)',
                xy=(pp_x, 0), xytext=(pp_x - 3.4, 150000),
                fontsize=9.5, fontweight='bold', color='#15803d',
                arrowprops=dict(arrowstyle='->', color='#16a34a', lw=1.6),
                bbox=dict(boxstyle='round,pad=0.5', facecolor='#dcfce7', edgecolor='#22c55e', alpha=0.95))

    # 4. Фінал першого року (Місяць 12)
    ax.scatter([12], [cum_cash_flow[-1]], color='#2563eb', s=110, zorder=5)
    ax.annotate('Підсумок 1-го року\n+515 000 грн прибутку\n(ROI = 103.9%)',
                xy=(12, cum_cash_flow[-1]), xytext=(9.7, 430000),
                fontsize=9.5, fontweight='bold', color='#1e40af',
                arrowprops=dict(arrowstyle='->', color='#2563eb', lw=1.3),
                bbox=dict(boxstyle='round,pad=0.4', facecolor='#dbeafe', edgecolor='#3b82f6', alpha=0.9))

    # Оформлення осей
    ax.set_title('Рисунок 4.3 – Графік накопиченого грошового потоку та окупності стартапу «RestoFlow»',
                 fontsize=12.5, fontweight='bold', pad=16, color='#0f172a')
    ax.set_xlabel('Період реалізації стартап-проєкту, місяці', fontsize=11, labelpad=10, fontweight='bold', color='#1e293b')
    ax.set_ylabel('Накопичений грошовий потік, грн', fontsize=11, labelpad=10, fontweight='bold', color='#1e293b')

    ax.set_xticks(months)
    ax.set_xticklabels(months_labels, fontsize=9.5)

    y_ticks = np.arange(-500000, 600001, 100000)
    ax.set_yticks(y_ticks)
    ax.set_yticklabels([f'{int(y):,d} грн'.replace(',', ' ') for y in y_ticks], fontsize=9)

    ax.set_xlim(-0.4, 12.6)
    ax.set_ylim(-560000, 600000)

    ax.legend(loc='lower right', frameon=True, framealpha=0.95, facecolor='white', edgecolor='#cbd5e1', fontsize=9.5)

    plt.tight_layout()
    output_file = 'payback_period_chart.png'
    plt.savefig(output_file, dpi=300)
    print(f'Графік окупності збережено: {output_file}')
    plt.close()

def plot_breakeven_point():
    """
    Побудова графіка точки беззбитковості (Рисунок 4.2 дипломної роботи).
    Порівняння динаміки MRR (щомісячний дохід) та OPEX (щомісячні операційні витрати).
    """
    months = np.arange(1, 13)
    months_labels = [f'Міс {i}' for i in months]

    # Дані з Таблиці 4.9 дипломної роботи
    mrr = [6000, 15600, 27600, 42000, 60000, 78000, 99600, 123600, 147600, 174000, 204000, 234000]
    opex = [45000, 48000, 50000, 52000, 58000, 60000, 61500, 61500, 63000, 65000, 65000, 68000]

    fig, ax = plt.subplots(figsize=(11, 6.2), dpi=300)
    ax.grid(True, linestyle='--', alpha=0.5, color='#cbd5e1', zorder=1)

    # Лінії MRR та OPEX
    ax.plot(months, mrr, color='#16a34a', linewidth=2.8, marker='s', markersize=6.5, label='Дохід (MRR), грн/міс', zorder=4)
    ax.plot(months, opex, color='#dc2626', linewidth=2.8, marker='^', markersize=6.5, label='Операційні витрати (OPEX), грн/міс', zorder=4)

    # Області прибутку та збитків
    ax.fill_between(months, mrr, opex, where=(np.array(mrr) >= np.array(opex)), color='#10b981', alpha=0.15, interpolate=True, label='Зона операційного прибутку')
    ax.fill_between(months, mrr, opex, where=(np.array(mrr) <= np.array(opex)), color='#ef4444', alpha=0.12, interpolate=True, label='Зона операційного збитку')

    # Точка перетину (Місяць 5, BEP = 60 000 грн)
    ax.scatter([5], [60000], color='#d97706', s=130, zorder=6, edgecolors='#0f172a', linewidth=1.5)
    ax.axvline(5, color='#d97706', linestyle=':', linewidth=1.5, alpha=0.8, zorder=2)
    ax.annotate('ТОЧКА БЕЗЗБИТКОВОСТІ (BEP)\n5-й місяць: 50 закладів\nMRR = OPEX = 60 000 грн/міс',
                xy=(5, 60000), xytext=(2.2, 110000),
                fontsize=9.5, fontweight='bold', color='#b45309',
                arrowprops=dict(arrowstyle='->', color='#d97706', lw=1.5),
                bbox=dict(boxstyle='round,pad=0.5', facecolor='#fef3c7', edgecolor='#f59e0b', alpha=0.95))

    ax.set_title('Рисунок 4.2 – Графік визначення точки беззбитковості (Break-Even Point) стартапу',
                 fontsize=12.5, fontweight='bold', pad=16, color='#0f172a')
    ax.set_xlabel('Період комерційної експлуатації, місяці', fontsize=11, labelpad=10, fontweight='bold', color='#1e293b')
    ax.set_ylabel('Обсяг коштів, грн / місяць', fontsize=11, labelpad=10, fontweight='bold', color='#1e293b')

    ax.set_xticks(months)
    ax.set_xticklabels(months_labels, fontsize=9.5)

    y_ticks = np.arange(0, 260001, 40000)
    ax.set_yticks(y_ticks)
    ax.set_yticklabels([f'{int(y):,d} грн'.replace(',', ' ') for y in y_ticks], fontsize=9)

    ax.set_xlim(0.6, 12.4)
    ax.set_ylim(0, 260000)

    ax.legend(loc='upper left', frameon=True, framealpha=0.95, facecolor='white', edgecolor='#cbd5e1', fontsize=9.5)

    plt.tight_layout()
    output_file = 'breakeven_point_chart.png'
    plt.savefig(output_file, dpi=300)
    print(f'Графік точки беззбитковості збережено: {output_file}')
    plt.close()

if __name__ == '__main__':
    plot_payback_period()
    plot_breakeven_point()
    print('Усі графіки для 4-го розділу дисертації успішно згенеровано!')
