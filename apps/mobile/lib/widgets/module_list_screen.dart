import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_colors.dart';
import 'ui_components.dart';

typedef ItemBuilder = Widget Function(BuildContext context, Map<String, dynamic> item);

typedef ModulePageResult = ({List<Map<String, dynamic>> items, int totalPages});
typedef ModuleLoadPage = Future<ModulePageResult> Function(int page, String? search);

class ModuleListScreen extends StatefulWidget {
  const ModuleListScreen({
    super.key,
    required this.title,
    required this.subtitle,
    required this.loadPage,
    required this.itemBuilder,
    this.searchHint = 'Search…',
    this.emptyMessage = 'Nothing found.',
    this.headerColor = AppColors.indigo,
    this.enableSearch = true,
    this.onItemTap,
    this.floatingAction,
    this.refreshTrigger = 0,
  });

  final String title;
  final String subtitle;
  final String searchHint;
  final String emptyMessage;
  final Color headerColor;
  final bool enableSearch;
  final ModuleLoadPage loadPage;
  final ItemBuilder itemBuilder;
  final void Function(Map<String, dynamic> item)? onItemTap;
  final Widget? floatingAction;
  final int refreshTrigger;

  @override
  State<ModuleListScreen> createState() => _ModuleListScreenState();
}

class _ModuleListScreenState extends State<ModuleListScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  Timer? _debounce;

  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  bool _loadingMore = false;
  String? _error;
  int _page = 1;
  int _totalPages = 1;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _searchController.addListener(() {
      if (mounted) setState(() {});
    });
    _load(reset: true);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant ModuleListScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.refreshTrigger != oldWidget.refreshTrigger) {
      _load(reset: true);
    }
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      _loadMore();
    }
  }

  Future<void> _load({bool reset = false}) async {
    if (reset) {
      setState(() {
        _loading = true;
        _error = null;
        _page = 1;
      });
    }
    try {
      final result = await widget.loadPage(_page, _search.isEmpty ? null : _search);
      if (!mounted) return;
      setState(() {
        _items = result.items;
        _totalPages = result.totalPages;
        _loading = false;
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
        _loadingMore = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || _loading || _page >= _totalPages) return;
    setState(() => _loadingMore = true);
    final nextPage = _page + 1;
    try {
      final result = await widget.loadPage(nextPage, _search.isEmpty ? null : _search);
      if (!mounted) return;
      setState(() {
        _page = nextPage;
        _items = [..._items, ...result.items];
        _totalPages = result.totalPages;
        _loadingMore = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  void _applySearch() {
    _debounce?.cancel();
    _search = _searchController.text.trim();
    _load(reset: true);
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      _search = value.trim();
      _load(reset: true);
    });
  }

  void _clearSearch() {
    _searchController.clear();
    _applySearch();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      floatingActionButton: widget.floatingAction,
      body: Column(
        children: [
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  widget.headerColor,
                  Color.lerp(widget.headerColor, AppColors.navy, 0.35)!,
                ],
              ),
            ),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 4, 16, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        IconButton(
                          onPressed: () => context.pop(),
                          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.title,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Text(
                                widget.subtitle,
                                style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    if (widget.enableSearch) ...[
                      const SizedBox(height: 12),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: TextField(
                          controller: _searchController,
                          onChanged: _onSearchChanged,
                          onSubmitted: (_) => _applySearch(),
                          decoration: InputDecoration(
                            hintText: widget.searchHint,
                            prefixIcon: Icon(Icons.search_rounded, color: widget.headerColor),
                            suffixIcon: _searchController.text.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear_rounded),
                                    onPressed: _clearSearch,
                                  )
                                : IconButton(
                                    icon: const Icon(Icons.arrow_forward_rounded),
                                    onPressed: _applySearch,
                                  ),
                            filled: true,
                            fillColor: Colors.white,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide.none,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: _loading
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
                              GradientButton(label: 'Retry', onPressed: () => _load(reset: true)),
                            ],
                          ),
                        ),
                      )
                    : _items.isEmpty
                        ? Center(
                            child: Text(
                              widget.emptyMessage,
                              style: TextStyle(color: Colors.grey.shade600),
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () => _load(reset: true),
                            child: ListView.separated(
                              controller: _scrollController,
                              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                              itemCount: _items.length + (_loadingMore ? 1 : 0),
                              separatorBuilder: (_, __) => const SizedBox(height: 10),
                              itemBuilder: (context, i) {
                                if (i >= _items.length) {
                                  return const Center(
                                    child: Padding(
                                      padding: EdgeInsets.all(16),
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    ),
                                  );
                                }
                                final item = _items[i];
                                final tile = widget.itemBuilder(context, item);
                                if (widget.onItemTap == null) return tile;
                                return InkWell(
                                  onTap: () => widget.onItemTap!(item),
                                  borderRadius: BorderRadius.circular(20),
                                  child: tile,
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

String _fullName(Map<String, dynamic> m) {
  final first = m['firstName'] as String? ?? '';
  final last = m['lastName'] as String? ?? '';
  return '$first $last'.trim();
}

String _initials(String name) {
  final parts = name.split(' ').where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  if (parts.length == 1) return parts[0][0].toUpperCase();
  return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
}

Widget memberListTile(Map<String, dynamic> m, Color color) {
  final name = _fullName(m);
  final subtitle = m['email'] as String? ??
      m['phone'] as String? ??
      m['membershipNumber'] as String? ??
      m['status'] as String? ??
      '';
  return _ColorfulListCard(
    accent: color,
    child: Row(
      children: [
        CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.15),
          child: Text(_initials(name), style: TextStyle(color: color, fontWeight: FontWeight.w700)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
              Text(
                subtitle,
                style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
              ),
            ],
          ),
        ),
        Icon(Icons.chevron_right, color: Colors.grey.shade400),
      ],
    ),
  );
}

Widget simpleListTile({
  required String title,
  required String subtitle,
  required IconData icon,
  required Color color,
}) {
  return _ColorfulListCard(
    accent: color,
    child: Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [color, color.withValues(alpha: 0.7)],
            ),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: Colors.white),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
              Text(subtitle, style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
            ],
          ),
        ),
        Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400, size: 20),
      ],
    ),
  );
}

class _ColorfulListCard extends StatelessWidget {
  const _ColorfulListCard({required this.accent, required this.child});

  final Color accent;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: EdgeInsets.zero,
      child: Row(
        children: [
          Container(
            width: 5,
            height: 72,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [accent, accent.withValues(alpha: 0.5)],
              ),
              borderRadius: const BorderRadius.horizontal(left: Radius.circular(20)),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: child,
            ),
          ),
        ],
      ),
    );
  }
}

String formatMoney(dynamic value) {
  if (value == null) return '—';
  final n = value is num ? value.toDouble() : double.tryParse('$value') ?? 0;
  if (n >= 1000000) return '₦${(n / 1000000).toStringAsFixed(1)}M';
  if (n >= 1000) return '₦${(n / 1000).toStringAsFixed(0)}K';
  return '₦${n.toStringAsFixed(0)}';
}

String formatDate(String? iso) {
  if (iso == null) return '—';
  final d = DateTime.tryParse(iso);
  if (d == null) return iso;
  return '${d.day}/${d.month}/${d.year}';
}
