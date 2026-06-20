import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  SecureStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  static const _accessTokenKey = 'chms_access_token';

  Future<String?> readAccessToken() => _storage.read(key: _accessTokenKey);

  Future<void> writeAccessToken(String? token) async {
    if (token == null || token.isEmpty) {
      await _storage.delete(key: _accessTokenKey);
      return;
    }
    await _storage.write(key: _accessTokenKey, value: token);
  }

  Future<void> clear() => _storage.deleteAll();
}
