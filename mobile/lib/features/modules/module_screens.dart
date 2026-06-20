import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/auth/permissions.dart';
import '../../core/branding/branding_controller.dart';
import '../../core/data/chms_repository.dart';
import '../../core/theme/app_colors.dart';
import '../../features/auth/auth_controller.dart';
import '../../widgets/charts/dashboard_charts.dart';
import '../../widgets/church_info_card.dart';
import '../../widgets/church_logo.dart';
import '../../widgets/module_list_screen.dart';

class MembersScreen extends StatefulWidget {
  const MembersScreen({super.key});

  @override
  State<MembersScreen> createState() => _MembersScreenState();
}

class _MembersScreenState extends State<MembersScreen> {
  int _refresh = 0;

  @override
  Widget build(BuildContext context) {
    final repo = context.read<ChmsRepository>();
    final user = context.watch<AuthController>().user;
    return ModuleListScreen(
      refreshTrigger: _refresh,
      title: 'Members',
      subtitle: 'Church directory',
      searchHint: 'Search by name, email, phone…',
      emptyMessage: 'No members found.',
      headerColor: AppColors.indigo,
      floatingAction: canAccess(user, Perm.memberCreate)
          ? FloatingActionButton.extended(
              onPressed: () async {
                final ok = await context.push<bool>('/members/new');
                if (ok == true) setState(() => _refresh++);
              },
              backgroundColor: AppColors.indigo,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.person_add_rounded, color: Colors.white),
              label: const Text('New member', style: TextStyle(color: Colors.white)),
            )
          : null,
      loadPage: (page, search) async {
        final res = await repo.fetchMembers(page: page, search: search);
        return (items: res.data, totalPages: res.totalPages);
      },
      onItemTap: (item) => context.push('/members/${item['id']}'),
      itemBuilder: (_, item) => memberListTile(item, AppColors.indigo),
    );
  }
}

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  int _refresh = 0;

  @override
  Widget build(BuildContext context) {
    final repo = context.read<ChmsRepository>();
    final user = context.watch<AuthController>().user;
    return ModuleListScreen(
      refreshTrigger: _refresh,
      title: 'Events',
      subtitle: 'Upcoming & past events',
      searchHint: 'Search events…',
      headerColor: AppColors.violet,
      floatingAction: canAccess(user, Perm.eventCreate)
          ? FloatingActionButton.extended(
              onPressed: () async {
                final ok = await context.push<bool>('/events/new');
                if (ok == true) setState(() => _refresh++);
              },
              backgroundColor: AppColors.violet,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_rounded, color: Colors.white),
              label: const Text('New event', style: TextStyle(color: Colors.white)),
            )
          : null,
      loadPage: (_, search) async {
        final items = await repo.fetchEventsList(search: search);
        return (items: items, totalPages: 1);
      },
      onItemTap: (item) => context.push('/events/${item['id']}'),
      itemBuilder: (_, item) => simpleListTile(
        title: item['title'] as String? ?? 'Event',
        subtitle: formatDate(item['startAt'] as String? ?? item['startDate'] as String?),
        icon: Icons.event_rounded,
        color: AppColors.violet,
      ),
    );
  }
}

class GroupsScreen extends StatefulWidget {
  const GroupsScreen({super.key});

  @override
  State<GroupsScreen> createState() => _GroupsScreenState();
}

class _GroupsScreenState extends State<GroupsScreen> {
  int _refresh = 0;

