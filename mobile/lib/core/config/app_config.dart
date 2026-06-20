/// API and app configuration.
class AppConfig {
  AppConfig._();

  /// Override at build/run time:
  /// `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api`
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:4000/api',
  );

  static const String appName = 'ChMS';

  /// Set `--dart-define=ENABLE_PUSH=true` after configuring Firebase (see README).
  static const bool enablePush = bool.fromEnvironment('ENABLE_PUSH', defaultValue: false);
}
