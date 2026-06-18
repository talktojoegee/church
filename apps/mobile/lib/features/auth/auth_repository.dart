import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/storage/cache_store.dart';
import '../../models/auth_user.dart';
import '../../models/overview_snapshot.dart';

class AuthRepository {
  AuthRepository(this._api, this._cache);

  final ApiClient _api;
  final CacheStore _cache;

  Future<LoginResponse> login(String email, String password) async {
    try {
      final response = await _api.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'email': email.trim(), 'password': password},
      );
      final login = LoginResponse.fromJson(response.data!);
      await _api.writeAccessToken(login.accessToken);
      return login;
    } on DioException catch (e) {
      throw ApiException(
        _api.extractErrorMessage(e),
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<AuthUser?> restoreSession() async {
    try {
      return await _restoreSessionInner().timeout(
        const Duration(seconds: 10),
        onTimeout: () => null,
      );
    } catch (_) {
      return null;
    }
  }

  Future<AuthUser?> _restoreSessionInner() async {
    final token = await _api.readAccessToken();
    if (token == null || token.isEmpty) {
      try {
        final refresh = await _api.post<Map<String, dynamic>>('/auth/refresh');
        final newToken = refresh.data?['accessToken'] as String?;
        if (newToken == null) return null;
        await _api.writeAccessToken(newToken);
      } catch (_) {
        return null;
      }
    }

    try {
      final response = await _api.get<Map<String, dynamic>>('/auth/me');
      return AuthUser.fromJson(response.data!);
    } on DioException {
      return null;
    }
  }

  Future<void> logout() async {
    try {
      await _api.post('/auth/logout');
    } finally {
      await _api.clearSession();
      await _cache.clearOverview();
    }
  }

  Future<UserProfile> fetchProfile() async {
    try {
      final response = await _api.get<Map<String, dynamic>>('/auth/me/profile');
      return UserProfile.fromJson(response.data!);
    } on DioException catch (e) {
      throw ApiException(
        _api.extractErrorMessage(e),
        statusCode: e.response?.statusCode,
      );
    }
  }

  /// Build a minimal profile from session user when the profile endpoint fails.
  UserProfile profileFromSession(AuthUser user) {
    return UserProfile(
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map((name) => {'name': name}).toList(),
    );
  }

  Future<AuthUser> updateProfile({
    required String firstName,
    required String lastName,
    String? phone,
    String? avatarUrl,
  }) async {
    try {
      final response = await _api.patch<Map<String, dynamic>>(
        '/auth/me',
        data: {
          'firstName': firstName,
          'lastName': lastName,
          if (phone != null) 'phone': phone,
          if (avatarUrl != null) 'avatarUrl': avatarUrl,
        },
      );
      return AuthUser.fromJson(response.data!);
    } on DioException catch (e) {
      throw ApiException(
        _api.extractErrorMessage(e),
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await _api.patch(
        '/auth/me/password',
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
    } on DioException catch (e) {
      throw ApiException(
        _api.extractErrorMessage(e),
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<OverviewSnapshot> fetchOverview() async {
    try {
      final response = await _api.get<Map<String, dynamic>>('/reports/overview');
      final data = response.data ?? {};
      await _cache.saveOverview(data);
      return OverviewSnapshot(data: data);
    } on DioException catch (e) {
      final cached = await _cache.readOverview(allowExpired: true);
      if (cached != null) {
        return OverviewSnapshot(
          data: cached.data,
          fromCache: true,
          cachedAt: cached.savedAt,
        );
      }
      throw ApiException(
        _api.extractErrorMessage(e),
        statusCode: e.response?.statusCode,
      );
    }
  }
}