  @override
  Widget build(BuildContext context) {
    final repo = context.read<ChmsRepository>();
    final user = context.watch<AuthController>().user;
    return ModuleListScreen(
      refreshTrigger: _refresh,
      title: 'Groups',
      subtitle: 'Small groups & ministries',
      searchHint: 'Search groups…',
      headerColor: AppColors.emerald,
      floatingAction: canAccess(user, Perm.groupCreate)
          ? FloatingActionButton.extended(
              onPressed: () async {
                final ok = await context.push<bool>('/groups/new');
                if (ok == true) setState(() => _refresh++);
              },
              backgroundColor: AppColors.emerald,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_rounded, color: Colors.white),
              label: const Text('New group', style: TextStyle(color: Colors.white)),
            )
          : null,
      loadPage: (_, search) async {
        final items = await repo.fetchGroupsList();
        final filtered = search == null || search.isEmpty
            ? items
            : items.where((g) {
                final q = search.toLowerCase();
                return (g['name'] as String? ?? '').toLowerCase().contains(q) ||
                    (g['description'] as String? ?? '').toLowerCase().contains(q);
              }).toList();
        return (items: filtered, totalPages: 1);
      },
      onItemTap: (item) => context.push('/groups/${item['id']}'),
      itemBuilder: (_, item) => simpleListTile(
        title: item['name'] as String? ?? 'Group',
        subtitle: item['category'] as String? ?? item['description'] as String? ?? '',
        icon: Icons.groups_rounded,
        color: AppColors.emerald,
      ),
    );
  }
}

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  int _refresh = 0;

  @override
  Widget build(BuildContext context) {
    final repo = context.read<ChmsRepository>();
    final user = context.watch<AuthController>().user;
    return ModuleListScreen(
      refreshTrigger: _refresh,
      title: 'Attendance',
      subtitle: 'Service sessions',
      searchHint: 'Search sessions…',
      headerColor: AppColors.sky,
      floatingAction: canAccess(user, Perm.attendanceCreate)
          ? FloatingActionButton.extended(
              onPressed: () async {
                final ok = await context.push<bool>('/attendance/new');
                if (ok == true) setState(() => _refresh++);
              },
              backgroundColor: AppColors.sky,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_rounded, color: Colors.white),
              label: const Text('Record', style: TextStyle(color: Colors.white)),
            )
          : null,
      loadPage: (page, search) async {
        final res = await repo.fetchAttendance(page: page, search: search);
        return (items: res.data, totalPages: res.totalPages);
      },
      onItemTap: (item) => context.push('/attendance/${item['id']}'),
      itemBuilder: (_, item) => simpleListTile(
        title: item['title'] as String? ?? 'Service',
        subtitle: '${formatDate(item['date'] as String?)} · ${item['totalCount'] ?? 0} present',
        icon: Icons.event_available_rounded,
        color: AppColors.sky,
      ),
    );
  }
}

