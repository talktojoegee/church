class OverviewSnapshot {
  const OverviewSnapshot({
    required this.data,
    this.fromCache = false,
    this.cachedAt,
  });

  final Map<String, dynamic> data;
  final bool fromCache;
  final DateTime? cachedAt;
}
