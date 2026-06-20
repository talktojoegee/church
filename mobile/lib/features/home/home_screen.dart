import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/branding/branding_controller.dart';
import '../../core/data/chms_repository.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/charts/dashboard_charts.dart';
import '../../widgets/church_info_card.dart';
import '../../widgets/church_logo.dart';
import '../../widgets/decorative_background.dart';
import '../../widgets/hero_header.dart';
import '../../widgets/module_list_screen.dart';
import '../../widgets/ui_components.dart';
import '../../widgets/user_avatar.dart';
import '../auth/auth_controller.dart';
import '../auth/auth_repository.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? _overview;
  bool _loading = true;
  bool _fromCache = false;
  DateTime? _cachedAt;
  String? _error;
  int _unreadNotifications = 0;

  @override
  void initState() {
    super.initState();
    _loadOverview();
    _loadUnreadCount();
    _refreshUserAvatar();
  }

  Future<void> _refreshUserAvatar() async {
    try {
      final profile = await context.read<AuthRepository>().fetchProfile();
      if (!mounted) return;
      final user = context.read<AuthController>().user;
      if (user == null) return;
      if (profile.avatarUrl != user.avatarUrl) {
        context.read<AuthController>().updateUser(user.copyWith(avatarUrl: profile.avatarUrl));
      }
    } catch (_) {}
  }

  Future<void> _loadUnreadCount() async {
    try {
      final count = await context.read<ChmsRepository>().fetchUnreadNotificationCount();
      if (mounted) setState(() => _unreadNotifications = count);
    } catch (_) {}
  }

  Future<void> _loadOverview() async {
    setState(() {
      _loading = true;
      _error = null;
      _fromCache = false;
    });
    try {
      final snapshot = await context.read<AuthRepository>().fetchOverview();
      if (!mounted) return;
      setState(() {
        _overview = snapshot.data;
        _fromCache = snapshot.fromCache;
        _cachedAt = snapshot.cachedAt;
        _loading = false;
      });
      _loadUnreadCount();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  String _formatMoney(dynamic value) {
    if (value == null) return '—';
    final n = value is num ? value.toDouble() : double.tryParse('$value') ?? 0;
    if (n >= 1000000) return '₦${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '₦${(n / 1000).toStringAsFixed(0)}K';
    return '₦${n.toStringAsFixed(0)}';
  }

  List<Widget> _buildRecentActivity(BuildContext context) {
    final members = _overview?['recentMembers'] as List<dynamic>? ?? [];
    final events = _overview?['upcomingEvents'] as List<dynamic>? ?? [];
    final giving = _overview?['recentContributions'] as List<dynamic>? ?? [];

    final items = <Widget>[];

    for (final raw in members.take(2)) {
      final m = raw as Map<String, dynamic>;
      items.add(_RecentActivityTile(
        icon: Icons.person_add_rounded,
        color: AppColors.navy,
        title: m['name'] as String? ?? 'New member',
        subtitle: 'Joined · ${formatDate(m['joinedAt'] as String?)}',
        onTap: () => context.push('/members/${m['id']}'),
      ));
    }
    for (final raw in events.take(2)) {
      final e = raw as Map<String, dynamic>;
      items.add(_RecentActivityTile(
        icon: Icons.event_rounded,
        color: AppColors.flameOrange,
        title: e['title'] as String? ?? 'Event',
        subtitle: formatDate(e['startAt'] as String?),
        onTap: () => context.push('/events/${e['id']}'),
      ));
    }
    for (final raw in giving.take(2)) {
      final c = raw as Map<String, dynamic>;
      items.add(_RecentActivityTile(
        icon: Icons.payments_rounded,
        color: AppColors.flame,
        title: c['member'] as String? ?? 'Contribution',
        subtitle: '${c['type'] ?? ''} · ₦${c['amount'] ?? 0}',
        onTap: () => context.push('/finance'),
      ));
    }

    if (items.isEmpty) {
      return [
        AppCard(
          child: Text(
            'No recent activity yet.',
            style: TextStyle(color: Colors.grey.shade600),
          ),
        ),
      ];
    }
    return items;
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final branding = context.watch<BrandingController>().branding;
    final user = auth.user;
    final members = _overview?['members'] as Map<String, dynamic>?;
    final attendance = _overview?['attendance'] as Map<String, dynamic>?;
    final finance = _overview?['finance'] as Map<String, dynamic>?;
    final operations = _overview?['operations'] as Map<String, dynamic>?;
    final monthlyFinance = normalizeFinanceMonths(_overview?['monthlyFinance'] as List<dynamic>?);
    final attendanceTrend = (attendance?['trend'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final memberByStatus = (members?['byStatus'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final memberTotal = (members?['total'] as num?)?.toInt() ?? 0;

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: RefreshIndicator(
        color: AppColors.flame,
        onRefresh: _loadOverview,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: HeroOverlapHeader(
                headerHeight: 210,
                floatingHeight: 84,
                headerContent: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ChurchLogo(
                          branding: branding,
                          variant: ChurchLogoVariant.header,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                branding.displayName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              if (branding.tagline.isNotEmpty)
                                Text(
                                  branding.tagline,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.75),
                                    fontSize: 11,
                                  ),
                                ),
                              const SizedBox(height: 8),
                              Text(
                                '${greetingForTime()}, ${user?.firstName ?? 'there'}',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.9),
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Badge(
                            isLabelVisible: _unreadNotifications > 0,
                            label: Text(
                              _unreadNotifications > 99 ? '99+' : '$_unreadNotifications',
                              style: const TextStyle(fontSize: 10),
                            ),
                            child: IconButton(
                              icon: const Icon(Icons.notifications_none_rounded, color: Colors.white),
                              onPressed: () async {
                                await context.push('/notifications');
                                _loadUnreadCount();
                              },
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        UserAvatar(
                          avatarUrl: user?.avatarUrl,
                          initials: user?.initials ?? '?',
                          size: 40,
                          borderColor: Colors.white.withValues(alpha: 0.85),
                          borderWidth: 2,
                          onTap: () => context.go('/profile'),
                        ),
                      ],
                    ),
                  ),
                ),
                floatingChild: AppCard(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(Icons.insights_rounded, color: Colors.white, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Church overview',
                              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                            ),
                            Text(
                              user?.fullName ?? 'Dashboard snapshot',
                              style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                            ),
                            if (user?.roles.isNotEmpty == true)
                              Text(
                                'Role · ${user!.roles.first}',
                                style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
                              ),
                          ],
                        ),
                      ),
                      if (_loading)
                        const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            if (_error != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                  child: AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Could not load data', style: TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        Text(_error!, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                        const SizedBox(height: 12),
                        GradientButton(label: 'Retry', onPressed: _loadOverview),
                      ],
                    ),
                  ),
                ),
              )
            else if (_fromCache)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                  child: AppCard(
                    child: Row(
                      children: [
                        Icon(Icons.cloud_off_rounded, color: Colors.orange.shade700, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _cachedAt != null
                                ? 'Showing saved data from ${formatDate(_cachedAt!.toIso8601String())}'
                                : 'Showing saved data — pull to refresh when online',
                            style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            if (_error == null && !_loading) ...[
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 14,
                    childAspectRatio: 1.05,
                  ),
                  delegate: SliverChildListDelegate([
                    GradientStatCard(
                      label: 'Members',
                      value: '${members?['total'] ?? 0}',
                      icon: Icons.people_alt_rounded,
                      gradient: AppColors.statGradients[0],
                      onTap: () => context.push('/members'),
                    ),
                    GradientStatCard(
                      label: 'Avg. attendance',
                      value: '${attendance?['monthAverage'] ?? 0}',
                      icon: Icons.event_available_rounded,
                      gradient: AppColors.statGradients[1],
                      onTap: () => context.push('/attendance'),
                    ),
                    GradientStatCard(
                      label: 'Monthly income',
                      value: _formatMoney(finance?['monthIncome']),
                      icon: Icons.payments_rounded,
                      gradient: AppColors.statGradients[2],
                      onTap: () => context.push('/finance'),
                    ),
                    GradientStatCard(
                      label: 'Net balance',
                      value: _formatMoney(finance?['netBalance']),
                      icon: Icons.account_balance_wallet_rounded,
                      gradient: AppColors.statGradients[3],
                      onTap: () => context.push('/finance'),
                    ),
                  ]),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  child: ChurchInfoCard(branding: branding, compact: true),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                  child: Text('Insights', style: Theme.of(context).textTheme.titleMedium),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  child: AnimatedChartEntrance(
                    index: 0,
                    child: FinanceTrendChart(months: monthlyFinance),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  child: AnimatedChartEntrance(
                    index: 1,
                    child: AttendanceTrendChart(trend: attendanceTrend),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  child: AnimatedChartEntrance(
                    index: 2,
                    child: MemberStatusChart(
                      byStatus: memberByStatus,
                      total: memberTotal,
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                  child: Text(
                    'Quick actions',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 110,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    children: [
                      _QuickChip(
                        icon: Icons.person_rounded,
                        label: 'Profile',
                        color: AppColors.accentAt(0),
                        onTap: () => context.go('/profile'),
                      ),
                      _QuickChip(
                        icon: Icons.groups_rounded,
                        label: 'Members',
                        color: AppColors.accentAt(1),
                        onTap: () => context.push('/members'),
                      ),
                      _QuickChip(
                        icon: Icons.calendar_month_rounded,
                        label: 'Events',
                        color: AppColors.accentAt(2),
                        onTap: () => context.push('/events'),
                      ),
                      _QuickChip(
                        icon: Icons.volunteer_activism_rounded,
                        label: 'Giving',
                        color: AppColors.accentAt(3),
                        onTap: () => context.push('/finance'),
                      ),
                      _QuickChip(
                        icon: Icons.campaign_rounded,
                        label: 'Outreach',
                        color: AppColors.accentAt(4),
                        onTap: () => context.push('/outreaches'),
                      ),
                      _QuickChip(
                        icon: Icons.event_available_rounded,
                        label: 'Attendance',
                        color: AppColors.accentAt(5),
                        onTap: () => context.push('/attendance'),
                      ),
                      _QuickChip(
                        icon: Icons.phone_in_talk_rounded,
                        label: 'Follow-up',
                        color: AppColors.accentAt(1),
                        onTap: () => context.push('/follow-ups'),
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Recent activity', style: Theme.of(context).textTheme.titleMedium),
                          TextButton(
                            onPressed: () => context.go('/activity'),
                            child: const Text('See all'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ..._buildRecentActivity(context),
                      const SizedBox(height: 24),
                      Text('Operations', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 12),
                      MenuTile(
                        icon: Icons.phone_in_talk_rounded,
                        label: 'Open follow-ups',
                        subtitle: '${operations?['openFollowUps'] ?? 0} pending',
                        color: AppColors.accentAt(1),
                        onTap: () => context.push('/follow-ups'),
                      ),
                      const SizedBox(height: 10),
                      MenuTile(
                        icon: Icons.celebration_rounded,
                        label: 'Upcoming events',
                        subtitle: '${operations?['upcomingEvents'] ?? 0} scheduled',
                        color: AppColors.accentAt(2),
                        onTap: () => context.push('/events'),
                      ),
                      const SizedBox(height: 10),
                      MenuTile(
                        icon: Icons.auto_stories_rounded,
                        label: 'Pending testimonies',
                        subtitle: '${operations?['pendingTestimonies'] ?? 0} to review',
                        color: AppColors.accentAt(0),
                        onTap: () => context.push('/testimonies'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _QuickChip extends StatefulWidget {
  const _QuickChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  State<_QuickChip> createState() => _QuickChipState();
}

class _QuickChipState extends State<_QuickChip> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.94 : 1,
        duration: const Duration(milliseconds: 120),
        child: Container(
          width: 88,
          margin: const EdgeInsets.only(right: 12),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: widget.color.withValues(alpha: 0.18),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: widget.color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(widget.icon, color: widget.color, size: 22),
              ),
              const SizedBox(height: 8),
              Text(
                widget.label,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecentActivityTile extends StatelessWidget {
  const _RecentActivityTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: AppCard(
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: color),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                    Text(
                      subtitle,
                      style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400),
            ],
          ),
        ),
      ),
    );
  }
}