class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key});

  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  Map<String, dynamic>? _summary;
  bool _loadingSummary = true;
  int _listKey = 0;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadSummary());
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _loadSummary() async {
    try {
      final s = await context.read<ChmsRepository>().fetchFinanceSummary();
      if (mounted) setState(() { _summary = s; _loadingSummary = false; });
    } catch (_) {
      if (mounted) setState(() => _loadingSummary = false);
    }
  }

  Future<void> _recordIncome() async {
    final ok = await context.push<bool>('/finance/contribution/new');
    if (ok == true && mounted) {
      _loadSummary();
      setState(() => _listKey++);
    }
  }

  Future<void> _recordExpense() async {
    final ok = await context.push<bool>('/finance/expense/new');
    if (ok == true && mounted) {
      _loadSummary();
      setState(() => _listKey++);
    }
  }

  @override
  Widget build(BuildContext context) {
    final repo = context.read<ChmsRepository>();
    final user = context.watch<AuthController>().user;
    final branding = context.watch<BrandingController>().branding;
    final canIncome = canAccess(user, Perm.contributionCreate);
    final canExpense = canAccess(user, Perm.expenseCreate);

    final monthlyTrend = normalizeFinanceMonths(_summary?['monthlyTrend'] as List<dynamic>?);
    final byType = (_summary?['byType'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final byCategory = (_summary?['byCategory'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();

    return Scaffold(
      backgroundColor: AppColors.surface,
      floatingActionButton: _tabs.index == 0
          ? (canIncome
              ? FloatingActionButton.extended(
                  onPressed: _recordIncome,
                  backgroundColor: AppColors.emerald,
                  foregroundColor: Colors.white,
                  icon: const Icon(Icons.add_rounded, color: Colors.white),
                  label: const Text('Income', style: TextStyle(color: Colors.white)),
                )
              : null)
          : (canExpense
              ? FloatingActionButton.extended(
                  onPressed: _recordExpense,
                  backgroundColor: AppColors.coral,
                  foregroundColor: Colors.white,
                  icon: const Icon(Icons.add_rounded, color: Colors.white),
                  label: const Text('Expense', style: TextStyle(color: Colors.white)),
                )
              : null),
      body: Column(
        children: [
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.coral, AppColors.amber.withValues(alpha: 0.85)],
              ),
            ),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 4, 16, 16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        IconButton(
                          onPressed: () => context.pop(),
                          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                        ),
                        ChurchLogo(
                          branding: branding,
                          variant: ChurchLogoVariant.compact,
                        ),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Text(
                            'Finance',
                            style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                    if (_loadingSummary)
                      const Padding(
                        padding: EdgeInsets.all(16),
                        child: CircularProgressIndicator(color: Colors.white),
                      )
                    else ...[
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: _FinanceMiniCard(
                                label: 'Income',
                                value: formatMoney(_summary?['totalIncome']),
                                gradient: AppColors.statGradients[1],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _FinanceMiniCard(
                                label: 'Expenses',
                                value: formatMoney(_summary?['totalExpense']),
                                gradient: AppColors.statGradients[2],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _FinanceMiniCard(
                                label: 'Net',
                                value: formatMoney(_summary?['netBalance']),
                                gradient: AppColors.statGradients[3],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text(
                          'This month: ${formatMoney(_summary?['monthIncome'])} in · ${formatMoney(_summary?['monthExpense'])} out',
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.88), fontSize: 12),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    TabBar(
                      controller: _tabs,
                      onTap: (_) => setState(() {}),
                      indicatorColor: Colors.white,
                      labelColor: Colors.white,
                      unselectedLabelColor: Colors.white70,
                      tabs: const [Tab(text: 'Income'), Tab(text: 'Expenses')],
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (!_loadingSummary && _summary != null)
            SizedBox(
              height: 400,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                children: [
                  AnimatedChartEntrance(
                    index: 0,
                    child: FinanceTrendChart(months: monthlyTrend),
                  ),
                  const SizedBox(height: 12),
                  AnimatedChartEntrance(
                    index: 1,
                    child: GivingBreakdownChart(items: byType),
                  ),
                  const SizedBox(height: 12),
                  AnimatedChartEntrance(
                    index: 2,
                    child: ExpenseCategoryChart(items: byCategory),
                  ),
                ],
              ),
            ),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                _FinanceList(
                  key: ValueKey('income_$_listKey'),
                  loadPage: (p, _) async {
                    final r = await repo.fetchContributions(page: p);
                    return (items: r.data, totalPages: r.totalPages);
                  },
                  itemBuilder: (_, item) => simpleListTile(
                    title: formatMoney(item['amount']),
                    subtitle: '${item['receiptNumber'] ?? ''} · ${formatDate(item['contributedAt'] as String?)}',
                    icon: Icons.payments_rounded,
                    color: AppColors.emerald,
                  ),
                ),
                _FinanceList(
                  key: ValueKey('expense_$_listKey'),
                  loadPage: (p, _) async {
                    final r = await repo.fetchExpenses(page: p);
                    return (items: r.data, totalPages: r.totalPages);
                  },
                  itemBuilder: (_, item) => simpleListTile(
                    title: formatMoney(item['amount']),
                    subtitle: item['description'] as String? ?? formatDate(item['expenseDate'] as String?),
                    icon: Icons.receipt_long_rounded,
                    color: AppColors.coral,
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

class _FinanceMiniCard extends StatelessWidget {
  const _FinanceMiniCard({required this.label, required this.value, required this.gradient});

  final String label;
  final String value;
  final Gradient gradient;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
          Text(label, style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 11)),
        ],
      ),
    );
  }
}

class _FinanceList extends StatefulWidget {
  const _FinanceList({super.key, required this.loadPage, required this.itemBuilder});

  final ModuleLoadPage loadPage;
  final Widget Function(BuildContext, Map<String, dynamic>) itemBuilder;

  @override
  State<_FinanceList> createState() => _FinanceListState();
}

class _FinanceListState extends State<_FinanceList> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final r = await widget.loadPage(1, null);
      if (mounted) setState(() { _items = r.items; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_items.isEmpty) {
      return Center(child: Text('No records.', style: TextStyle(color: Colors.grey.shade600)));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(20),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, i) => widget.itemBuilder(context, _items[i]),
      ),
    );
  }
}

class FollowUpsScreen extends StatefulWidget {
  const FollowUpsScreen({super.key});

  @override
  State<FollowUpsScreen> createState() => _FollowUpsScreenState();
}

class _FollowUpsScreenState extends State<FollowUpsScreen> {
  int _refresh = 0;

  @override
  Widget build(BuildContext context) {
    final repo = context.read<ChmsRepository>();
    final user = context.watch<AuthController>().user;
    return ModuleListScreen(
      refreshTrigger: _refresh,
      title: 'Follow-ups',
      subtitle: 'Pastoral care tasks',
      searchHint: 'Search by name or type…',
      headerColor: AppColors.rose,
      emptyMessage: 'No follow-ups found.',
      floatingAction: canAccess(user, Perm.followupCreate)
          ? FloatingActionButton.extended(
              onPressed: () async {
                final ok = await context.push<bool>('/follow-ups/new');
                if (ok == true) setState(() => _refresh++);
              },
              backgroundColor: AppColors.rose,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_rounded, color: Colors.white),
              label: const Text('New', style: TextStyle(color: Colors.white)),
            )
          : null,
      loadPage: (_, search) async {
        final items = await repo.fetchFollowUpsList();
        final filtered = search == null || search.isEmpty
            ? items
            : items.where((item) {
                final q = search.toLowerCase();
                final title = _followUpTitle(item).toLowerCase();
                return title.contains(q) ||
                    (item['type'] as String? ?? '').toLowerCase().contains(q) ||
                    (item['notes'] as String? ?? '').toLowerCase().contains(q);
              }).toList();
        return (items: filtered, totalPages: 1);
      },
      onItemTap: (item) => context.push('/follow-ups/${item['id']}'),
      itemBuilder: (_, item) => simpleListTile(
        title: _followUpTitle(item),
        subtitle: '${item['status'] ?? 'OPEN'} · ${formatDate(item['dueDate'] as String?)}',
        icon: Icons.phone_in_talk_rounded,
        color: AppColors.rose,
      ),
    );
  }
}

class TestimoniesScreen extends StatefulWidget {
  const TestimoniesScreen({super.key});

  @override
  State<TestimoniesScreen> createState() => _TestimoniesScreenState();
}

class _TestimoniesScreenState extends State<TestimoniesScreen> {
  int _refresh = 0;

  @override
  Widget build(BuildContext context) {
    final repo = context.read<ChmsRepository>();
    final user = context.watch<AuthController>().user;
    return ModuleListScreen(
      refreshTrigger: _refresh,
      title: 'Testimonies',
      subtitle: 'Stories & approvals',
      searchHint: 'Search testimonies…',
      headerColor: AppColors.violet,
      emptyMessage: 'No testimonies found.',
      floatingAction: canAccess(user, Perm.testimonyCreate)
          ? FloatingActionButton.extended(
              onPressed: () async {
                final ok = await context.push<bool>('/testimonies/new');
                if (ok == true) setState(() => _refresh++);
              },
              backgroundColor: AppColors.violet,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_rounded, color: Colors.white),
              label: const Text('Share', style: TextStyle(color: Colors.white)),
            )
          : null,
      loadPage: (_, search) async {
        final items = await repo.fetchTestimoniesList(search: search);
        return (items: items, totalPages: 1);
      },
      onItemTap: (item) => context.push('/testimonies/${item['id']}'),
      itemBuilder: (_, item) => simpleListTile(
        title: item['title'] as String? ?? 'Testimony',
        subtitle: '${item['status'] ?? 'Pending'} · ${formatDate(item['createdAt'] as String?)}',
        icon: Icons.auto_stories_rounded,
        color: AppColors.violet,
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

class SermonsScreen extends StatefulWidget {
  const SermonsScreen({super.key});

  @override
  State<SermonsScreen> createState() => _SermonsScreenState();
}

class _SermonsScreenState extends State<SermonsScreen> {
  int _refresh = 0;

  @override
  Widget build(BuildContext context) {
    final repo = context.read<ChmsRepository>();
    final user = context.watch<AuthController>().user;
    return ModuleListScreen(
      refreshTrigger: _refresh,
      title: 'Sermons',
      subtitle: 'Messages & series',
      searchHint: 'Search sermons…',
      headerColor: AppColors.amber,
      emptyMessage: 'No sermons found.',
      floatingAction: canAccess(user, Perm.sermonCreate)
          ? FloatingActionButton.extended(
              onPressed: () async {
                final ok = await context.push<bool>('/sermons/new');
                if (ok == true) setState(() => _refresh++);
              },
              backgroundColor: AppColors.amber,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_rounded, color: Colors.white),
              label: const Text('New sermon', style: TextStyle(color: Colors.white)),
            )
          : null,
      loadPage: (_, search) async {
        final items = await repo.fetchSermonsList(search: search);
        return (items: items, totalPages: 1);
      },
      onItemTap: (item) => context.push('/sermons/${item['id']}'),
      itemBuilder: (_, item) => simpleListTile(
        title: item['title'] as String? ?? 'Sermon',
        subtitle: item['speaker'] as String? ?? formatDate(item['preachedAt'] as String?),
        icon: Icons.mic_rounded,
        color: AppColors.amber,
      ),
    );
  }
}

class OutreachesScreen extends StatefulWidget {
  const OutreachesScreen({super.key});

  @override
  State<OutreachesScreen> createState() => _OutreachesScreenState();
}

class _OutreachesScreenState extends State<OutreachesScreen> {
  int _refresh = 0;

  @override
  Widget build(BuildContext context) {
    final repo = context.read<ChmsRepository>();
    final user = context.watch<AuthController>().user;
    return ModuleListScreen(
      refreshTrigger: _refresh,
      title: 'Outreach',
      subtitle: 'Community missions',
      searchHint: 'Search outreaches…',
      headerColor: AppColors.navyLight,
      emptyMessage: 'No outreaches found.',
      floatingAction: canAccess(user, Perm.outreachCreate)
          ? FloatingActionButton.extended(
              onPressed: () async {
                final ok = await context.push<bool>('/outreaches/new');
                if (ok == true) setState(() => _refresh++);
              },
              backgroundColor: AppColors.navyLight,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_rounded, color: Colors.white),
              label: const Text('New outreach', style: TextStyle(color: Colors.white)),
            )
          : null,
      loadPage: (_, search) async {
        final items = await repo.fetchOutreachesList(search: search);
        return (items: items, totalPages: 1);
      },
      onItemTap: (item) => context.push('/outreaches/${item['id']}'),
      itemBuilder: (_, item) => simpleListTile(
        title: item['title'] as String? ?? 'Outreach',
        subtitle: item['location'] as String? ?? item['state'] as String? ?? '',
        icon: Icons.campaign_rounded,
        color: AppColors.navyLight,
      ),
    );
  }
}
