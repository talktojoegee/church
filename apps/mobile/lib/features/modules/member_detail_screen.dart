import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/auth/permissions.dart';
import '../../core/data/chms_repository.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/module_list_screen.dart';
import '../../widgets/ui_components.dart';
import '../auth/auth_controller.dart';

class MemberDetailScreen extends StatefulWidget {
  const MemberDetailScreen({super.key, required this.memberId});

  final String memberId;

  @override
  State<MemberDetailScreen> createState() => _MemberDetailScreenState();
}

class _MemberDetailScreenState extends State<MemberDetailScreen> {
  Map<String, dynamic>? _member;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await context.read<ChmsRepository>().fetchMember(widget.memberId);
      if (!mounted) return;
      setState(() {
        _member = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  String _name(Map<String, dynamic> m) {
    final first = m['firstName'] as String? ?? '';
    final last = m['lastName'] as String? ?? '';
    return '$first $last'.trim();
  }

  @override
  Widget build(BuildContext context) {
    final canEdit = canAccess(context.watch<AuthController>().user, Perm.memberUpdate);
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        GradientButton(label: 'Retry', onPressed: _load),
                      ],
                    ),
                  ),
                )
              : CustomScrollView(
                  slivers: [
                    SliverAppBar(
                      expandedHeight: 180,
                      pinned: true,
                      actions: [
                        if (canEdit)
                          IconButton(
                            icon: const Icon(Icons.edit_rounded, color: Colors.white),
                            onPressed: _member == null
                                ? null
                                : () async {
                                    final ok = await context.push<bool>(
                                      '/members/${widget.memberId}/edit',
                                      extra: _member,
                                    );
                                    if (ok == true) _load();
                                  },
                          ),
                      ],
                      flexibleSpace: FlexibleSpaceBar(
                        title: Text(_name(_member!), style: const TextStyle(fontWeight: FontWeight.w700)),
                        background: Container(
                          decoration: const BoxDecoration(gradient: AppColors.heroGradient),
                          child: SafeArea(
                            child: Center(
                              child: CircleAvatar(
                                radius: 40,
                                backgroundColor: Colors.white.withValues(alpha: 0.2),
                                child: Text(
                                  _initials(_name(_member!)),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 28,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    SliverPadding(
                      padding: const EdgeInsets.all(20),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          Row(
                            children: [
                              Expanded(
                                child: _ActionChip(
                                  icon: Icons.payments_rounded,
                                  label: 'Record giving',
                                  color: AppColors.emerald,
                                  onTap: () => context.push(
                                    '/finance/contribution/new',
                                    extra: {'memberId': widget.memberId, 'memberName': _name(_member!)},
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _ActionChip(
                                  icon: Icons.phone_in_talk_rounded,
                                  label: 'Follow up',
                                  color: AppColors.rose,
                                  onTap: () => context.push(
                                    '/follow-ups/new',
                                    extra: {'memberId': widget.memberId, 'memberName': _name(_member!)},
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          _Section(
                            title: 'Contact',
                            children: [
                              _InfoRow(label: 'Email', value: _member!['email'] as String?),
                              _InfoRow(label: 'Phone', value: _member!['phone'] as String?),
                              _InfoRow(label: 'Alt phone', value: _member!['altPhone'] as String?),
                              _InfoRow(label: 'Address', value: _member!['address'] as String?),
                            ],
                          ),
                          const SizedBox(height: 16),
                          _Section(
                            title: 'Membership',
                            children: [
                              _InfoRow(label: 'Number', value: _member!['membershipNumber'] as String?),
                              _InfoRow(label: 'Status', value: _member!['status'] as String?),
                              _InfoRow(
                                label: 'Branch',
                                value: (_member!['branch'] as Map?)?['name'] as String?,
                              ),
                              _InfoRow(
                                label: 'Joined',
                                value: formatDate(_member!['joinedAt'] as String?),
                              ),
                              _InfoRow(label: 'Occupation', value: _member!['occupation'] as String?),
                            ],
                          ),
                          if (_departments(_member!).isNotEmpty) ...[
                            const SizedBox(height: 16),
                            _Section(
                              title: 'Departments',
                              children: _departments(_member!)
                                  .map((d) => _InfoRow(label: '•', value: d))
                                  .toList(),
                            ),
                          ],
                          if (_lifeEvents(_member!).isNotEmpty) ...[
                            const SizedBox(height: 16),
                            _Section(
                              title: 'Life events',
                              children: _lifeEvents(_member!).map((e) {
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: AppCard(
                                    padding: const EdgeInsets.all(12),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          e['title'] as String? ?? '',
                                          style: const TextStyle(fontWeight: FontWeight.w600),
                                        ),
                                        Text(
                                          '${e['type'] ?? ''} · ${formatDate(e['eventDate'] as String?)}',
                                          style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ],
                          if (_member!['notes'] != null && (_member!['notes'] as String).isNotEmpty) ...[
                            const SizedBox(height: 16),
                            _Section(
                              title: 'Notes',
                              children: [
                                AppCard(
                                  child: Text(_member!['notes'] as String),
                                ),
                              ],
                            ),
                          ],
                        ]),
                      ),
                    ),
                  ],
                ),
    );
  }

  List<String> _departments(Map<String, dynamic> m) {
    final deps = m['departments'] as List<dynamic>? ?? [];
    return deps
        .map((d) => (d as Map)['department']?['name'] as String? ?? '')
        .where((n) => n.isNotEmpty)
        .toList();
  }

  List<Map<String, dynamic>> _lifeEvents(Map<String, dynamic> m) {
    return (m['lifeEvents'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  String _initials(String name) {
    final parts = name.split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }
}

class _ActionChip extends StatelessWidget {
  const _ActionChip({
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
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 10),
        AppCard(
          child: Column(children: children),
        ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, this.value});

  final String label;
  final String? value;

  @override
  Widget build(BuildContext context) {
    if (value == null || value!.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
          ),
          Expanded(
            child: Text(value!, style: const TextStyle(fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}
