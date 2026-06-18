class Paginated<T> {
  const Paginated({
    required this.data,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.totalPages,
  });

  final List<T> data;
  final int total;
  final int page;
  final int pageSize;
  final int totalPages;

  factory Paginated.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromMap,
  ) {
    return Paginated(
      data: (json['data'] as List<dynamic>? ?? [])
          .map((e) => fromMap(Map<String, dynamic>.from(e as Map)))
          .toList(),
      total: json['total'] as int? ?? 0,
      page: json['page'] as int? ?? 1,
      pageSize: json['pageSize'] as int? ?? 20,
      totalPages: json['totalPages'] as int? ?? 1,
    );
  }
}
