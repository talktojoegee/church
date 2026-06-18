import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/data/chms_repository.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/module_list_screen.dart';
import '../../widgets/ui_components.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  bool _markingAll = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await context.read<ChmsRepository>().fetchNotifications();
      if (!mounted) return;
      setState(() {
        _items = res.data;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAllRead() async {
    setState(() => _markingAll = true);
    try {
      await context.read<ChmsRepository>().markAllNotificationsRead();
      await _load();
    } finally {
      if (mounted) setState(() => _markingAll = false);
    }
  }

  Future<void> _openNotification(Map<String, dynamic> item) async {
    final id = item['id'] as String;
    if (item['readAt'] == null) {
      await context.read<ChmsRepository>().markNotificationRead(id);
    }
    final link = item['link'] as String?;
    if (link != null && link.isNotEmpty && mounted) {
      context.push(link);
    }
    _load();
  }

  IconData _iconForType(String? type) {
    switch (type) {
      case 'TESTIMONY':
        return Icons.auto_stories_rounded;
      case 'FOLLOW_UP':
        return Icons.phone_in_talk_rounded;
      case 'EVENT':
        return Icons.event_rounded;
      default:
        return Icons.notifications_rounded;
    }
  }

  Color _colorForType(String? type) {
    switch (type) {
      case 'TESTIMONY':
        return AppColors.violet;
      case 'FOLLOW_UP':
        return AppColors.rose;
      case 'EVENT':
        return AppColors.amber;
      default:
        return AppColors.indigo;
    }
  }

  @override
  Widget build(BuildContext context) {
    final unread = _items.where((n) => n['readAt'] == null).length;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
        actions: [
          if (unread > 0)
            TextButton(
              onPressed: _markingAll ? null : _markAllRead,
              child: _markingAll
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Mark all read', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                children: [
                  if (unread > 0)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        '$unread unread notification${unread == 1 ? '' : 's'}',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                      ),
                    ),
                  if (_items.isEmpty)
                    AppCard(
                      child: Text(
                        'No notifications yet.',
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    )
                  else
                    ..._items.map((item) {
                              final isUnread = item['readAt'] == null;
                              final type = item['type'] as String?;
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: InkWell(
                                  onTap: () => _openNotification(item),
                                  borderRadius: BorderRadius.circular(20),
                                  child: AppCard(
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          width: 44,
                                          height: 44,
                                          decoration: BoxDecoration(
                                            color: _colorForType(type).withValues(alpha: 0.12),
                                            borderRadius: BorderRadius.circular(14),
                                          ),
                                          child: Icon(_iconForType(type), color: _colorForType(type)),
                                        ),
                                        const SizedBox(width: 14),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                item['title'] as String? ?? 'Notification',
                                                style: TextStyle(
                                                  fontWeight: isUnread ? FontWeight.w700 : FontWeight.w600,
                                                ),
                                              ),
                                              if (item['body'] != null) ...[
                                                const SizedBox(height: 4),
                                                Text(
                                                  item['body'] as String,
                                                  style: TextStyle(
                                                    color: Colors.grey.shade600,
                                                    fontSize: 13,
                                                  ),
                                                ),
                                              ],
                                              const SizedBox(height: 6),
                                              Text(
                                                formatDate(item['createdAt'] as String?),
                                                style: TextStyle(
                                                  color: Colors.grey.shade500,
                                                  fontSize: 11,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        if (isUnread)
                                          Container(
                                            width: 8,
                                            height: 8,
                                            margin: const EdgeInsets.only(top: 6),
                                            decoration: const BoxDecoration(
                                              color: AppColors.indigo,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            }),
                ],
              ),
      ),
    );
  }
}
