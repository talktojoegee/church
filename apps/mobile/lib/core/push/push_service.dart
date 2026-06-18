import 'package:flutter/foundation.dart';

import '../config/app_config.dart';
import '../data/chms_repository.dart';

/// Registers device push tokens with the API when FCM is configured.
///
/// With `ENABLE_PUSH=false` (default), this is a no-op so the app builds
/// without Firebase config files. After running `flutterfire configure`,
/// set `--dart-define=ENABLE_PUSH=true` and implement `_initFirebase()` below.
class PushService {
  PushService(this._repo);

  final ChmsRepository _repo;
  String? _token;
  bool _initialized = false;

  String get _platform {
    if (kIsWeb) return 'web';
    switch (defaultTargetPlatform) {
      case TargetPlatform.iOS:
        return 'ios';
      case TargetPlatform.android:
        return 'android';
      case TargetPlatform.macOS:
        return 'macos';
      case TargetPlatform.windows:
        return 'windows';
      case TargetPlatform.linux:
        return 'linux';
      case TargetPlatform.fuchsia:
        return 'fuchsia';
    }
  }

  Future<void> initialize() async {
    if (!AppConfig.enablePush || _initialized) return;
    _initialized = true;
    await _initFirebase();
  }

  Future<void> _initFirebase() async {
    // Hook for Firebase Cloud Messaging after `flutterfire configure`:
    // 1. await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    // 2. final messaging = FirebaseMessaging.instance;
    // 3. await messaging.requestPermission();
    // 4. _token = await messaging.getToken();
    // 5. messaging.onTokenRefresh.listen((t) => _register(t));
    // 6. FirebaseMessaging.onMessageOpenedApp.listen(_handleMessage);
    if (kDebugMode) {
      debugPrint('PushService: ENABLE_PUSH is true but Firebase is not wired yet.');
    }
  }

  Future<void> syncToken() async {
    if (!AppConfig.enablePush) return;
    await initialize();
    final token = _token;
    if (token != null && token.isNotEmpty) {
      await _register(token);
    }
  }

  Future<void> unregister() async {
    if (!AppConfig.enablePush) return;
    final token = _token;
    if (token != null && token.isNotEmpty) {
      try {
        await _repo.unregisterDeviceToken(token);
      } catch (_) {}
    }
    _token = null;
  }

  Future<void> _register(String token) async {
    _token = token;
    try {
      await _repo.registerDeviceToken(token, _platform);
    } catch (_) {}
  }
}
