import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../ui_components.dart';

/// Normalizes finance trend rows from overview (`month`) or summary API (`label`).
List<Map<String, dynamic>> normalizeFinanceMonths(List<dynamic>? raw) {
  return (raw ?? []).map((e) {
    final row = Map<String, dynamic>.from(e as Map);
    return {
      'month': row['month'] as String? ?? row['label'] as String? ?? '',
      'income': row['income'],
      'expense': row['expense'],
    };
  }).toList();
}

class FinanceTrendChart extends StatelessWidget {
  const FinanceTrendChart({super.key, required this.months});

  final List<Map<String, dynamic>> months;

  @override
  Widget build(BuildContext context) {
    if (months.isEmpty) {
      return const _ChartEmpty(message: 'No finance data yet');
    }

    final maxY = months.fold<double>(0, (m, row) {
      final income = _num(row['income']);
      final expense = _num(row['expense']);
      return [m, income, expense].reduce((a, b) => a > b ? a : b);
    });

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _ChartHeader(
            title: 'Giving vs expenses',
            subtitle: 'Last 6 months',
            icon: Icons.bar_chart_rounded,
            color: AppColors.flameOrange,
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 200,
            child: BarChart(
              BarChartData(
                maxY: maxY <= 0 ? 1 : maxY * 1.2,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (v) => FlLine(
                    color: Colors.grey.shade200,
                    strokeWidth: 1,
                  ),
                ),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 42,
                      getTitlesWidget: (v, _) => Text(
                        _compactMoney(v),
                        style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
                      ),
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (i, _) {
                        final idx = i.toInt();
                        if (idx < 0 || idx >= months.length) return const SizedBox.shrink();
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            months[idx]['month'] as String? ?? '',
                            style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                barGroups: List.generate(months.length, (i) {
                  final row = months[i];
                  return BarChartGroupData(
                    x: i,
                    barRods: [
                      BarChartRodData(
                        toY: _num(row['income']),
                        color: AppColors.gold,
                        width: 8,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                      ),
                      BarChartRodData(
                        toY: _num(row['expense']),
                        color: AppColors.rose,
                        width: 8,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                      ),
                    ],
                    barsSpace: 4,
                  );
                }),
              ),
            ),
          ),
          const SizedBox(height: 12),
          const _ChartLegend(items: [
            _LegendItem(color: AppColors.gold, label: 'Income'),
            _LegendItem(color: AppColors.flame, label: 'Expenses'),
          ]),
        ],
      ),
    );
  }
}

class AttendanceTrendChart extends StatelessWidget {
  const AttendanceTrendChart({super.key, required this.trend});

  final List<Map<String, dynamic>> trend;

  @override
  Widget build(BuildContext context) {
    if (trend.isEmpty) {
      return const _ChartEmpty(message: 'No attendance sessions yet');
    }

    final spots = List.generate(trend.length, (i) {
      return FlSpot(i.toDouble(), _num(trend[i]['totalCount']));
    });
    final maxY = spots.fold<double>(0, (m, s) => s.y > m ? s.y : m);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _ChartHeader(
            title: 'Attendance trend',
            subtitle: 'Recent services',
            icon: Icons.show_chart_rounded,
            color: AppColors.navy,
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 180,
            child: LineChart(
              LineChartData(
                minY: 0,
                maxY: maxY <= 0 ? 10 : maxY * 1.15,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (v) => FlLine(
                    color: Colors.grey.shade200,
                    strokeWidth: 1,
                  ),
                ),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 32,
                      getTitlesWidget: (v, _) => Text(
                        v.toInt().toString(),
                        style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
                      ),
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      interval: 1,
                      getTitlesWidget: (i, _) {
                        final idx = i.toInt();
                        if (idx < 0 || idx >= trend.length) return const SizedBox.shrink();
                        final date = trend[idx]['date'] as String?;
                        if (date == null) return const SizedBox.shrink();
                        final d = DateTime.tryParse(date);
                        final label = d != null ? '${d.day}/${d.month}' : '';
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            label,
                            style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    color: AppColors.navy,
                    barWidth: 3,
                    dotData: FlDotData(
                      show: true,
                      getDotPainter: (_, __, ___, ____) => FlDotCirclePainter(
                        radius: 4,
                        color: Colors.white,
                        strokeWidth: 2,
                        strokeColor: AppColors.navy,
                      ),
                    ),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          AppColors.navy.withValues(alpha: 0.25),
                          AppColors.navy.withValues(alpha: 0.02),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class MemberStatusChart extends StatelessWidget {
  const MemberStatusChart({super.key, required this.byStatus, required this.total});

  final List<Map<String, dynamic>> byStatus;
  final int total;

  static const _colors = AppColors.quickActionColors;

  @override
  Widget build(BuildContext context) {
    if (byStatus.isEmpty || total <= 0) {
      return const _ChartEmpty(message: 'No member breakdown yet');
    }

    final sections = List.generate(byStatus.length, (i) {
      final row = byStatus[i];
      final count = (row['count'] as num?)?.toInt() ?? 0;
      return PieChartSectionData(
        value: count.toDouble(),
        title: count > 0 ? '$count' : '',
        titleStyle: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w700,
          fontSize: 11,
        ),
        color: _colors[i % _colors.length],
        radius: 52,
        titlePositionPercentageOffset: 0.55,
      );
    });

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _ChartHeader(
            title: 'Member status',
            subtitle: '$total total members',
            icon: Icons.donut_large_rounded,
            color: AppColors.navy,
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 180,
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: PieChart(
                    PieChartData(
                      sectionsSpace: 2,
                      centerSpaceRadius: 36,
                      sections: sections,
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: List.generate(byStatus.length, (i) {
                      final row = byStatus[i];
                      final status = (row['status'] as String? ?? '').replaceAll('_', ' ');
                      final count = (row['count'] as num?)?.toInt() ?? 0;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: _colors[i % _colors.length],
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                status,
                                style: TextStyle(fontSize: 11, color: Colors.grey.shade700),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              '$count',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                            ),
                          ],
                        ),
                      );
                    }),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChartHeader extends StatelessWidget {
  const _ChartHeader({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: color, size: 22),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              Text(subtitle, style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
            ],
          ),
        ),
      ],
    );
  }
}

class _ChartLegend extends StatelessWidget {
  const _ChartLegend({required this.items});

