import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/data/chms_repository.dart';
import '../core/theme/app_colors.dart';
import 'module_list_screen.dart';

/// Search and select multiple members. Returns selected member maps on confirm.
Future<List<Map<String, dynamic>>?> showMultiMemberPicker(
  BuildContext context, {
  List<Map<String, dynamic>> initial = const [],
}) {
  return showModalBottomSheet<List<Map<String, dynamic>>>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _MultiMemberPickerSheet(initial: initial),
  );
}

class _MultiMemberPickerSheet extends StatefulWidget {
  const _MultiMemberPickerSheet({required this.initial});

  final List<Map<String, dynamic>> initial;

  @override
  State<_MultiMemberPickerSheet> createState() => _MultiMemberPickerSheetState();
}

class _MultiMemberPickerSheetState extends State<_MultiMemberPickerSheet> {
  final _search = TextEditingController();
  Timer? _debounce;
  List<Map<String, dynamic>> _results = [];
  late List<Map<String, dynamic>> _selected;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _selected = widget.initial.map((m) => Map<String, dynamic>.from(m)).toList();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  String _id(Map<String, dynamic> m) => m['id'] as String;

  String _name(Map<String, dynamic> m) {
    final first = m['firstName'] as String? ?? '';
    final last = m['lastName'] as String? ?? '';
    return '$first $last'.trim();
  }

  bool _isSelected(Map<String, dynamic> m) => _selected.any((s) => _id(s) == _id(m));

  void _toggle(Map<String, dynamic> m) {
    setState(() {
      if (_isSelected(m)) {
        _selected.removeWhere((s) => _id(s) == _id(m));
      } else {
        _selected.add(m);
      }
    });
  }

  Future<void> _query(String q) async {
    if (q.trim().length < 2) {
      setState(() => _results = []);
      return;
    }
    setState(() => _loading = true);
    try {
      final res = await context.read<ChmsRepository>().fetchMembers(page: 1, search: q.trim());
      if (!mounted) return;
      setState(() {
        _results = res.data;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () => _query(value));
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scroll) {
        return Container(
          decoration: const BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Roll call (${_selected.length})',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(_selected),
                      child: const Text('Done'),
                    ),
                  ],
                ),
              ),
              if (_selected.isNotEmpty)
                SizedBox(
                  height: 44,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _selected.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) {
                      final m = _selected[i];
                      return InputChip(
                        label: Text(_name(m)),
                        onDeleted: () => setState(() => _selected.removeAt(i)),
                      );
                    },
                  ),
                ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: TextField(
                  controller: _search,
                  autofocus: true,
                  onChanged: _onChanged,
                  decoration: InputDecoration(
                    hintText: 'Search members to mark present…',
                    prefixIcon: const Icon(Icons.search_rounded),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : _results.isEmpty
                        ? Center(
                            child: Text(
                              _search.text.length < 2 ? 'Search to find members' : 'No results',
                              style: TextStyle(color: Colors.grey.shade600),
                            ),
                          )
                        : ListView.separated(
                            controller: scroll,
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                            itemCount: _results.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (_, i) {
                              final m = _results[i];
                              final selected = _isSelected(m);
                              return InkWell(
                                onTap: () => _toggle(m),
                                borderRadius: BorderRadius.circular(16),
                                child: memberListTile(m, selected ? AppColors.emerald : AppColors.indigo),
                              );
                            },
                          ),
              ),
            ],
          ),
        );
      },
    );
  }
}
