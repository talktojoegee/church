import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/permissions.dart';
import '../../core/data/chms_repository.dart';
import '../../core/theme/app_colors.dart';
import '../../core/util/asset_url.dart';
import '../../widgets/member_picker.dart';
import '../../widgets/module_list_screen.dart';
import '../../widgets/ui_components.dart';
import '../auth/auth_controller.dart';

class EventDetailScreen extends StatefulWidget {
  const EventDetailScreen({super.key, required this.eventId});

  final String eventId;

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  Map<String, dynamic>? _event;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await context.read<ChmsRepository>().fetchEvent(widget.eventId);
      if (mounted) setState(() { _event = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _register() async {
    final title = _event?['title'] as String? ?? 'Event';
    final ok = await context.push<bool>(
      '/events/${widget.eventId}/register',
      extra: title,
    );
    if (ok == true) _load();
  }

  Future<void> _edit() async {
    final ok = await context.push<bool>('/events/${widget.eventId}/edit');
    if (ok == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final e = _event ?? {};
    final registrations = e['registrations'] as List<dynamic>? ?? [];
    final user = context.watch<AuthController>().user;
    final canEdit = canAccess(user, Perm.eventUpdate);

    return Scaffold(
      backgroundColor: AppColors.surface,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _register,
        backgroundColor: AppColors.violet,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add_rounded, color: Colors.white),
        label: const Text('Register', style: TextStyle(color: Colors.white)),
      ),
      appBar: AppBar(
        title: Text(e['title'] as String? ?? 'Event'),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
        actions: [
          if (canEdit)
            IconButton(
              icon: const Icon(Icons.edit_rounded),
              onPressed: _edit,
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _InfoTile(icon: Icons.calendar_month_rounded, label: 'Starts', value: formatDateTimeStr(e['startAt'] as String?)),
          _InfoTile(icon: Icons.location_on_rounded, label: 'Location', value: e['location'] as String?),
          _InfoTile(icon: Icons.info_outline_rounded, label: 'Status', value: e['status'] as String?),
          if (e['description'] != null) ...[
            const SizedBox(height: 16),
            Text('Description', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            AppCard(child: Text(e['description'] as String)),
          ],
          const SizedBox(height: 20),
          Text('Registrations (${registrations.length})', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 10),
          if (registrations.isEmpty)
            AppCard(child: Text('No registrations yet.', style: TextStyle(color: Colors.grey.shade600)))
          else
            ...registrations.map((r) {
              final reg = Map<String, dynamic>.from(r as Map);
              final member = reg['member'] as Map<String, dynamic>?;
              final name = member != null
                  ? memberDisplayName(member)
                  : reg['guestName'] as String? ?? 'Guest';
              final attended = reg['attended'] as bool? ?? false;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: AppCard(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                            Text(
                              attended ? 'Attended' : 'Registered',
                              style: TextStyle(
                                color: attended ? AppColors.emerald : Colors.grey.shade600,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        tooltip: attended ? 'Mark absent' : 'Mark attended',
                        icon: Icon(
                          attended ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                          color: attended ? AppColors.emerald : Colors.grey.shade400,
                        ),
                        onPressed: () async {
                          await context.read<ChmsRepository>().toggleRegistrationAttended(reg['id'] as String);
                          _load();
                        },
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}

class GroupDetailScreen extends StatefulWidget {
  const GroupDetailScreen({super.key, required this.groupId});

  final String groupId;

  @override
  State<GroupDetailScreen> createState() => _GroupDetailScreenState();
}

class _GroupDetailScreenState extends State<GroupDetailScreen> {
  Map<String, dynamic>? _group;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await context.read<ChmsRepository>().fetchGroup(widget.groupId);
      if (mounted) setState(() { _group = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _addMember() async {
    final member = await showMemberPicker(context);
    if (member == null) return;
    try {
      await context.read<ChmsRepository>().addGroupMember(
        widget.groupId,
        member['id'] as String,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Member added to group'), behavior: SnackBarBehavior.floating),
        );
        _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _logMeeting() async {
    final name = _group?['name'] as String? ?? 'Group';
    final ok = await context.push<bool>(
      '/groups/${widget.groupId}/meetings/new',
      extra: name,
    );
    if (ok == true) _load();
  }

  Future<void> _removeMember(String memberId, String name) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove member?'),
        content: Text('Remove $name from this group?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Remove')),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await context.read<ChmsRepository>().removeGroupMember(widget.groupId, memberId);
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final g = _group ?? {};
    final members = g['members'] as List<dynamic>? ?? [];
    final activities = g['activities'] as List<dynamic>? ?? [];
    final canManage = canAccess(context.watch<AuthController>().user, Perm.groupUpdate);
    final meetings = activities.where((a) {
      final act = a as Map;
      return act['type'] == 'MEETING_HELD' || act['meeting'] != null;
    }).take(5).toList();

    return Scaffold(
      backgroundColor: AppColors.surface,
      floatingActionButton: canManage
          ? Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                FloatingActionButton.extended(
                  heroTag: 'log_meeting',
                  onPressed: _logMeeting,
                  backgroundColor: AppColors.violet,
                  foregroundColor: Colors.white,
                  icon: const Icon(Icons.event_note_rounded, color: Colors.white),
                  label: const Text('Log meeting', style: TextStyle(color: Colors.white)),
                ),
                const SizedBox(height: 10),
                FloatingActionButton.extended(
                  heroTag: 'add_member',
                  onPressed: _addMember,
                  backgroundColor: AppColors.emerald,
                  foregroundColor: Colors.white,
                  icon: const Icon(Icons.person_add_rounded, color: Colors.white),
                  label: const Text('Add member', style: TextStyle(color: Colors.white)),
                ),
              ],
            )
          : null,
      appBar: AppBar(
        title: Text(g['name'] as String? ?? 'Group'),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
        children: [
          _InfoTile(icon: Icons.category_rounded, label: 'Category', value: g['category'] as String?),
          _InfoTile(icon: Icons.schedule_rounded, label: 'Meeting', value: _meeting(g)),
          _InfoTile(icon: Icons.location_on_rounded, label: 'Location', value: g['location'] as String?),
          if (g['description'] != null) ...[
            const SizedBox(height: 12),
            AppCard(child: Text(g['description'] as String)),
          ],
          if (meetings.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text('Recent meetings', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 10),
            ...meetings.map((a) {
              final act = Map<String, dynamic>.from(a as Map);
              final meeting = act['meeting'] as Map<String, dynamic>?;
              final heldAt = meeting?['heldAt'] as String? ?? act['createdAt'] as String?;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: AppCard(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(act['title'] as String? ?? 'Meeting', style: const TextStyle(fontWeight: FontWeight.w600)),
                      Text(
                        '${meeting?['topic'] ?? act['description'] ?? ''} · ${formatDate(heldAt)}',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
          const SizedBox(height: 20),
          Text('Members (${members.length})', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 10),
          if (members.isEmpty)
            AppCard(child: Text('No members yet.', style: TextStyle(color: Colors.grey.shade600)))
          else
            ...members.map((m) {
              final row = Map<String, dynamic>.from(m as Map);
              final member = row['member'] as Map<String, dynamic>? ?? row;
              final id = member['id'] as String;
              final name = memberDisplayName(member);
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: AppCard(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(member['phone'] as String? ?? member['email'] as String? ?? ''),
                    trailing: IconButton(
                      icon: const Icon(Icons.remove_circle_outline_rounded, color: AppColors.rose),
                      onPressed: () => _removeMember(id, name),
                    ),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  String? _meeting(Map<String, dynamic> g) {
    final day = g['meetingDay'] as String?;
    final time = g['meetingTime'] as String?;
    if (day == null && time == null) return null;
    return [day, time].where((s) => s != null && s.isNotEmpty).join(' · ');
  }
}

class AttendanceDetailScreen extends StatefulWidget {
  const AttendanceDetailScreen({super.key, required this.sessionId});

  final String sessionId;

  @override
  State<AttendanceDetailScreen> createState() => _AttendanceDetailScreenState();
}

class _AttendanceDetailScreenState extends State<AttendanceDetailScreen> {
  Map<String, dynamic>? _session;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await context.read<ChmsRepository>().fetchAttendanceSession(widget.sessionId);
      if (mounted) setState(() { _session = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final s = _session ?? {};
    final records = s['records'] as List<dynamic>? ?? [];
    final canEdit = canAccess(context.watch<AuthController>().user, Perm.attendanceUpdate);
    return _DetailScaffold(
      title: s['title'] as String? ?? 'Attendance',
      floatingActionButton: canEdit
          ? FloatingActionButton.extended(
              onPressed: () async {
                final ok = await context.push<bool>('/attendance/${widget.sessionId}/roll-call');
                if (ok == true) _load();
              },
              backgroundColor: AppColors.sky,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.edit_note_rounded, color: Colors.white),
              label: const Text('Roll call', style: TextStyle(color: Colors.white)),
            )
          : null,
      children: [
        _InfoTile(icon: Icons.event_rounded, label: 'Date', value: formatDate(s['date'] as String?)),
        _InfoTile(icon: Icons.category_rounded, label: 'Type', value: s['type'] as String?),
        _InfoTile(icon: Icons.people_rounded, label: 'Total', value: '${s['totalCount'] ?? 0}'),
        _InfoTile(icon: Icons.man_rounded, label: 'Male', value: '${s['maleCount'] ?? 0}'),
        _InfoTile(icon: Icons.woman_rounded, label: 'Female', value: '${s['femaleCount'] ?? 0}'),
        _InfoTile(icon: Icons.child_care_rounded, label: 'Children', value: '${s['childrenCount'] ?? 0}'),
        if (s['notes'] != null) ...[
          const SizedBox(height: 16),
          AppCard(child: Text(s['notes'] as String)),
        ],
        if (records.isNotEmpty) ...[
          const SizedBox(height: 24),
          Text('Present members (${records.length})', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          ...records.map((r) {
            final member = (r as Map)['member'] as Map<String, dynamic>?;
            if (member == null) return const SizedBox.shrink();
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: AppCard(
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(
                    child: Text(
                      memberDisplayName(member).isNotEmpty
                          ? memberDisplayName(member)[0].toUpperCase()
                          : '?',
                    ),
                  ),
                  title: Text(memberDisplayName(member)),
                  subtitle: Text(member['membershipNumber'] as String? ?? member['phone'] as String? ?? ''),
                ),
              ),
            );
          }),
        ],
      ],
    );
  }
}

class FollowUpDetailScreen extends StatefulWidget {
  const FollowUpDetailScreen({super.key, required this.followUpId});

  final String followUpId;

  @override
  State<FollowUpDetailScreen> createState() => _FollowUpDetailScreenState();
}

class _FollowUpDetailScreenState extends State<FollowUpDetailScreen> {
  Map<String, dynamic>? _item;
  bool _loading = true;
  bool _updating = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await context.read<ChmsRepository>().fetchFollowUp(widget.followUpId);
      if (mounted) setState(() { _item = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markCompleted() async {
    setState(() => _updating = true);
    try {
      await context.read<ChmsRepository>().updateFollowUp(widget.followUpId, {'status': 'COMPLETED'});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Follow-up completed'), behavior: SnackBarBehavior.floating),
        );
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final f = _item ?? {};
    final member = f['member'] as Map<String, dynamic>?;
    final memberName = member != null
        ? memberDisplayName(member)
        : f['contactName'] as String?;
    return _DetailScaffold(
      title: 'Follow-up',
      children: [
        _InfoTile(icon: Icons.label_rounded, label: 'Type', value: (f['type'] as String?)?.replaceAll('_', ' ')),
        _InfoTile(icon: Icons.flag_rounded, label: 'Status', value: f['status'] as String?),
        _InfoTile(icon: Icons.person_rounded, label: 'Contact', value: memberName),
        _InfoTile(icon: Icons.phone_rounded, label: 'Phone', value: f['contactPhone'] as String? ?? member?['phone'] as String?),
        _InfoTile(icon: Icons.event_rounded, label: 'Due', value: formatDate(f['dueDate'] as String?)),
        if (f['notes'] != null) ...[
          const SizedBox(height: 16),
          AppCard(child: Text(f['notes'] as String)),
        ],
        if (f['status'] != 'COMPLETED' && f['status'] != 'CLOSED') ...[
          const SizedBox(height: 20),
          GradientButton(label: 'Mark completed', loading: _updating, onPressed: _markCompleted),
        ],
      ],
    );
  }
}

class TestimonyDetailScreen extends StatefulWidget {
  const TestimonyDetailScreen({super.key, required this.testimonyId});

  final String testimonyId;

  @override
  State<TestimonyDetailScreen> createState() => _TestimonyDetailScreenState();
}

class _TestimonyDetailScreenState extends State<TestimonyDetailScreen> {
  Map<String, dynamic>? _item;
  bool _loading = true;
  bool _reviewing = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await context.read<ChmsRepository>().fetchTestimony(widget.testimonyId);
      if (mounted) setState(() { _item = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _review(String status) async {
    setState(() => _reviewing = true);
    try {
      await context.read<ChmsRepository>().reviewTestimony(widget.testimonyId, status: status);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Testimony $status'), behavior: SnackBarBehavior.floating),
        );
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _reviewing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final t = _item ?? {};
    final status = t['status'] as String? ?? 'PENDING';
    final canReview = canAccess(context.watch<AuthController>().user, Perm.testimonyManage);
    return _DetailScaffold(
      title: t['title'] as String? ?? 'Testimony',
      children: [
        _InfoTile(icon: Icons.flag_rounded, label: 'Status', value: status),
        _InfoTile(icon: Icons.person_rounded, label: 'Author', value: t['authorName'] as String?),
        _InfoTile(icon: Icons.event_rounded, label: 'Submitted', value: formatDate(t['createdAt'] as String?)),
        if (t['body'] != null || t['content'] != null) ...[
          const SizedBox(height: 16),
          Text('Story', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          AppCard(child: Text((t['body'] ?? t['content']) as String)),
        ],
        if (status == 'PENDING' && canReview) ...[
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: GradientButton(
                  label: 'Approve',
                  loading: _reviewing,
                  gradient: AppColors.statGradients[1],
                  onPressed: () => _review('APPROVED'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: GradientButton(
                  label: 'Reject',
                  loading: _reviewing,
                  gradient: const LinearGradient(colors: [AppColors.rose, Color(0xFFE53935)]),
                  onPressed: () => _review('REJECTED'),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class SermonDetailScreen extends StatefulWidget {
  const SermonDetailScreen({super.key, required this.sermonId});

  final String sermonId;

  @override
  State<SermonDetailScreen> createState() => _SermonDetailScreenState();
}

class _SermonDetailScreenState extends State<SermonDetailScreen> {
  Map<String, dynamic>? _sermon;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await context.read<ChmsRepository>().fetchSermon(widget.sermonId);
      if (mounted) setState(() { _sermon = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openUrl(String? url) async {
    if (url == null || url.isEmpty) return;
    final uri = Uri.tryParse(url);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _edit() async {
    final ok = await context.push<bool>('/sermons/${widget.sermonId}/edit');
    if (ok == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final s = _sermon ?? {};
    final canEdit = canAccess(context.watch<AuthController>().user, Perm.sermonUpdate);
    final series = s['sermonSeries'] as Map<String, dynamic>?;
    return _DetailScaffold(
      title: s['title'] as String? ?? 'Sermon',
      actions: canEdit
          ? [
              IconButton(
                icon: const Icon(Icons.edit_rounded),
                onPressed: _edit,
              ),
            ]
          : null,
      children: [
        _InfoTile(icon: Icons.person_rounded, label: 'Speaker', value: s['speaker'] as String?),
        if (series != null)
          _InfoTile(icon: Icons.collections_bookmark_rounded, label: 'Series', value: series['name'] as String?),
        _InfoTile(icon: Icons.menu_book_rounded, label: 'Scripture', value: s['scripture'] as String?),
        _InfoTile(icon: Icons.event_rounded, label: 'Preached', value: formatDate(s['preachedAt'] as String?)),
        if (s['summary'] != null) ...[
          const SizedBox(height: 16),
          AppCard(child: Text(s['summary'] as String)),
        ],
        if (s['audioUrl'] != null) ...[
          const SizedBox(height: 12),
          GradientButton(
            label: 'Listen (audio)',
            icon: Icons.headphones_rounded,
            onPressed: () => _openUrl(s['audioUrl'] as String?),
          ),
        ],
        if (s['videoUrl'] != null) ...[
          const SizedBox(height: 10),
          GradientButton(
            label: 'Watch (video)',
            icon: Icons.play_circle_rounded,
            onPressed: () => _openUrl(s['videoUrl'] as String?),
          ),
        ],
      ],
    );
  }
}

class OutreachDetailScreen extends StatefulWidget {
  const OutreachDetailScreen({super.key, required this.outreachId});

  final String outreachId;

  @override
  State<OutreachDetailScreen> createState() => _OutreachDetailScreenState();
}

class _OutreachDetailScreenState extends State<OutreachDetailScreen> {
  Map<String, dynamic>? _outreach;
  bool _loading = true;
  bool _uploading = false;
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await context.read<ChmsRepository>().fetchOutreach(widget.outreachId);
      if (mounted) setState(() { _outreach = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _edit() async {
    final ok = await context.push<bool>('/outreaches/${widget.outreachId}/edit');
    if (ok == true) _load();
  }

  Future<void> _showAddPhotoOptions() async {
    await showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_rounded),
              title: const Text('Choose from gallery'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndUpload();
              },
            ),
            ListTile(
              leading: const Icon(Icons.link_rounded),
              title: const Text('Add image URL'),
              onTap: () {
                Navigator.pop(ctx);
                _addByUrl();
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickAndUpload() async {
    final file = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (file == null) return;
    setState(() => _uploading = true);
    try {
      final repo = context.read<ChmsRepository>();
      final uploaded = await repo.uploadFile(file.path, filename: file.name);
      await repo.addOutreachImage(widget.outreachId, {'url': uploaded['url'] as String});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Photo added'), behavior: SnackBarBehavior.floating),
      );
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _addByUrl() async {
    final urlCtrl = TextEditingController();
    final captionCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add photo URL'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: urlCtrl,
              decoration: const InputDecoration(labelText: 'Image URL *'),
              keyboardType: TextInputType.url,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: captionCtrl,
              decoration: const InputDecoration(labelText: 'Caption'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Add')),
        ],
      ),
    );
    if (ok != true || urlCtrl.text.trim().isEmpty) {
      urlCtrl.dispose();
      captionCtrl.dispose();
      return;
    }
    setState(() => _uploading = true);
    try {
      await context.read<ChmsRepository>().addOutreachImage(widget.outreachId, {
        'url': urlCtrl.text.trim(),
        if (captionCtrl.text.trim().isNotEmpty) 'caption': captionCtrl.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Photo added'), behavior: SnackBarBehavior.floating),
      );
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      urlCtrl.dispose();
      captionCtrl.dispose();
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _removeImage(String imageId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove photo?'),
        content: const Text('This photo will be removed from the outreach gallery.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Remove')),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await context.read<ChmsRepository>().removeOutreachImage(widget.outreachId, imageId);
      if (mounted) _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final o = _outreach ?? {};
    final canEdit = canAccess(context.watch<AuthController>().user, Perm.outreachUpdate);
    final type = o['type'] as Map<String, dynamic>?;
    final images = (o['images'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();

    return _DetailScaffold(
      title: o['title'] as String? ?? 'Outreach',
      actions: canEdit
          ? [
              IconButton(
                icon: const Icon(Icons.edit_rounded),
                onPressed: _edit,
              ),
            ]
          : null,
      children: [
        if (type != null)
          _InfoTile(icon: Icons.category_rounded, label: 'Type', value: type['name'] as String?),
        _InfoTile(icon: Icons.location_on_rounded, label: 'Location', value: o['location'] as String?),
        _InfoTile(icon: Icons.map_rounded, label: 'State', value: o['state'] as String?),
        _InfoTile(icon: Icons.flag_rounded, label: 'Status', value: o['status'] as String?),
        _InfoTile(icon: Icons.people_rounded, label: 'People reached', value: '${o['peopleReached'] ?? 0}'),
        _InfoTile(icon: Icons.favorite_rounded, label: 'Souls', value: '${o['souls'] ?? 0}'),
        _InfoTile(icon: Icons.person_rounded, label: 'Coordinator', value: o['coordinator'] as String?),
        if (o['description'] != null) ...[
          const SizedBox(height: 16),
          AppCard(child: Text(o['description'] as String)),
        ],
        if (o['outcome'] != null) ...[
          const SizedBox(height: 12),
          Text('Outcome', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          AppCard(child: Text(o['outcome'] as String)),
        ],
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Gallery (${images.length})', style: Theme.of(context).textTheme.titleMedium),
            if (canEdit)
              TextButton.icon(
                onPressed: _uploading ? null : _showAddPhotoOptions,
                icon: _uploading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.add_photo_alternate_rounded, size: 18),
                label: const Text('Add photo'),
              ),
          ],
        ),
        const SizedBox(height: 10),
        if (images.isEmpty)
          AppCard(
            child: Text(
              'No photos yet.',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          )
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.1,
            ),
            itemCount: images.length,
            itemBuilder: (_, i) {
              final img = images[i];
              final url = assetUrl(img['url'] as String? ?? '');
              return Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: InkWell(
                      onTap: () async {
                        final uri = Uri.tryParse(url);
                        if (uri != null && await canLaunchUrl(uri)) {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        }
                      },
                      child: Image.network(
                        url,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: Colors.grey.shade200,
                          child: const Icon(Icons.broken_image_rounded),
                        ),
                      ),
                    ),
                  ),
                  if (canEdit)
                    Positioned(
                      top: 6,
                      right: 6,
                      child: Material(
                        color: Colors.black54,
                        shape: const CircleBorder(),
                        child: IconButton(
                          icon: const Icon(Icons.close_rounded, color: Colors.white, size: 18),
                          onPressed: () => _removeImage(img['id'] as String),
                        ),
                      ),
                    ),
                  if (img['caption'] != null)
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.bottomCenter,
                            end: Alignment.topCenter,
                            colors: [Colors.black.withValues(alpha: 0.7), Colors.transparent],
                          ),
                          borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                        ),
                        child: Text(
                          img['caption'] as String,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontSize: 11),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
      ],
    );
  }
}

class BranchesScreen extends StatelessWidget {
  const BranchesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final repo = context.read<ChmsRepository>();
    return ModuleListScreen(
      title: 'Branches',
      subtitle: 'Church locations',
      enableSearch: false,
      emptyMessage: 'No branches found.',
      headerColor: AppColors.navyLight,
      loadPage: (_, __) async {
        final items = await repo.fetchBranches();
        return (items: items, totalPages: 1);
      },
      onItemTap: (item) => context.push('/branches/${item['id']}'),
      itemBuilder: (_, item) => simpleListTile(
        title: item['name'] as String? ?? 'Branch',
        subtitle: item['code'] as String? ?? item['city'] as String? ?? '',
        icon: Icons.location_city_rounded,
        color: AppColors.navyLight,
      ),
    );
  }
}

class BranchDetailScreen extends StatefulWidget {
  const BranchDetailScreen({super.key, required this.branchId});

  final String branchId;

  @override
  State<BranchDetailScreen> createState() => _BranchDetailScreenState();
}

class _BranchDetailScreenState extends State<BranchDetailScreen> {
  Map<String, dynamic>? _details;
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
      final data = await context.read<ChmsRepository>().fetchBranchDetails(widget.branchId);
      if (mounted) setState(() { _details = data; _loading = false; });
    } catch (e) {
      try {
        final branch = await context.read<ChmsRepository>().fetchBranch(widget.branchId);
        if (mounted) {
          setState(() {
            _details = _wrapBranchOnly(branch);
            _loading = false;
          });
        }
      } catch (e2) {
        if (mounted) {
          setState(() {
            _error = e2.toString();
            _loading = false;
          });
        }
      }
    }
  }

  Map<String, dynamic> _wrapBranchOnly(Map<String, dynamic> branch) {
    final count = branch['_count'] as Map<String, dynamic>?;
    return {
      'branch': branch,
      'stats': {
        'members': count?['members'] ?? 0,
        'departments': count?['departments'] ?? 0,
        'groups': 0,
        'events': 0,
        'outreaches': 0,
        'newThisMonth': 0,
      },
      'departments': const <Map<String, dynamic>>[],
      'groups': const <Map<String, dynamic>>[],
      'events': const <Map<String, dynamic>>[],
      'outreaches': const <Map<String, dynamic>>[],
    };
  }

  String _personName(Map<String, dynamic>? person) {
    if (person == null) return '';
    return '${person['firstName'] ?? ''} ${person['lastName'] ?? ''}'.trim();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Branch'), backgroundColor: AppColors.navy),
        body: Center(
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
        ),
      );
    }

    final branch = Map<String, dynamic>.from(_details?['branch'] as Map? ?? {});
    final stats = Map<String, dynamic>.from(_details?['stats'] as Map? ?? {});
    final departments = (_details?['departments'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final groups = (_details?['groups'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final events = (_details?['events'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final outreaches = (_details?['outreaches'] as List<dynamic>? ?? [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();

    final branchPastor = branch['branchPastor'] as Map<String, dynamic>?;
    final assistantPastor = branch['assistantPastor'] as Map<String, dynamic>?;
    final location = [branch['city'], branch['state'], branch['country']]
        .whereType<String>()
        .where((s) => s.isNotEmpty)
        .join(', ');
    final isMain = branch['isMain'] == true;

    return _DetailScaffold(
      title: branch['name'] as String? ?? 'Branch',
      children: [
        if (isMain)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                gradient: AppColors.flameGradient,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text(
                'Main campus',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12),
              ),
            ),
          ),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _BranchStatChip(
              label: 'Members',
              value: '${stats['members'] ?? 0}',
              color: AppColors.navyLight,
            ),
            _BranchStatChip(
              label: 'Groups',
              value: '${stats['groups'] ?? 0}',
              color: AppColors.flame,
            ),
            _BranchStatChip(
              label: 'Departments',
              value: '${stats['departments'] ?? 0}',
              color: AppColors.flameOrange,
            ),
            _BranchStatChip(
              label: 'Events',
              value: '${stats['events'] ?? 0}',
              color: AppColors.gold,
            ),
          ],
        ),
        const SizedBox(height: 16),
        _InfoTile(icon: Icons.tag_rounded, label: 'Code', value: branch['code'] as String?),
        _InfoTile(icon: Icons.location_on_rounded, label: 'Address', value: branch['address'] as String?),
        if (location.isNotEmpty)
          _InfoTile(icon: Icons.location_city_rounded, label: 'Location', value: location),
        _InfoTile(icon: Icons.phone_rounded, label: 'Phone', value: branch['phone'] as String?),
        _InfoTile(icon: Icons.email_rounded, label: 'Email', value: branch['email'] as String?),
        if (stats['newThisMonth'] != null && (stats['newThisMonth'] as num) > 0)
          _InfoTile(
            icon: Icons.person_add_rounded,
            label: 'New this month',
            value: '${stats['newThisMonth']}',
          ),
        if (branchPastor != null || assistantPastor != null) ...[
          const SizedBox(height: 8),
          Text('Leadership', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 10),
          if (branchPastor != null)
            _InfoTile(
              icon: Icons.person_rounded,
              label: 'Branch pastor',
              value: _personName(branchPastor),
            ),
          if (assistantPastor != null)
            _InfoTile(
              icon: Icons.person_outline_rounded,
              label: 'Assistant pastor',
              value: _personName(assistantPastor),
            ),
        ],
        if (departments.isNotEmpty) ...[
          const SizedBox(height: 16),
          _BranchSection(
            title: 'Departments',
            items: departments.take(6).map((d) {
              final count = (d['_count'] as Map?)?['members'];
              return _BranchLinkTile(
                title: d['name'] as String? ?? 'Department',
                subtitle: count != null ? '$count members' : null,
                onTap: null,
              );
            }).toList(),
          ),
        ],
        if (groups.isNotEmpty) ...[
          const SizedBox(height: 16),
          _BranchSection(
            title: 'Groups',
            items: groups.take(6).map((g) {
              final count = (g['_count'] as Map?)?['members'];
              return _BranchLinkTile(
                title: g['name'] as String? ?? 'Group',
                subtitle: count != null ? '$count members' : null,
                onTap: () => context.push('/groups/${g['id']}'),
              );
            }).toList(),
          ),
        ],
        if (events.isNotEmpty) ...[
          const SizedBox(height: 16),
          _BranchSection(
            title: 'Recent events',
            items: events.take(5).map((e) {
              return _BranchLinkTile(
                title: e['title'] as String? ?? 'Event',
                subtitle: formatDate(e['startAt'] as String?),
                onTap: () => context.push('/events/${e['id']}'),
              );
            }).toList(),
          ),
        ],
        if (outreaches.isNotEmpty) ...[
          const SizedBox(height: 16),
          _BranchSection(
            title: 'Outreaches',
            items: outreaches.take(5).map((o) {
              return _BranchLinkTile(
                title: o['title'] as String? ?? 'Outreach',
                subtitle: formatDate(o['startAt'] as String?),
                onTap: () => context.push('/outreaches/${o['id']}'),
              );
            }).toList(),
          ),
        ],
      ],
    );
  }
}

class _BranchStatChip extends StatelessWidget {
  const _BranchStatChip({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: (MediaQuery.sizeOf(context).width - 60) / 2,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color, color.withValues(alpha: 0.75)],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.25),
            blurRadius: 10,
            offset: const Offset(0, 4),
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
              fontSize: 22,
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

class _BranchSection extends StatelessWidget {
  const _BranchSection({required this.title, required this.items});

  final String title;
  final List<Widget> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 10),
        ...items,
      ],
    );
  }
}

class _BranchLinkTile extends StatelessWidget {
  const _BranchLinkTile({
    required this.title,
    this.subtitle,
    this.onTap,
  });

  final String title;
  final String? subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: AppCard(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                    if (subtitle != null)
                      Text(
                        subtitle!,
                        style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                      ),
                  ],
                ),
              ),
              if (onTap != null)
                Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailScaffold extends StatelessWidget {
  const _DetailScaffold({
    required this.title,
    required this.children,
    this.floatingActionButton,
    this.actions,
  });

  final String title;
  final List<Widget> children;
  final Widget? floatingActionButton;
  final List<Widget>? actions;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: Text(title),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
        actions: actions,
      ),
      floatingActionButton: floatingActionButton,
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: children,
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.icon, required this.label, this.value});

  final IconData icon;
  final String label;
  final String? value;

  @override
  Widget build(BuildContext context) {
    if (value == null || value!.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: AppCard(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Icon(icon, color: AppColors.indigo, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                  Text(value!, style: const TextStyle(fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String formatDateTimeStr(String? iso) {
  if (iso == null) return '—';
  final d = DateTime.tryParse(iso);
  if (d == null) return iso;
  return '${d.day}/${d.month}/${d.year} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}
