import 'package:dio/dio.dart';

import '../api/api_client.dart';
import '../storage/cache_store.dart';
import '../../models/paginated.dart';

class ChmsRepository {
  ChmsRepository(this._api, this._cache);

  final ApiClient _api;
  final CacheStore _cache;

  // ── Members ──────────────────────────────────────────────────────────────

  Future<Paginated<Map<String, dynamic>>> fetchMembers({
    int page = 1,
    String? search,
  }) async {
    try {
      final res = await _paginated('/members', page: page, search: search);
      if (page == 1 && (search == null || search.isEmpty)) {
        await _cache.saveMembers(res.data);
      }
      return res;
    } on ApiException {
      if (page == 1 && (search == null || search.isEmpty)) {
        final cached = await _cache.readMembers(allowExpired: true);
        if (cached != null) {
          final items = (cached.data['items'] as List)
              .map((e) => Map<String, dynamic>.from(e as Map))
              .toList();
          return Paginated(
            data: items,
            total: items.length,
            page: 1,
            pageSize: items.length,
            totalPages: 1,
          );
        }
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchMember(String id) => _getOne('/members/$id');

  Future<Map<String, dynamic>> updateMember(String id, Map<String, dynamic> body) =>
      _patch('/members/$id', body);

  Future<Map<String, dynamic>> createMember(Map<String, dynamic> body) =>
      _post('/members', body);

  // ── Events ───────────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> fetchEventsList({String? search}) =>
      _getList('/events', query: {if (search != null && search.isNotEmpty) 'search': search});

  Future<Map<String, dynamic>> fetchEvent(String id) => _getOne('/events/$id');

  Future<Map<String, dynamic>> createEvent(Map<String, dynamic> body) =>
      _post('/events', body);

  Future<Map<String, dynamic>> updateEvent(String id, Map<String, dynamic> body) =>
      _patch('/events/$id', body);

  Future<Map<String, dynamic>> registerEvent(String eventId, Map<String, dynamic> body) =>
      _post('/events/$eventId/register', body);

  Future<Map<String, dynamic>> toggleRegistrationAttended(String regId) =>
      _patch('/events/registrations/$regId/attended', {});

  Future<void> removeRegistration(String regId) async {
    try {
      await _api.delete('/events/registrations/$regId');
    } on DioException catch (e) {
      throw ApiException(_api.extractErrorMessage(e), statusCode: e.response?.statusCode);
    }
  }

  // ── Groups ───────────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> fetchGroupsList({String? branchId}) =>
      _getList('/groups', query: {if (branchId != null) 'branchId': branchId});

  Future<Map<String, dynamic>> fetchGroup(String id) => _getOne('/groups/$id');

  Future<Map<String, dynamic>> createGroup(Map<String, dynamic> body) =>
      _post('/groups', body);

  Future<Map<String, dynamic>> logGroupMeeting(String groupId, Map<String, dynamic> body) =>
      _post('/groups/$groupId/meetings', body);

  Future<Map<String, dynamic>> addGroupMember(String groupId, String memberId) =>
      _post('/groups/$groupId/members/$memberId', {});

  Future<void> removeGroupMember(String groupId, String memberId) async {
    try {
      await _api.delete('/groups/$groupId/members/$memberId');
    } on DioException catch (e) {
      throw ApiException(_api.extractErrorMessage(e), statusCode: e.response?.statusCode);
    }
  }

  // ── Attendance ───────────────────────────────────────────────────────────

  Future<Paginated<Map<String, dynamic>>> fetchAttendance({
    int page = 1,
    String? search,
  }) =>
      _paginated('/attendance', page: page, search: search);

  Future<Map<String, dynamic>> fetchAttendanceSession(String id) =>
      _getOne('/attendance/$id');

  Future<Map<String, dynamic>> createAttendanceSession(Map<String, dynamic> body) =>
      _post('/attendance', body);

  Future<Map<String, dynamic>> updateAttendanceSession(String id, Map<String, dynamic> body) =>
      _patch('/attendance/$id', body);

  // ── Finance ──────────────────────────────────────────────────────────────

  Future<Paginated<Map<String, dynamic>>> fetchContributions({int page = 1, String? search}) =>
      _paginated('/finance/contributions', page: page, search: search);

  Future<Paginated<Map<String, dynamic>>> fetchExpenses({int page = 1, String? search}) =>
      _paginated('/finance/expenses', page: page, search: search);

  Future<Map<String, dynamic>> fetchFinanceSummary() => _getOne('/finance/summary');

  Future<List<Map<String, dynamic>>> fetchGivingTypes({String? branchId}) =>
      _getList('/finance/giving-types', query: {if (branchId != null) 'branchId': branchId});

  Future<List<Map<String, dynamic>>> fetchExpenseCategories({String? branchId}) =>
      _getList('/finance/expense-categories', query: {if (branchId != null) 'branchId': branchId});

  Future<Map<String, dynamic>> createContribution(Map<String, dynamic> body) =>
      _post('/finance/contributions', body);

  Future<Map<String, dynamic>> createExpense(Map<String, dynamic> body) =>
      _post('/finance/expenses', body);

  // ── Follow-ups ───────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> fetchFollowUpsList({String? status, String? branchId}) =>
      _getList('/follow-ups', query: {
        if (status != null) 'status': status,
        if (branchId != null) 'branchId': branchId,
      });

  Future<Map<String, dynamic>> fetchFollowUp(String id) => _getOne('/follow-ups/legacy/$id');

  Future<Map<String, dynamic>> createFollowUp(Map<String, dynamic> body) =>
      _post('/follow-ups', body);

  Future<Map<String, dynamic>> updateFollowUp(String id, Map<String, dynamic> body) =>
      _patch('/follow-ups/legacy/$id', body);

  // ── Branches ─────────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> fetchBranches() => _getList('/branches');

  Future<Map<String, dynamic>> fetchBranch(String id) => _getOne('/branches/$id');

  Future<Map<String, dynamic>> fetchBranchDetails(String id) => _getOne('/branches/$id/details');

  // ── Testimonies ──────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> fetchTestimoniesList({String? search}) =>
      _getList('/testimonies', query: {if (search != null && search.isNotEmpty) 'search': search});

  Future<Map<String, dynamic>> fetchTestimony(String id) => _getOne('/testimonies/$id');

  Future<Map<String, dynamic>> createTestimony(Map<String, dynamic> body) =>
      _post('/testimonies', body);

  Future<Map<String, dynamic>> reviewTestimony(String id, {required String status}) =>
      _patch('/testimonies/$id/review', {'status': status});

  // ── Sermons & Outreach ─────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> fetchSermonsList({String? search}) =>
      _getList('/sermons', query: {if (search != null && search.isNotEmpty) 'search': search});

  Future<Map<String, dynamic>> fetchSermon(String id) => _getOne('/sermons/$id');

  Future<Map<String, dynamic>> createSermon(Map<String, dynamic> body) =>
      _post('/sermons', body);

  Future<Map<String, dynamic>> updateSermon(String id, Map<String, dynamic> body) =>
      _patch('/sermons/$id', body);

  Future<List<Map<String, dynamic>>> fetchSermonSeries({String? branchId}) =>
      _getList('/sermon-series', query: {if (branchId != null) 'branchId': branchId});

  Future<List<Map<String, dynamic>>> fetchOutreachTypes({String? branchId}) =>
      _getList('/outreach-types', query: {if (branchId != null) 'branchId': branchId});

  Future<List<Map<String, dynamic>>> fetchOutreachesList({String? search}) =>
      _getList('/outreaches', query: {if (search != null && search.isNotEmpty) 'search': search});

  Future<Map<String, dynamic>> fetchOutreach(String id) => _getOne('/outreaches/$id');

  Future<Map<String, dynamic>> createOutreach(Map<String, dynamic> body) =>
      _post('/outreaches', body);

  Future<Map<String, dynamic>> updateOutreach(String id, Map<String, dynamic> body) =>
      _patch('/outreaches/$id', body);

  Future<Map<String, dynamic>> addOutreachImage(String outreachId, Map<String, dynamic> body) =>
      _post('/outreaches/$outreachId/images', body);

  Future<void> removeOutreachImage(String outreachId, String imageId) async {
    try {
      await _api.delete('/outreaches/$outreachId/images/$imageId');
    } on DioException catch (e) {
      throw ApiException(_api.extractErrorMessage(e), statusCode: e.response?.statusCode);
    }
  }

  Future<Map<String, dynamic>> uploadFile(String filePath, {String? filename}) =>
      _api.uploadFile(filePath, filename: filename);

  // ── Audit ──────────────────────────────────────────────────────────────────

  Future<Paginated<Map<String, dynamic>>> fetchAuditLogs({
    int page = 1,
    String? search,
  }) =>
      _paginated('/audit', page: page, search: search);

  // ── Notifications ────────────────────────────────────────────────────────

  Future<Paginated<Map<String, dynamic>>> fetchNotifications({
    int page = 1,
    bool unreadOnly = false,
  }) async {
    try {
      final res = await _api.get<dynamic>(
        '/notifications',
        queryParameters: {
          'page': page,
          'pageSize': 20,
          if (unreadOnly) 'unreadOnly': true,
        },
      );
      final data = res.data;
      if (data is Map<String, dynamic>) {
        return Paginated.fromJson(data, (m) => m);
      }
      return const Paginated(data: [], total: 0, page: 1, pageSize: 20, totalPages: 1);
    } on DioException catch (e) {
      throw ApiException(_api.extractErrorMessage(e), statusCode: e.response?.statusCode);
    }
  }

  Future<int> fetchUnreadNotificationCount() async {
    final res = await _getOne('/notifications/unread-count');
    return res['count'] as int? ?? 0;
  }

  Future<void> markNotificationRead(String id) async {
    await _patch('/notifications/$id/read', {});
  }

  Future<void> markAllNotificationsRead() async {
    await _patch('/notifications/read-all', {});
  }

  Future<void> registerDeviceToken(String token, String platform) async {
    await _post('/notifications/device-tokens', {'token': token, 'platform': platform});
  }

  Future<void> unregisterDeviceToken(String token) async {
    try {
      await _api.delete('/notifications/device-tokens', data: {'token': token});
    } on DioException catch (e) {
      throw ApiException(_api.extractErrorMessage(e), statusCode: e.response?.statusCode);
    }
  }

  // ── HTTP helpers ─────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> _getOne(String path) async {
    try {
      final res = await _api.get<Map<String, dynamic>>(path);
      return res.data ?? {};
    } on DioException catch (e) {
      throw ApiException(_api.extractErrorMessage(e), statusCode: e.response?.statusCode);
    }
  }

  Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body) async {
    try {
      final res = await _api.post<Map<String, dynamic>>(path, data: body);
      return res.data ?? {};
    } on DioException catch (e) {
      throw ApiException(_api.extractErrorMessage(e), statusCode: e.response?.statusCode);
    }
  }

  Future<Map<String, dynamic>> _patch(String path, Map<String, dynamic> body) async {
    try {
      final res = await _api.patch<Map<String, dynamic>>(path, data: body);
      return res.data ?? {};
    } on DioException catch (e) {
      throw ApiException(_api.extractErrorMessage(e), statusCode: e.response?.statusCode);
    }
  }

  Future<List<Map<String, dynamic>>> _getList(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    try {
      final res = await _api.get<dynamic>(path, queryParameters: query);
      final data = res.data;
      if (data is List) {
        return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      if (data is Map<String, dynamic> && data['data'] is List) {
        return (data['data'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException(_api.extractErrorMessage(e), statusCode: e.response?.statusCode);
    }
  }

  Future<Paginated<Map<String, dynamic>>> _paginated(
    String path, {
    int page = 1,
    String? search,
  }) async {
    try {
      final res = await _api.get<dynamic>(
        path,
        queryParameters: {
          'page': page,
          'pageSize': 20,
          if (search != null && search.isNotEmpty) 'search': search,
        },
      );
      final data = res.data;
      if (data is Map<String, dynamic>) {
        return Paginated.fromJson(data, (m) => m);
      }
      if (data is List) {
        final items = data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        return Paginated(
          data: items,
          total: items.length,
          page: 1,
          pageSize: items.length,
          totalPages: 1,
        );
      }
      return const Paginated(data: [], total: 0, page: 1, pageSize: 20, totalPages: 1);
    } on DioException catch (e) {
      throw ApiException(_api.extractErrorMessage(e), statusCode: e.response?.statusCode);
    }
  }
}
