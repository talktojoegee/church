import 'package:flutter/foundation.dart';

import '../../models/church_branding.dart';
import '../api/api_client.dart';
import '../storage/cache_store.dart';

class BrandingController extends ChangeNotifier {
  BrandingController(this._api, this._cache);

  final ApiClient _api;
  final CacheStore _cache;

  ChurchBranding _branding = ChurchBranding.fallback;
  bool _loading = false;

  ChurchBranding get branding => _branding;
  bool get loading => _loading;
  String get displayName => _branding.displayName;

  Future<void>? _bootstrapFuture;

  Future<void> bootstrap() {
    return _bootstrapFuture ??= _doBootstrap();
  }

  Future<void> _doBootstrap() async {
    final cached = await _cache.readBranding(allowExpired: true);
    if (cached != null) {
      _branding = ChurchBranding.fromJson(cached.data);
      notifyListeners();
    }
    await refresh();
  }

  Future<void> refresh() async {
    if (_loading) return;
    _loading = true;
    notifyListeners();
    try {
      final response = await _api
          .get<Map<String, dynamic>>('/settings/public')
          .timeout(const Duration(seconds: 8));
      final data = response.data ?? {};
      _branding = ChurchBranding.fromJson(data);
      await _cache.saveBranding(data);
    } on Object {
      // Keep cached or fallback branding when offline.
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
