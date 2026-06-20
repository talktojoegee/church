import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/data/chms_repository.dart';
import '../../core/theme/app_colors.dart';
import '../../features/auth/auth_controller.dart';
import '../../widgets/ui_components.dart';
import '../../widgets/module_list_screen.dart';
import '../../widgets/member_picker.dart';
import '../../widgets/multi_member_picker.dart';

/// Resolve branch ID from auth user or first available branch.
Future<String?> resolveBranchId(BuildContext context) async {
  final authBranch = context.read<AuthController>().user?.branchId;
  if (authBranch != null && authBranch.isNotEmpty) return authBranch;
  final branches = await context.read<ChmsRepository>().fetchBranches();
  if (branches.isEmpty) return null;
  return branches.first['id'] as String?;
}

class FormScaffold extends StatelessWidget {
  const FormScaffold({
    super.key,
    required this.title,
    required this.child,
    required this.onSave,
    this.saving = false,
    this.saveLabel = 'Save',
  });

  final String title;
  final Widget child;
  final VoidCallback? onSave;
  final bool saving;
  final String saveLabel;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: Text(title),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            AppCard(child: child),
            const SizedBox(height: 20),
            GradientButton(label: saveLabel, loading: saving, onPressed: onSave),
          ],
        ),
      ),
    );
  }
}

// ── Create Event ───────────────────────────────────────────────────────────

class CreateEventScreen extends StatefulWidget {
  const CreateEventScreen({super.key});

  @override
  State<CreateEventScreen> createState() => _CreateEventScreenState();
}