  final List<_LegendItem> items;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 16,
      runSpacing: 8,
      children: items
          .map(
            (item) => Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(color: item.color, borderRadius: BorderRadius.circular(3)),
                ),
                const SizedBox(width: 6),
                Text(item.label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              ],
            ),
          )
          .toList(),
    );
  }
}

class _LegendItem {
  const _LegendItem({required this.color, required this.label});
  final Color color;
  final String label;
}

class _ChartEmpty extends StatelessWidget {
  const _ChartEmpty({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(
        children: [
          Icon(Icons.insights_rounded, color: Colors.grey.shade400),
          const SizedBox(width: 12),
          Expanded(
            child: Text(message, style: TextStyle(color: Colors.grey.shade600)),
          ),
        ],
      ),
    );
  }
}

double _num(dynamic value) {
  if (value == null) return 0;
  if (value is num) return value.toDouble();
  return double.tryParse('$value') ?? 0;
}

String _compactMoney(double value) {
  if (value >= 1000000) return '${(value / 1000000).toStringAsFixed(1)}M';
  if (value >= 1000) return '${(value / 1000).toStringAsFixed(0)}K';
  return value.toStringAsFixed(0);
}

class GivingBreakdownChart extends StatelessWidget {
  const GivingBreakdownChart({super.key, required this.items});

  final List<Map<String, dynamic>> items;

  @override
  Widget build(BuildContext context) {
    return _AmountBreakdownChart(
      title: 'Giving by type',
      subtitle: 'Income breakdown',
      icon: Icons.pie_chart_rounded,
      color: AppColors.gold,
      items: items,
      emptyMessage: 'No giving breakdown yet',
    );
  }
}

class ExpenseCategoryChart extends StatelessWidget {
  const ExpenseCategoryChart({super.key, required this.items});

  final List<Map<String, dynamic>> items;

  @override
  Widget build(BuildContext context) {
    return _AmountBreakdownChart(
      title: 'Expenses by category',
      subtitle: 'Spending breakdown',
      icon: Icons.donut_large_rounded,
      color: AppColors.flame,
      items: items,
      emptyMessage: 'No expense breakdown yet',
    );
  }
}

class _AmountBreakdownChart extends StatelessWidget {
  const _AmountBreakdownChart({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.items,
    required this.emptyMessage,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final List<Map<String, dynamic>> items;
  final String emptyMessage;

  static const _colors = AppColors.quickActionColors;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return _ChartEmpty(message: emptyMessage);

    final total = items.fold<double>(0, (s, row) => s + _num(row['amount']));
    if (total <= 0) return _ChartEmpty(message: emptyMessage);

    final sections = List.generate(items.length.clamp(0, 6), (i) {
      final row = items[i];
      final amount = _num(row['amount']);
      return PieChartSectionData(
        value: amount,
        title: amount > 0 ? '' : '',
        color: _colors[i % _colors.length],
        radius: 48,
      );
    });

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _ChartHeader(title: title, subtitle: subtitle, icon: icon, color: color),
          const SizedBox(height: 16),
          SizedBox(
            height: 160,
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: PieChart(
                    PieChartData(
                      sectionsSpace: 2,
                      centerSpaceRadius: 32,
                      sections: sections,
                    ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: List.generate(items.length.clamp(0, 6), (i) {
                      final row = items[i];
                      final name = row['name'] as String? ?? 'Other';
                      final amount = _num(row['amount']);
                      final pct = total > 0 ? (amount / total * 100).round() : 0;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: _colors[i % _colors.length],
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                name,
                                style: TextStyle(fontSize: 11, color: Colors.grey.shade700),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              '$pct%',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
                            ),
                          ],
                        ),
                      );
                    }),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
