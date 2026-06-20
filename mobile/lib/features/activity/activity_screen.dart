import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/data/chms_repository.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/charts/dashboard_charts.dart';
import '../../widgets/church_info_card.dart';
import '../../widgets/hero_header.dart';
import '../../widgets/module_list_screen.dart';
import '../../widgets/ui_components.dart';
import '../auth/auth_repository.dart';

class ActivityScreen extends StatefulWidget {
  const ActivityScreen({super.key});

  @override
  State<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends State<ActivityScreen> {
  Map<String, dynamic>? _overview;
  List<Map<String, dynamic>> _followUps = [];
  List<Map<String, dynamic>> _events = [];
  List<Map<String, dynamic>> _auditLogs = [];
  bool _auditAvailable = false;
  bool _fromCache = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final authRepo = context.read<AuthRepository>();
      final chmsRepo = context.read<ChmsRepository>();
      final overviewSnapshot = await authRepo.fetchOverview();
      final followUps = await chmsRepo.fetchFollowUpsList();
      final events = await chmsRepo.fetchEventsList();
      List<Map<String, dynamic>> audit = [];
      var auditOk = false;
      try {
        final res = await chmsRepo.fetchAuditLogs(page: 1);
        audit = res.data;
        auditOk = true;
      } on ApiException catch (e) {
        if (e.statusCode != 403) rethrow;
      }
      if (!mounted) return;
      setState(() {
        _overview = overviewSnapshot.data;
        _fromCache = overviewSnapshot.fromCache;
        _followUps = followUps;
        _events = events;
        _auditLogs = audit;
        _auditAvailable = auditOk;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ops = _overview?['operations'] as Map<String, dynamic>?;
    final recent = _overview?['recentContributions'] as List<dynamic>? ?? [];
    final monthlyFinance = normalizeFinanceMonths(_overview?['monthlyFinance'] as List<dynamic>?);
    final attendance = _overview?['attendance'] as Map<String, dynamic>?;
    final attendanceTrend = (attendance?['trend'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: RefreshIndicator(
        onRefresh: _load,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            const SliverToBoxAdapter(
              child: PageHeroHeader(
                title: 'Activity',
                subtitle: 'Recent church updates',
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Highlights', style: Theme.of(context).textTheme.titleMedium),
                          if (_fromCache) ...[
                            const SizedBox(height: 8),
                            Text(
                              'Overview stats may be from saved offline data.',
                              style: TextStyle(color: Colors.orange.shade800, fontSize: 12),
                            ),
                          ],
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: GestureDetector(
                                  onTap: () => context.push('/follow-ups'),
                                  child: _HighlightCard(
                                    value: '${ops?['openFollowUps'] ?? 0}',
                                    label: 'Follow-ups',
                                    gradient: AppColors.statGradients[0],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: GestureDetector(
                                  onTap: () => context.push('/events'),
                                  child: _HighlightCard(
                                    value: '${ops?['upcomingEvents'] ?? 0}',
                                    label: 'Events',
                                    gradient: AppColors.statGradients[1],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          AnimatedChartEntrance(
                            index: 0,
                            child: FinanceTrendChart(months: monthlyFinance),
                          ),
                          const SizedBox(height: 12),
                          AnimatedChartEntrance(
                            index: 1,
                            child: AttendanceTrendChart(trend: attendanceTrend),
                          ),
                          const SizedBox(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Open follow-ups', style: Theme.of(context).textTheme.titleMedium),
                              TextButton(
                                onPressed: () => context.push('/follow-ups'),
                                child: const Text('See all'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          if (_followUps.isEmpty)
                            AppCard(
                              child: Text(
                                'No open follow-ups.',
                                style: TextStyle(color: Colors.grey.shade600),
                              ),
                            )
                          else
                            ..._followUps.take(3).map((item) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: InkWell(
                                  onTap: () => context.push('/follow-ups/${item['id']}'),
                                  borderRadius: BorderRadius.circular(20),
                                  child: simpleListTile(
                                    title: _followUpTitle(item),
                                    subtitle: '${item['status'] ?? 'OPEN'} · ${formatDate(item['dueDate'] as String?)}',
                                    icon: Icons.phone_in_talk_rounded,
                                    color: AppColors.rose,
                                  ),
                                ),
                              );
                            }),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Upcoming events', style: Theme.of(context).textTheme.titleMedium),
                              TextButton(
                                onPressed: () => context.push('/events'),
                                child: const Text('See all'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          if (_events.isEmpty)
                            AppCard(
                              child: Text(
                                'No upcoming events.',
                                style: TextStyle(color: Colors.grey.shade600),
                              ),
                            )
                          else
                            ..._events.take(3).map((item) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: InkWell(
                                  onTap: () => context.push('/events/${item['id']}'),
                                  borderRadius: BorderRadius.circular(20),
                                  child: simpleListTile(
                                    title: item['title'] as String? ?? 'Event',
                                    subtitle: formatDate(item['startAt'] as String? ?? item['startDate'] as String?),
                                    icon: Icons.event_rounded,
                                    color: AppColors.amber,
                                  ),
                                ),
                              );
                            }),
                          const SizedBox(height: 16),
                          if (_auditAvailable) ...[
                            Text('System audit', style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: 8),
                            if (_auditLogs.isEmpty)
                              AppCard(
                                child: Text(
                                  'No audit entries yet.',
                                  style: TextStyle(color: Colors.grey.shade600),
                                ),
                              )
                            else
                              ..._auditLogs.take(8).map((entry) {
                                final user = entry['user'] as Map<String, dynamic>?;
                                final actor = user != null
                                    ? '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim()
                                    : 'System';
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: AppCard(
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          width: 44,
                                          height: 44,
                                          decoration: BoxDecoration(
                                            gradient: AppColors.statGradients[3],
                                            borderRadius: BorderRadius.circular(14),
                                          ),
                                          child: const Icon(Icons.history_rounded, color: Colors.white),
                                        ),
                                        const SizedBox(width: 14),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                _formatAuditAction(entry['action'] as String?),
                                                style: const TextStyle(fontWeight: FontWeight.w600),
                                              ),
                                              Text(
                                                '$actor · ${formatDate(entry['createdAt'] as String?)}',
                                                style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }),
                            const SizedBox(height: 16),
                          ],
                          Text('Recent giving', style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 12),
                          if (recent.isEmpty)
                            AppCard(
                              child: Text(
                                'No recent contributions yet.',
                                style: TextStyle(color: Colors.grey.shade600),
                              ),
                            )
                          else
                            ...recent.take(5).map((item) {
                              final c = item as Map<String, dynamic>;
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: AppCard(
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 44,
                                        height: 44,
                                        decoration: BoxDecoration(
                                          gradient: AppColors.statGradients[2],
                                          borderRadius: BorderRadius.circular(14),
                                        ),
                                        child: const Icon(Icons.payments_rounded, color: Colors.white),
                                      ),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              c['member'] as String? ?? 'Anonymous',
                                              style: const TextStyle(fontWeight: FontWeight.w600),
                                            ),
                                            Text(
                                              '${c['type'] ?? ''} · ${c['fund'] ?? ''}',
                                              style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Text(
                                        '₦${c['amount'] ?? 0}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.emerald,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HighlightCard extends StatelessWidget {
  const _HighlightCard({
    required this.value,
    required this.label,
    required this.gradient,
  });

  final String value;
  final String label;
  final Gradient gradient;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.navy.withValues(alpha: 0.15),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.w700,
            ),
          ),
          Text(
            label,
            style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 12),
          ),
        ],
      ),
    );
  }
}

String _followUpTitle(Map<String, dynamic> item) {
  final member = item['member'] as Map<String, dynamic>?;
  if (member != null) {
    final name = '${member['firstName'] ?? ''} ${member['lastName'] ?? ''}'.trim();
    if (name.isNotEmpty) return name;
  }
  return item['contactName'] as String? ??
      (item['type'] as String?)?.replaceAll('_', ' ') ??
      'Follow-up';
}

String _formatAuditAction(String? action) {
  if (action == null || action.isEmpty) return 'Activity';
  return action
      .split('.')
      .map((part) => part.replaceAll('_', ' '))
      .join(' · ')
      .split(' ')
      .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}')
      .join(' ');
}
