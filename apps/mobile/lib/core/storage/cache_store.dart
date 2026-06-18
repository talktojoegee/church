import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class CachedEntry {
  const CachedEntry({required this.data, required this.savedAt});

  final Map<String, dynamic> data;
  final DateTime savedAt;
}

/// Lightweight JSON cache for dashboard data when offline.
class CacheStore {
  static const _overviewKey = 'cache_overview_v1';
  static const overviewTtl = Duration(hours: 6);

  Future<void> saveOverview(Map<String, dynamic> data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_overviewKey, jsonEncode({
      'savedAt': DateTime.now().toIso8601String(),
      'data': data,
    }));
  }

  Future<CachedEntry?> readOverview({bool allowExpired = false}) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_overviewKey);
    if (raw == null) return null;
    try {
      final parsed = jsonDecode(raw) as Map<String, dynamic>;
      final savedAt = DateTime.parse(parsed['savedAt'] as String);
      if (!allowExpired && DateTime.now().difference(savedAt) > overviewTtl) {
        return null;
      }
      final data = Map<String, dynamic>.from(parsed['data'] as Map);
      return CachedEntry(data: data, savedAt: savedAt);
    } catch (_) {
      return null;
    }
  }

  Future<void> clearOverview() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_overviewKey);
  }

  static const _membersKey = 'cache_members_v1';
  static const _brandingKey = 'cache_branding_v1';
  static const brandingTtl = Duration(hours: 24);

  Future<void> saveMembers(List<Map<String, dynamic>> members) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_membersKey, jsonEncode({
      'savedAt': DateTime.now().toIso8601String(),
      'data': members,
    }));
  }

  Future<CachedEntry?> readMembers({bool allowExpired = false}) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_membersKey);
    if (raw == null) return null;
    try {
      final parsed = jsonDecode(raw) as Map<String, dynamic>;
      final savedAt = DateTime.parse(parsed['savedAt'] as String);
      if (!allowExpired && DateTime.now().difference(savedAt) > overviewTtl) {
        return null;
      }
      final list = (parsed['data'] as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      return CachedEntry(data: {'items': list}, savedAt: savedAt);
    } catch (_) {
      return null;
    }
  }

  Future<void> saveBranding(Map<String, dynamic> data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_brandingKey, jsonEncode({
      'savedAt': DateTime.now().toIso8601String(),
      'data': data,
    }));
  }

  Future<CachedEntry?> readBranding({bool allowExpired = false}) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_brandingKey);
    if (raw == null) return null;
    try {
      final parsed = jsonDecode(raw) as Map<String, dynamic>;
      final savedAt = DateTime.parse(parsed['savedAt'] as String);
      if (!allowExpired && DateTime.now().difference(savedAt) > brandingTtl) {
        return null;
      }
      final data = Map<String, dynamic>.from(parsed['data'] as Map);
      return CachedEntry(data: data, savedAt: savedAt);
    } catch (_) {
      return null;
    }
  }
}
