import '../config/app_config.dart';

/// Resolve a server-relative upload path to a full URL (matches web `assetUrl`).
String assetUrl(String path) {
  if (path.isEmpty) return '';
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  final origin = AppConfig.apiBaseUrl.replaceAll(RegExp(r'/api/?$'), '');
  return '$origin${path.startsWith('/') ? path : '/$path'}';
}