class _CreateEventScreenState extends State<CreateEventScreen> {
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _location = TextEditingController();
  DateTime _startAt = DateTime.now().add(const Duration(days: 1));
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _location.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _startAt,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_startAt),
    );
    if (time == null || !mounted) return;
    setState(() {
      _startAt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  Future<void> _save() async {
    if (_title.text.trim().isEmpty) {
      setState(() => _error = 'Title is required');
      return;
    }
    final branchId = await resolveBranchId(context);
    if (branchId == null) {
      setState(() => _error = 'No branch available');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await context.read<ChmsRepository>().createEvent({
        'branchId': branchId,
        'title': _title.text.trim(),
        'startAt': _startAt.toUtc().toIso8601String(),
        if (_description.text.trim().isNotEmpty) 'description': _description.text.trim(),
        if (_location.text.trim().isNotEmpty) 'location': _location.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Event created'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return FormScaffold(
      title: 'New event',
      saving: _saving,
      saveLabel: 'Create event',
      onSave: _save,
      child: Column(
        children: [
          TextField(controller: _title, decoration: const InputDecoration(labelText: 'Title *')),
          const SizedBox(height: 14),
          TextField(controller: _location, decoration: const InputDecoration(labelText: 'Location')),
          const SizedBox(height: 14),
          TextField(
            controller: _description,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Description'),
          ),
          const SizedBox(height: 14),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Start date & time'),
            subtitle: Text(formatDateTime(_startAt)),
            trailing: const Icon(Icons.calendar_month_rounded),
            onTap: _pickDateTime,
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

// ── Record Contribution ──────────────────────────────────────────────────

class RecordContributionScreen extends StatefulWidget {
  const RecordContributionScreen({super.key, this.memberId, this.memberName});

  final String? memberId;
  final String? memberName;

  @override
  State<RecordContributionScreen> createState() => _RecordContributionScreenState();
}

class _RecordContributionScreenState extends State<RecordContributionScreen> {
  final _amount = TextEditingController();
  final _note = TextEditingController();
  List<Map<String, dynamic>> _givingTypes = [];
  String? _givingTypeId;
  String _paymentMethod = 'CASH';
  DateTime _date = DateTime.now();
  bool _loading = true;
  bool _saving = false;
  String? _error;

  static const _paymentMethods = ['CASH', 'TRANSFER', 'CARD', 'POS', 'CHEQUE', 'ONLINE', 'OTHER'];

  @override
  void initState() {
    super.initState();
    _loadLookups();
  }

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _loadLookups() async {
    try {
      final branchId = await resolveBranchId(context);
      final types = await context.read<ChmsRepository>().fetchGivingTypes(branchId: branchId);
      if (!mounted) return;
      setState(() {
        _givingTypes = types;
        _givingTypeId = types.isNotEmpty ? types.first['id'] as String? : null;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  Future<void> _save() async {
    final amount = double.tryParse(_amount.text.trim());
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Enter a valid amount');
      return;
    }
    if (_givingTypeId == null) {
      setState(() => _error = 'Select a giving type');
      return;
    }
    final branchId = await resolveBranchId(context);
    if (branchId == null) {
      setState(() => _error = 'No branch available');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      await context.read<ChmsRepository>().createContribution({
        'branchId': branchId,
        'givingTypeId': _givingTypeId,
        'amount': amount,
        'contributedAt': _date.toUtc().toIso8601String(),
        'paymentMethod': _paymentMethod,
        if (widget.memberId != null) 'memberId': widget.memberId,
        if (_note.text.trim().isNotEmpty) 'note': _note.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Income recorded'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return FormScaffold(
      title: widget.memberName != null ? 'Giving · ${widget.memberName}' : 'Record income',
      saving: _saving,
      saveLabel: 'Record income',
      onSave: _save,
      child: Column(
        children: [
          TextField(
            controller: _amount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Amount (₦) *', prefixText: '₦ '),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            value: _givingTypeId,
            decoration: const InputDecoration(labelText: 'Giving type *'),
            items: _givingTypes
                .map((t) => DropdownMenuItem(value: t['id'] as String, child: Text(t['name'] as String? ?? '')))
                .toList(),
            onChanged: (v) => setState(() => _givingTypeId = v),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            value: _paymentMethod,
            decoration: const InputDecoration(labelText: 'Payment method'),
            items: _paymentMethods
                .map((m) => DropdownMenuItem(value: m, child: Text(m.replaceAll('_', ' '))))
                .toList(),
            onChanged: (v) => setState(() => _paymentMethod = v ?? 'CASH'),
          ),
          const SizedBox(height: 14),
          TextField(controller: _note, decoration: const InputDecoration(labelText: 'Note')),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

// ── Record Expense ─────────────────────────────────────────────────────────

class RecordExpenseScreen extends StatefulWidget {
  const RecordExpenseScreen({super.key});

  @override
  State<RecordExpenseScreen> createState() => _RecordExpenseScreenState();
}

class _RecordExpenseScreenState extends State<RecordExpenseScreen> {
  final _amount = TextEditingController();
  final _description = TextEditingController();
  final _paidTo = TextEditingController();
  List<Map<String, dynamic>> _categories = [];
  String? _categoryId;
  String _paymentMethod = 'CASH';
  bool _loading = true;
  bool _saving = false;
  String? _error;

  static const _paymentMethods = ['CASH', 'TRANSFER', 'CARD', 'POS', 'CHEQUE', 'ONLINE', 'OTHER'];

  @override
  void initState() {
    super.initState();
    _loadLookups();
  }

  @override
  void dispose() {
    _amount.dispose();
    _description.dispose();
    _paidTo.dispose();
    super.dispose();
  }

  Future<void> _loadLookups() async {
    try {
      final branchId = await resolveBranchId(context);
      final cats = await context.read<ChmsRepository>().fetchExpenseCategories(branchId: branchId);
      if (!mounted) return;
      setState(() {
        _categories = cats;
        _categoryId = cats.isNotEmpty ? cats.first['id'] as String? : null;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  Future<void> _save() async {
    final amount = double.tryParse(_amount.text.trim());
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Enter a valid amount');
      return;
    }
    if (_categoryId == null) {
      setState(() => _error = 'Select a category');
      return;
    }
    final branchId = await resolveBranchId(context);
    if (branchId == null) {
      setState(() => _error = 'No branch available');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      await context.read<ChmsRepository>().createExpense({
        'branchId': branchId,
        'categoryId': _categoryId,
        'amount': amount,
        'expenseDate': DateTime.now().toUtc().toIso8601String(),
        'paymentMethod': _paymentMethod,
        if (_description.text.trim().isNotEmpty) 'description': _description.text.trim(),
        if (_paidTo.text.trim().isNotEmpty) 'paidTo': _paidTo.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Expense recorded'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return FormScaffold(
      title: 'Record expense',
      saving: _saving,
      saveLabel: 'Record expense',
      onSave: _save,
      child: Column(
        children: [
          TextField(
            controller: _amount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Amount (₦) *', prefixText: '₦ '),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            value: _categoryId,
            decoration: const InputDecoration(labelText: 'Category *'),
            items: _categories
                .map((c) => DropdownMenuItem(value: c['id'] as String, child: Text(c['name'] as String? ?? '')))
                .toList(),
            onChanged: (v) => setState(() => _categoryId = v),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            value: _paymentMethod,
            decoration: const InputDecoration(labelText: 'Payment method'),
            items: _paymentMethods
                .map((m) => DropdownMenuItem(value: m, child: Text(m.replaceAll('_', ' '))))
                .toList(),
            onChanged: (v) => setState(() => _paymentMethod = v ?? 'CASH'),
          ),
          const SizedBox(height: 14),
          TextField(controller: _paidTo, decoration: const InputDecoration(labelText: 'Paid to')),
          const SizedBox(height: 14),
          TextField(controller: _description, decoration: const InputDecoration(labelText: 'Description')),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

// ── Create Follow-up ───────────────────────────────────────────────────────

class CreateFollowUpScreen extends StatefulWidget {
  const CreateFollowUpScreen({super.key, this.memberId, this.memberName});

  final String? memberId;
  final String? memberName;

  @override
  State<CreateFollowUpScreen> createState() => _CreateFollowUpScreenState();
}

class _CreateFollowUpScreenState extends State<CreateFollowUpScreen> {
  final _contactName = TextEditingController();
  final _contactPhone = TextEditingController();
  final _notes = TextEditingController();
  String _type = 'OTHER';
  DateTime? _dueDate;
  bool _saving = false;
  String? _error;

  static const _types = [
    'FIRST_TIMER', 'ABSENTEE', 'NEW_CONVERT', 'PRAYER_REQUEST', 'COUNSELING', 'OTHER',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.memberName != null) _contactName.text = widget.memberName!;
  }

  @override
  void dispose() {
    _contactName.dispose();
    _contactPhone.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final branchId = await resolveBranchId(context);
    if (branchId == null) {
      setState(() => _error = 'No branch available');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      await context.read<ChmsRepository>().createFollowUp({
        'branchId': branchId,
        'type': _type,
        if (widget.memberId != null) 'memberId': widget.memberId,
        if (_contactName.text.trim().isNotEmpty) 'contactName': _contactName.text.trim(),
        if (_contactPhone.text.trim().isNotEmpty) 'contactPhone': _contactPhone.text.trim(),
        if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
        if (_dueDate != null) 'dueDate': _dueDate!.toUtc().toIso8601String(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Follow-up created'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return FormScaffold(
      title: 'New follow-up',
      saving: _saving,
      saveLabel: 'Create follow-up',
      onSave: _save,
      child: Column(
        children: [
          DropdownButtonFormField<String>(
            value: _type,
            decoration: const InputDecoration(labelText: 'Type *'),
            items: _types
                .map((t) => DropdownMenuItem(value: t, child: Text(t.replaceAll('_', ' '))))
                .toList(),
            onChanged: (v) => setState(() => _type = v ?? 'OTHER'),
          ),
          const SizedBox(height: 14),
          TextField(controller: _contactName, decoration: const InputDecoration(labelText: 'Contact name')),
          const SizedBox(height: 14),
          TextField(
            controller: _contactPhone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Contact phone'),
          ),
          const SizedBox(height: 14),
          TextField(controller: _notes, maxLines: 3, decoration: const InputDecoration(labelText: 'Notes')),
          const SizedBox(height: 14),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Due date'),
            subtitle: Text(_dueDate != null ? formatDate(_dueDate!.toIso8601String()) : 'Optional'),
            trailing: const Icon(Icons.event_rounded),
            onTap: () async {
              final d = await showDatePicker(
                context: context,
                initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 3)),
                firstDate: DateTime.now(),
                lastDate: DateTime(2030),
              );
              if (d != null) setState(() => _dueDate = d);
            },
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

// ── Record Attendance ──────────────────────────────────────────────────────

class CreateAttendanceScreen extends StatefulWidget {
  const CreateAttendanceScreen({super.key});

  @override
  State<CreateAttendanceScreen> createState() => _CreateAttendanceScreenState();
}

class _CreateAttendanceScreenState extends State<CreateAttendanceScreen> {
  final _title = TextEditingController();
  final _totalCount = TextEditingController();
  final _notes = TextEditingController();
  String _type = 'SUNDAY_SERVICE';
  DateTime _date = DateTime.now();
  bool _useRollCall = false;
  List<Map<String, dynamic>> _presentMembers = [];
  bool _saving = false;
  String? _error;

  static const _types = ['SUNDAY_SERVICE', 'MIDWEEK', 'SPECIAL', 'OTHER'];

  @override
  void dispose() {
    _title.dispose();
    _totalCount.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickMembers() async {
    final picked = await showMultiMemberPicker(context, initial: _presentMembers);
    if (picked != null) {
      setState(() {
        _presentMembers = picked;
        _totalCount.text = '${picked.length}';
      });
    }
  }

  Future<void> _save() async {
    if (_title.text.trim().isEmpty) {
      setState(() => _error = 'Title is required');
      return;
    }
    final branchId = await resolveBranchId(context);
    if (branchId == null) {
      setState(() => _error = 'No branch available');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final ids = _presentMembers.map((m) => m['id'] as String).toList();
      final manualTotal = int.tryParse(_totalCount.text.trim());
      await context.read<ChmsRepository>().createAttendanceSession({
        'branchId': branchId,
        'title': _title.text.trim(),
        'type': _type,
        'date': _date.toUtc().toIso8601String(),
        if (ids.isNotEmpty) 'presentMemberIds': ids,
        if (manualTotal != null && !_useRollCall) 'totalCount': manualTotal,
        if (_useRollCall && ids.isNotEmpty) 'totalCount': ids.length,
        if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Attendance recorded'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return FormScaffold(
      title: 'Record attendance',
      saving: _saving,
      saveLabel: 'Save session',
      onSave: _save,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(controller: _title, decoration: const InputDecoration(labelText: 'Service title *')),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _type,
            decoration: const InputDecoration(labelText: 'Service type'),
            items: _types
                .map((t) => DropdownMenuItem(value: t, child: Text(t.replaceAll('_', ' '))))
                .toList(),
            onChanged: (v) => setState(() => _type = v ?? 'SUNDAY_SERVICE'),
          ),
          const SizedBox(height: 14),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Roll call'),
            subtitle: const Text('Mark individual members present'),
            value: _useRollCall,
            onChanged: (v) => setState(() => _useRollCall = v),
          ),
          if (_useRollCall) ...[
            OutlinedButton.icon(
              onPressed: _pickMembers,
              icon: const Icon(Icons.people_rounded),
              label: Text(_presentMembers.isEmpty
                  ? 'Select present members'
                  : '${_presentMembers.length} members selected'),
            ),
            if (_presentMembers.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: _presentMembers.map((m) {
                  return Chip(
                    label: Text(memberDisplayName(m), style: const TextStyle(fontSize: 11)),
                  );
                }).toList(),
              ),
            ],
          ] else ...[
            TextField(
              controller: _totalCount,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Total attendance'),
            ),
          ],
          const SizedBox(height: 14),
          TextField(controller: _notes, decoration: const InputDecoration(labelText: 'Notes')),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

String formatDateTime(DateTime dt) {
  return '${dt.day}/${dt.month}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}

// ── Edit Member ────────────────────────────────────────────────────────────

class EditMemberScreen extends StatefulWidget {
  const EditMemberScreen({super.key, required this.memberId, required this.initial});

  final String memberId;
  final Map<String, dynamic> initial;

  @override
  State<EditMemberScreen> createState() => _EditMemberScreenState();
}

class _EditMemberScreenState extends State<EditMemberScreen> {
  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  late final TextEditingController _email;
  late final TextEditingController _phone;
  late final TextEditingController _address;
  late final TextEditingController _occupation;
  late final TextEditingController _notes;
  bool _saving = false;
  String? _error;

  static const _statuses = ['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'DECEASED'];
  late String _status;

  @override
  void initState() {
    super.initState();
    final m = widget.initial;
    _firstName = TextEditingController(text: m['firstName'] as String? ?? '');
    _lastName = TextEditingController(text: m['lastName'] as String? ?? '');
    _email = TextEditingController(text: m['email'] as String? ?? '');
    _phone = TextEditingController(text: m['phone'] as String? ?? '');
    _address = TextEditingController(text: m['address'] as String? ?? '');
    _occupation = TextEditingController(text: m['occupation'] as String? ?? '');
    _notes = TextEditingController(text: m['notes'] as String? ?? '');
    _status = m['status'] as String? ?? 'ACTIVE';
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _email.dispose();
    _phone.dispose();
    _address.dispose();
    _occupation.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_firstName.text.trim().isEmpty || _lastName.text.trim().isEmpty) {
      setState(() => _error = 'First and last name are required');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      await context.read<ChmsRepository>().updateMember(widget.memberId, {
        'firstName': _firstName.text.trim(),
        'lastName': _lastName.text.trim(),
        'email': _email.text.trim().isEmpty ? null : _email.text.trim(),
        'phone': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        'address': _address.text.trim().isEmpty ? null : _address.text.trim(),
        'occupation': _occupation.text.trim().isEmpty ? null : _occupation.text.trim(),
        'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
        'status': _status,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Member updated'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return FormScaffold(
      title: 'Edit member',
      saving: _saving,
      onSave: _save,
      child: Column(
        children: [
          TextField(controller: _firstName, decoration: const InputDecoration(labelText: 'First name *')),
          const SizedBox(height: 14),
          TextField(controller: _lastName, decoration: const InputDecoration(labelText: 'Last name *')),
          const SizedBox(height: 14),
          TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
          const SizedBox(height: 14),
          TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone')),
          const SizedBox(height: 14),
          TextField(controller: _address, decoration: const InputDecoration(labelText: 'Address')),
          const SizedBox(height: 14),
          TextField(controller: _occupation, decoration: const InputDecoration(labelText: 'Occupation')),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _status,
            decoration: const InputDecoration(labelText: 'Status'),
            items: _statuses.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
            onChanged: (v) => setState(() => _status = v ?? 'ACTIVE'),
          ),
          const SizedBox(height: 14),
          TextField(controller: _notes, maxLines: 3, decoration: const InputDecoration(labelText: 'Notes')),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

// ── Register for Event ─────────────────────────────────────────────────────

class RegisterEventScreen extends StatefulWidget {
  const RegisterEventScreen({super.key, required this.eventId, required this.eventTitle});

  final String eventId;
  final String eventTitle;

  @override
  State<RegisterEventScreen> createState() => _RegisterEventScreenState();
}

class _RegisterEventScreenState extends State<RegisterEventScreen> {
  int _mode = 0; // 0 = member, 1 = guest
  Map<String, dynamic>? _selectedMember;
  final _guestName = TextEditingController();
  final _guestPhone = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _guestName.dispose();
    _guestPhone.dispose();
    super.dispose();
  }

  Future<void> _pickMember() async {
    final member = await showMemberPicker(context);
    if (member != null) setState(() => _selectedMember = member);
  }

  Future<void> _save() async {
    setState(() { _saving = true; _error = null; });
    try {
      if (_mode == 0) {
        if (_selectedMember == null) {
          setState(() { _saving = false; _error = 'Select a member'; });
          return;
        }
        await context.read<ChmsRepository>().registerEvent(widget.eventId, {
          'memberId': _selectedMember!['id'],
        });
      } else {
        if (_guestName.text.trim().isEmpty) {
          setState(() { _saving = false; _error = 'Guest name is required'; });
          return;
        }
        await context.read<ChmsRepository>().registerEvent(widget.eventId, {
          'guestName': _guestName.text.trim(),
          if (_guestPhone.text.trim().isNotEmpty) 'guestPhone': _guestPhone.text.trim(),
        });
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Registered successfully'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return FormScaffold(
      title: 'Register · ${widget.eventTitle}',
      saving: _saving,
      saveLabel: 'Register',
      onSave: _save,
      child: Column(
        children: [
          SegmentedButton<int>(
            segments: const [
              ButtonSegment(value: 0, label: Text('Member'), icon: Icon(Icons.person_rounded)),
              ButtonSegment(value: 1, label: Text('Guest'), icon: Icon(Icons.person_outline_rounded)),
            ],
            selected: {_mode},
            onSelectionChanged: (s) => setState(() => _mode = s.first),
          ),
          const SizedBox(height: 20),
          if (_mode == 0) ...[
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                _selectedMember != null
                    ? memberDisplayName(_selectedMember!)
                    : 'Tap to select member',
              ),
              subtitle: _selectedMember != null
                  ? Text(_selectedMember!['phone'] as String? ?? _selectedMember!['email'] as String? ?? '')
                  : null,
              trailing: const Icon(Icons.search_rounded),
              onTap: _pickMember,
            ),
          ] else ...[
            TextField(controller: _guestName, decoration: const InputDecoration(labelText: 'Guest name *')),
            const SizedBox(height: 14),
            TextField(controller: _guestPhone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone')),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

// ── Create Member ──────────────────────────────────────────────────────────

class CreateMemberScreen extends StatefulWidget {
  const CreateMemberScreen({super.key});

  @override
  State<CreateMemberScreen> createState() => _CreateMemberScreenState();
}

class _CreateMemberScreenState extends State<CreateMemberScreen> {
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _email.dispose();
    _phone.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_firstName.text.trim().isEmpty || _lastName.text.trim().isEmpty) {
      setState(() => _error = 'First and last name are required');
      return;
    }
    final branchId = await resolveBranchId(context);
    if (branchId == null) {
      setState(() => _error = 'No branch available');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      await context.read<ChmsRepository>().createMember({
        'branchId': branchId,
        'firstName': _firstName.text.trim(),
        'lastName': _lastName.text.trim(),
        if (_email.text.trim().isNotEmpty) 'email': _email.text.trim(),
        if (_phone.text.trim().isNotEmpty) 'phone': _phone.text.trim(),
        if (_address.text.trim().isNotEmpty) 'address': _address.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Member created'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return FormScaffold(
      title: 'New member',
      saving: _saving,
      saveLabel: 'Create member',
      onSave: _save,
      child: Column(
        children: [
          TextField(controller: _firstName, decoration: const InputDecoration(labelText: 'First name *')),
          const SizedBox(height: 14),
          TextField(controller: _lastName, decoration: const InputDecoration(labelText: 'Last name *')),
          const SizedBox(height: 14),
          TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
          const SizedBox(height: 14),
          TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone')),
          const SizedBox(height: 14),
          TextField(controller: _address, decoration: const InputDecoration(labelText: 'Address')),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

// ── Edit Event ─────────────────────────────────────────────────────────────

class EditEventScreen extends StatefulWidget {
  const EditEventScreen({super.key, required this.eventId});

  final String eventId;

  @override
  State<EditEventScreen> createState() => _EditEventScreenState();
}

class _EditEventScreenState extends State<EditEventScreen> {
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _location = TextEditingController();
  DateTime _startAt = DateTime.now();
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _location.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final e = await context.read<ChmsRepository>().fetchEvent(widget.eventId);
      if (!mounted) return;
      _title.text = e['title'] as String? ?? '';
      _description.text = e['description'] as String? ?? '';
      _location.text = e['location'] as String? ?? '';
      final start = DateTime.tryParse(e['startAt'] as String? ?? '') ?? DateTime.now();
      setState(() { _startAt = start; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _startAt,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(_startAt));
    if (time == null || !mounted) return;
    setState(() => _startAt = DateTime(date.year, date.month, date.day, time.hour, time.minute));
  }

  Future<void> _save() async {
    if (_title.text.trim().isEmpty) {
      setState(() => _error = 'Title is required');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      await context.read<ChmsRepository>().updateEvent(widget.eventId, {
        'title': _title.text.trim(),
        'startAt': _startAt.toUtc().toIso8601String(),
        if (_description.text.trim().isNotEmpty) 'description': _description.text.trim(),
        if (_location.text.trim().isNotEmpty) 'location': _location.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Event updated'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return FormScaffold(
      title: 'Edit event',
      saving: _saving,
      onSave: _save,
      child: Column(
        children: [
          TextField(controller: _title, decoration: const InputDecoration(labelText: 'Title *')),
          const SizedBox(height: 14),
          TextField(controller: _location, decoration: const InputDecoration(labelText: 'Location')),
          const SizedBox(height: 14),
          TextField(controller: _description, maxLines: 3, decoration: const InputDecoration(labelText: 'Description')),
          const SizedBox(height: 14),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Start date & time'),
            subtitle: Text(formatDateTime(_startAt)),
            trailing: const Icon(Icons.calendar_month_rounded),
            onTap: _pickDateTime,
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

// ── Create Group ───────────────────────────────────────────────────────────

class CreateGroupScreen extends StatefulWidget {
  const CreateGroupScreen({super.key});

  @override
  State<CreateGroupScreen> createState() => _CreateGroupScreenState();
}

class _CreateGroupScreenState extends State<CreateGroupScreen> {
  final _name = TextEditingController();
  final _category = TextEditingController();
  final _description = TextEditingController();
  final _location = TextEditingController();
  final _meetingDay = TextEditingController();
  final _meetingTime = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _category.dispose();
    _description.dispose();
    _location.dispose();
    _meetingDay.dispose();
    _meetingTime.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().length < 2) {
      setState(() => _error = 'Group name is required');
      return;
    }
    final branchId = await resolveBranchId(context);
    if (branchId == null) {
      setState(() => _error = 'No branch available');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      await context.read<ChmsRepository>().createGroup({
        'branchId': branchId,
        'name': _name.text.trim(),
        if (_category.text.trim().isNotEmpty) 'category': _category.text.trim(),
        if (_description.text.trim().isNotEmpty) 'description': _description.text.trim(),
        if (_location.text.trim().isNotEmpty) 'location': _location.text.trim(),
        if (_meetingDay.text.trim().isNotEmpty) 'meetingDay': _meetingDay.text.trim(),
        if (_meetingTime.text.trim().isNotEmpty) 'meetingTime': _meetingTime.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Group created'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return FormScaffold(
      title: 'New group',
      saving: _saving,
      saveLabel: 'Create group',
      onSave: _save,
      child: Column(
        children: [
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Group name *')),
          const SizedBox(height: 14),
          TextField(controller: _category, decoration: const InputDecoration(labelText: 'Category')),
          const SizedBox(height: 14),
          TextField(controller: _description, maxLines: 2, decoration: const InputDecoration(labelText: 'Description')),
          const SizedBox(height: 14),
          TextField(controller: _location, decoration: const InputDecoration(labelText: 'Location')),
          const SizedBox(height: 14),
          TextField(controller: _meetingDay, decoration: const InputDecoration(labelText: 'Meeting day (e.g. Sunday)')),
          const SizedBox(height: 14),
          TextField(controller: _meetingTime, decoration: const InputDecoration(labelText: 'Meeting time')),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

// ── Log Group Meeting ──────────────────────────────────────────────────────

class LogGroupMeetingScreen extends StatefulWidget {
  const LogGroupMeetingScreen({super.key, required this.groupId, required this.groupName});

  final String groupId;
  final String groupName;

  @override
  State<LogGroupMeetingScreen> createState() => _LogGroupMeetingScreenState();
}

class _LogGroupMeetingScreenState extends State<LogGroupMeetingScreen> {
  final _title = TextEditingController();
  final _topic = TextEditingController();
  final _notes = TextEditingController();
  DateTime _heldAt = DateTime.now();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _topic.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final d = await showDatePicker(
      context: context,
      initialDate: _heldAt,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (d != null) setState(() => _heldAt = DateTime(d.year, d.month, d.day, _heldAt.hour, _heldAt.minute));
  }

  Future<void> _save() async {
    if (_title.text.trim().length < 2) {
      setState(() => _error = 'Meeting title is required');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      await context.read<ChmsRepository>().logGroupMeeting(widget.groupId, {
        'title': _title.text.trim(),
        'heldAt': _heldAt.toUtc().toIso8601String(),
        if (_topic.text.trim().isNotEmpty) 'topic': _topic.text.trim(),
        if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Meeting logged'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return FormScaffold(
      title: 'Log meeting · ${widget.groupName}',
      saving: _saving,
      saveLabel: 'Save meeting',
      onSave: _save,
      child: Column(
        children: [
          TextField(controller: _title, decoration: const InputDecoration(labelText: 'Meeting title *')),
          const SizedBox(height: 14),
          TextField(controller: _topic, decoration: const InputDecoration(labelText: 'Topic')),
          const SizedBox(height: 14),
          TextField(controller: _notes, maxLines: 3, decoration: const InputDecoration(labelText: 'Notes')),
          const SizedBox(height: 14),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Date held'),
            subtitle: Text(formatDate(_heldAt.toIso8601String())),
            trailing: const Icon(Icons.event_rounded),
            onTap: _pickDate,
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

// ── Submit Testimony ───────────────────────────────────────────────────────

class SubmitTestimonyScreen extends StatefulWidget {
  const SubmitTestimonyScreen({super.key});

  @override
  State<SubmitTestimonyScreen> createState() => _SubmitTestimonyScreenState();
}

class _SubmitTestimonyScreenState extends State<SubmitTestimonyScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  final _authorName = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    _authorName.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_title.text.trim().length < 2 || _body.text.trim().length < 2) {
      setState(() => _error = 'Title and story are required');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      await context.read<ChmsRepository>().createTestimony({
        'title': _title.text.trim(),
        'body': _body.text.trim(),
        if (_authorName.text.trim().isNotEmpty) 'authorName': _authorName.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Testimony submitted'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return FormScaffold(
      title: 'Share testimony',
      saving: _saving,
      saveLabel: 'Submit',
      onSave: _save,
      child: Column(
        children: [
          TextField(controller: _title, decoration: const InputDecoration(labelText: 'Title *')),
          const SizedBox(height: 14),
          TextField(controller: _authorName, decoration: const InputDecoration(labelText: 'Your name')),
          const SizedBox(height: 14),
          TextField(
            controller: _body,
            maxLines: 6,
            decoration: const InputDecoration(labelText: 'Your story *', alignLabelWithHint: true),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

// ── Edit Attendance Roll Call ──────────────────────────────────────────────

class EditAttendanceRollCallScreen extends StatefulWidget {
  const EditAttendanceRollCallScreen({super.key, required this.sessionId});

  final String sessionId;

  @override
  State<EditAttendanceRollCallScreen> createState() => _EditAttendanceRollCallScreenState();
}

class _EditAttendanceRollCallScreenState extends State<EditAttendanceRollCallScreen> {
  List<Map<String, dynamic>> _presentMembers = [];
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String _sessionTitle = 'Session';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final session = await context.read<ChmsRepository>().fetchAttendanceSession(widget.sessionId);
      if (!mounted) return;
      final records = session['records'] as List<dynamic>? ?? [];
      setState(() {
        _sessionTitle = session['title'] as String? ?? 'Session';
        _presentMembers = records
            .map((r) => Map<String, dynamic>.from((r as Map)['member'] as Map))
            .toList();
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  Future<void> _pickMembers() async {
    final picked = await showMultiMemberPicker(context, initial: _presentMembers);
    if (picked != null) setState(() => _presentMembers = picked);
  }

  Future<void> _save() async {
    setState(() { _saving = true; _error = null; });
    try {
      final ids = _presentMembers.map((m) => m['id'] as String).toList();
      await context.read<ChmsRepository>().updateAttendanceSession(widget.sessionId, {
        'presentMemberIds': ids,
        'totalCount': ids.length,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Roll call updated'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return FormScaffold(
      title: 'Roll call · $_sessionTitle',
      saving: _saving,
      saveLabel: 'Update roll call',
      onSave: _save,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          OutlinedButton.icon(
            onPressed: _pickMembers,
            icon: const Icon(Icons.people_rounded),
            label: Text('${_presentMembers.length} members marked present'),
          ),
          const SizedBox(height: 12),
          if (_presentMembers.isEmpty)
            Text('No members selected.', style: TextStyle(color: Colors.grey.shade600))
          else
            ..._presentMembers.map((m) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(
                    child: Text(
                      memberDisplayName(m).isNotEmpty ? memberDisplayName(m)[0].toUpperCase() : '?',
                    ),
                  ),
                  title: Text(memberDisplayName(m)),
                  subtitle: Text(m['membershipNumber'] as String? ?? m['phone'] as String? ?? ''),
                ),
              );
            }),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

// ── Create Outreach ────────────────────────────────────────────────────────

class CreateOutreachScreen extends StatefulWidget {
  const CreateOutreachScreen({super.key});

  @override
  State<CreateOutreachScreen> createState() => _CreateOutreachScreenState();
}

class _CreateOutreachScreenState extends State<CreateOutreachScreen> {
  final _title = TextEditingController();
  final _location = TextEditingController();
  final _state = TextEditingController();
  final _coordinator = TextEditingController();
  final _description = TextEditingController();
  final _peopleReached = TextEditingController();
  final _souls = TextEditingController();
  final _outcome = TextEditingController();
  List<Map<String, dynamic>> _types = [];
  String? _typeId;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadTypes();
  }

  Future<void> _loadTypes() async {
    final branchId = await resolveBranchId(context);
    if (branchId == null) return;
    try {
      final types = await context.read<ChmsRepository>().fetchOutreachTypes(branchId: branchId);
      if (mounted) setState(() => _types = types);
    } catch (_) {}
  }

  @override
  void dispose() {
    _title.dispose();
    _location.dispose();
    _state.dispose();
    _coordinator.dispose();
    _description.dispose();
    _peopleReached.dispose();
    _souls.dispose();
    _outcome.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_title.text.trim().length < 2) {
      setState(() => _error = 'Title is required');
      return;
    }
    final branchId = await resolveBranchId(context);
    if (branchId == null) {
      setState(() => _error = 'No branch available');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      await context.read<ChmsRepository>().createOutreach({
        'branchId': branchId,
        'title': _title.text.trim(),
        if (_typeId != null) 'typeId': _typeId,
        if (_location.text.trim().isNotEmpty) 'location': _location.text.trim(),
        if (_state.text.trim().isNotEmpty) 'state': _state.text.trim(),
        if (_coordinator.text.trim().isNotEmpty) 'coordinator': _coordinator.text.trim(),
        if (_description.text.trim().isNotEmpty) 'description': _description.text.trim(),
        if (_peopleReached.text.trim().isNotEmpty) 'peopleReached': int.tryParse(_peopleReached.text.trim()) ?? 0,
        if (_souls.text.trim().isNotEmpty) 'souls': int.tryParse(_souls.text.trim()) ?? 0,
        if (_outcome.text.trim().isNotEmpty) 'outcome': _outcome.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Outreach created'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return FormScaffold(
      title: 'New outreach',
      saving: _saving,
      saveLabel: 'Create outreach',
      onSave: _save,
      child: Column(
        children: [
          TextField(controller: _title, decoration: const InputDecoration(labelText: 'Title *')),
          if (_types.isNotEmpty) ...[
            const SizedBox(height: 14),
            DropdownButtonFormField<String?>(
              initialValue: _typeId,
              decoration: const InputDecoration(labelText: 'Outreach type'),
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('None')),
                ..._types.map((t) => DropdownMenuItem<String?>(
                      value: t['id'] as String,
                      child: Text(t['name'] as String? ?? 'Type'),
                    )),
              ],
              onChanged: (v) => setState(() => _typeId = v),
            ),
          ],
          const SizedBox(height: 14),
          TextField(controller: _location, decoration: const InputDecoration(labelText: 'Location')),
          const SizedBox(height: 14),
          TextField(controller: _state, decoration: const InputDecoration(labelText: 'State / region')),
          const SizedBox(height: 14),
          TextField(controller: _coordinator, decoration: const InputDecoration(labelText: 'Coordinator')),
          const SizedBox(height: 14),
          TextField(controller: _description, maxLines: 2, decoration: const InputDecoration(labelText: 'Description')),
          const SizedBox(height: 14),
          TextField(
            controller: _peopleReached,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'People reached'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _souls,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Souls won'),
          ),
          const SizedBox(height: 14),
          TextField(controller: _outcome, maxLines: 2, decoration: const InputDecoration(labelText: 'Outcome')),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

// ── Create Sermon ──────────────────────────────────────────────────────────

class CreateSermonScreen extends StatefulWidget {
  const CreateSermonScreen({super.key});

  @override
  State<CreateSermonScreen> createState() => _CreateSermonScreenState();
}

class _CreateSermonScreenState extends State<CreateSermonScreen> {
  final _title = TextEditingController();
  final _speaker = TextEditingController();
  final _scripture = TextEditingController();
  final _summary = TextEditingController();
  final _audioUrl = TextEditingController();
  final _videoUrl = TextEditingController();
  List<Map<String, dynamic>> _series = [];
  String? _seriesId;
  DateTime? _preachedAt;
  bool _isPublished = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSeries();
  }

  Future<void> _loadSeries() async {
    final branchId = await resolveBranchId(context);
    if (branchId == null) return;
    try {
      final items = await context.read<ChmsRepository>().fetchSermonSeries(branchId: branchId);
      if (mounted) setState(() => _series = items);
    } catch (_) {}
  }

  @override
  void dispose() {
    _title.dispose();
    _speaker.dispose();
    _scripture.dispose();
    _summary.dispose();
    _audioUrl.dispose();
    _videoUrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _preachedAt ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2030),
    );
    if (date != null) setState(() => _preachedAt = date);
  }

  Future<void> _save() async {
    if (_title.text.trim().length < 2) {
      setState(() => _error = 'Title is required');
      return;
    }
    final branchId = await resolveBranchId(context);
    if (branchId == null) {
      setState(() => _error = 'No branch available');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      await context.read<ChmsRepository>().createSermon({
        'branchId': branchId,
        'title': _title.text.trim(),
        if (_speaker.text.trim().isNotEmpty) 'speaker': _speaker.text.trim(),
        if (_seriesId != null) 'seriesId': _seriesId,
        if (_scripture.text.trim().isNotEmpty) 'scripture': _scripture.text.trim(),
        if (_summary.text.trim().isNotEmpty) 'summary': _summary.text.trim(),
        if (_audioUrl.text.trim().isNotEmpty) 'audioUrl': _audioUrl.text.trim(),
        if (_videoUrl.text.trim().isNotEmpty) 'videoUrl': _videoUrl.text.trim(),
        if (_preachedAt != null) 'preachedAt': _preachedAt!.toUtc().toIso8601String(),
        'isPublished': _isPublished,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sermon created'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return FormScaffold(
      title: 'New sermon',
      saving: _saving,
      saveLabel: 'Create sermon',
      onSave: _save,
      child: Column(
        children: [
          TextField(controller: _title, decoration: const InputDecoration(labelText: 'Title *')),
          const SizedBox(height: 14),
          TextField(controller: _speaker, decoration: const InputDecoration(labelText: 'Speaker')),
          if (_series.isNotEmpty) ...[
            const SizedBox(height: 14),
            DropdownButtonFormField<String?>(
              initialValue: _seriesId,
              decoration: const InputDecoration(labelText: 'Sermon series'),
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('None')),
                ..._series.map((s) => DropdownMenuItem<String?>(
                      value: s['id'] as String,
                      child: Text(s['name'] as String? ?? 'Series'),
                    )),
              ],
              onChanged: (v) => setState(() => _seriesId = v),
            ),
          ],
          const SizedBox(height: 14),
          TextField(controller: _scripture, decoration: const InputDecoration(labelText: 'Scripture')),
          const SizedBox(height: 14),
          TextField(
            controller: _summary,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Summary', alignLabelWithHint: true),
          ),
          const SizedBox(height: 14),
          TextField(controller: _audioUrl, decoration: const InputDecoration(labelText: 'Audio URL')),
          const SizedBox(height: 14),
          TextField(controller: _videoUrl, decoration: const InputDecoration(labelText: 'Video URL')),
          const SizedBox(height: 14),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Preached date'),
            subtitle: Text(_preachedAt != null ? formatDate(_preachedAt!.toIso8601String()) : 'Not set'),
            trailing: const Icon(Icons.calendar_month_rounded),
            onTap: _pickDate,
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Published'),
            value: _isPublished,
            onChanged: (v) => setState(() => _isPublished = v),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

// ── Edit Outreach ──────────────────────────────────────────────────────────

class EditOutreachScreen extends StatefulWidget {
  const EditOutreachScreen({super.key, required this.outreachId});

  final String outreachId;

  @override
  State<EditOutreachScreen> createState() => _EditOutreachScreenState();
}

class _EditOutreachScreenState extends State<EditOutreachScreen> {
  final _title = TextEditingController();
  final _location = TextEditingController();
  final _state = TextEditingController();
  final _coordinator = TextEditingController();
  final _description = TextEditingController();
  final _peopleReached = TextEditingController();
  final _souls = TextEditingController();
  final _outcome = TextEditingController();
  List<Map<String, dynamic>> _types = [];
  String? _typeId;
  String _status = 'PLANNED';
  bool _loading = true;
  bool _saving = false;
  String? _error;

  static const _statuses = ['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _loadTypes(String? branchId) async {
    if (branchId == null) return;
    try {
      final types = await context.read<ChmsRepository>().fetchOutreachTypes(branchId: branchId);
      if (mounted) setState(() => _types = types);
    } catch (_) {}
  }

  @override
  void dispose() {
    _title.dispose();
    _location.dispose();
    _state.dispose();
    _coordinator.dispose();
    _description.dispose();
    _peopleReached.dispose();
    _souls.dispose();
    _outcome.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final o = await context.read<ChmsRepository>().fetchOutreach(widget.outreachId);
      if (!mounted) return;
      _title.text = o['title'] as String? ?? '';
      _location.text = o['location'] as String? ?? '';
      _state.text = o['state'] as String? ?? '';
      _coordinator.text = o['coordinator'] as String? ?? '';
      _description.text = o['description'] as String? ?? '';
      _peopleReached.text = '${o['peopleReached'] ?? ''}';
      _souls.text = '${o['souls'] ?? ''}';
      _outcome.text = o['outcome'] as String? ?? '';
      final type = o['type'] as Map<String, dynamic>?;
      setState(() {
        _status = o['status'] as String? ?? 'PLANNED';
        _typeId = o['typeId'] as String? ?? type?['id'] as String?;
        _loading = false;
      });
      await _loadTypes(o['branchId'] as String? ?? type?['branchId'] as String?);
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  Future<void> _save() async {
    if (_title.text.trim().length < 2) {
      setState(() => _error = 'Title is required');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      await context.read<ChmsRepository>().updateOutreach(widget.outreachId, {
        'title': _title.text.trim(),
        'status': _status,
        if (_typeId != null) 'typeId': _typeId,
        if (_location.text.trim().isNotEmpty) 'location': _location.text.trim(),
        if (_state.text.trim().isNotEmpty) 'state': _state.text.trim(),
        if (_coordinator.text.trim().isNotEmpty) 'coordinator': _coordinator.text.trim(),
        if (_description.text.trim().isNotEmpty) 'description': _description.text.trim(),
        'peopleReached': int.tryParse(_peopleReached.text.trim()) ?? 0,
        'souls': int.tryParse(_souls.text.trim()) ?? 0,
        if (_outcome.text.trim().isNotEmpty) 'outcome': _outcome.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Outreach updated'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return FormScaffold(
      title: 'Edit outreach',
      saving: _saving,
      saveLabel: 'Save changes',
      onSave: _save,
      child: Column(
        children: [
          TextField(controller: _title, decoration: const InputDecoration(labelText: 'Title *')),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _status,
            decoration: const InputDecoration(labelText: 'Status'),
            items: _statuses
                .map((s) => DropdownMenuItem(value: s, child: Text(s.replaceAll('_', ' '))))
                .toList(),
            onChanged: (v) => setState(() => _status = v ?? 'PLANNED'),
          ),
          if (_types.isNotEmpty) ...[
            const SizedBox(height: 14),
            DropdownButtonFormField<String?>(
              initialValue: _typeId,
              decoration: const InputDecoration(labelText: 'Outreach type'),
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('None')),
                ..._types.map((t) => DropdownMenuItem<String?>(
                      value: t['id'] as String,
                      child: Text(t['name'] as String? ?? 'Type'),
                    )),
              ],
              onChanged: (v) => setState(() => _typeId = v),
            ),
          ],
          const SizedBox(height: 14),
          TextField(controller: _location, decoration: const InputDecoration(labelText: 'Location')),
          const SizedBox(height: 14),
          TextField(controller: _state, decoration: const InputDecoration(labelText: 'State / region')),
          const SizedBox(height: 14),
          TextField(controller: _coordinator, decoration: const InputDecoration(labelText: 'Coordinator')),
          const SizedBox(height: 14),
          TextField(controller: _description, maxLines: 2, decoration: const InputDecoration(labelText: 'Description')),
          const SizedBox(height: 14),
          TextField(
            controller: _peopleReached,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'People reached'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _souls,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Souls won'),
          ),
          const SizedBox(height: 14),
          TextField(controller: _outcome, maxLines: 2, decoration: const InputDecoration(labelText: 'Outcome')),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

// ── Edit Sermon ────────────────────────────────────────────────────────────

class EditSermonScreen extends StatefulWidget {
  const EditSermonScreen({super.key, required this.sermonId});

  final String sermonId;

  @override
  State<EditSermonScreen> createState() => _EditSermonScreenState();
}

class _EditSermonScreenState extends State<EditSermonScreen> {
  final _title = TextEditingController();
  final _speaker = TextEditingController();
  final _scripture = TextEditingController();
  final _summary = TextEditingController();
  final _audioUrl = TextEditingController();
  final _videoUrl = TextEditingController();
  List<Map<String, dynamic>> _series = [];
  String? _seriesId;
  DateTime? _preachedAt;
  bool _isPublished = true;
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _title.dispose();
    _speaker.dispose();
    _scripture.dispose();
    _summary.dispose();
    _audioUrl.dispose();
    _videoUrl.dispose();
    super.dispose();
  }

  Future<void> _loadSeries(String? branchId) async {
    if (branchId == null) return;
    try {
      final items = await context.read<ChmsRepository>().fetchSermonSeries(branchId: branchId);
      if (mounted) setState(() => _series = items);
    } catch (_) {}
  }

  Future<void> _load() async {
    try {
      final s = await context.read<ChmsRepository>().fetchSermon(widget.sermonId);
      if (!mounted) return;
      _title.text = s['title'] as String? ?? '';
      _speaker.text = s['speaker'] as String? ?? '';
      _scripture.text = s['scripture'] as String? ?? '';
      _summary.text = s['summary'] as String? ?? '';
      _audioUrl.text = s['audioUrl'] as String? ?? '';
      _videoUrl.text = s['videoUrl'] as String? ?? '';
      final preached = s['preachedAt'] as String?;
      final series = s['sermonSeries'] as Map<String, dynamic>?;
      setState(() {
        _preachedAt = preached != null ? DateTime.tryParse(preached) : null;
        _seriesId = s['seriesId'] as String? ?? series?['id'] as String?;
        _isPublished = s['isPublished'] as bool? ?? true;
        _loading = false;
      });
      final branch = s['branch'] as Map<String, dynamic>?;
      await _loadSeries(s['branchId'] as String? ?? branch?['id'] as String?);
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  Future<void> _pickDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _preachedAt ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2030),
    );
    if (date != null) setState(() => _preachedAt = date);
  }

  Future<void> _save() async {
    if (_title.text.trim().length < 2) {
      setState(() => _error = 'Title is required');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      await context.read<ChmsRepository>().updateSermon(widget.sermonId, {
        'title': _title.text.trim(),
        'speaker': _speaker.text.trim(),
        'scripture': _scripture.text.trim(),
        'summary': _summary.text.trim(),
        'audioUrl': _audioUrl.text.trim(),
        'videoUrl': _videoUrl.text.trim(),
        if (_seriesId != null) 'seriesId': _seriesId,
        if (_preachedAt != null) 'preachedAt': _preachedAt!.toUtc().toIso8601String(),
        'isPublished': _isPublished,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sermon updated'), behavior: SnackBarBehavior.floating),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return FormScaffold(
      title: 'Edit sermon',
      saving: _saving,
      saveLabel: 'Save changes',
      onSave: _save,
      child: Column(
        children: [
          TextField(controller: _title, decoration: const InputDecoration(labelText: 'Title *')),
          const SizedBox(height: 14),
          TextField(controller: _speaker, decoration: const InputDecoration(labelText: 'Speaker')),
          if (_series.isNotEmpty) ...[
            const SizedBox(height: 14),
            DropdownButtonFormField<String?>(
              initialValue: _seriesId,
              decoration: const InputDecoration(labelText: 'Sermon series'),
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('None')),
                ..._series.map((s) => DropdownMenuItem<String?>(
                      value: s['id'] as String,
                      child: Text(s['name'] as String? ?? 'Series'),
                    )),
              ],
              onChanged: (v) => setState(() => _seriesId = v),
            ),
          ],
          const SizedBox(height: 14),
          TextField(controller: _scripture, decoration: const InputDecoration(labelText: 'Scripture')),
          const SizedBox(height: 14),
          TextField(
            controller: _summary,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Summary', alignLabelWithHint: true),
          ),
          const SizedBox(height: 14),
          TextField(controller: _audioUrl, decoration: const InputDecoration(labelText: 'Audio URL')),
          const SizedBox(height: 14),
          TextField(controller: _videoUrl, decoration: const InputDecoration(labelText: 'Video URL')),
          const SizedBox(height: 14),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Preached date'),
            subtitle: Text(_preachedAt != null ? formatDate(_preachedAt!.toIso8601String()) : 'Not set'),
            trailing: const Icon(Icons.calendar_month_rounded),
            onTap: _pickDate,
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Published'),
            value: _isPublished,
            onChanged: (v) => setState(() => _isPublished = v),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppColors.rose, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}
