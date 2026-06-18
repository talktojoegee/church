import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:path_provider/path_provider.dart';

import '../config/app_config.dart';
import '../storage/secure_storage.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient(this._storage);

  final SecureStorage _storage;
  late final Dio dio;
  late final PersistCookieJar _cookieJar;
  bool _initialized = false;
  Future<void>? _initFuture;

  Future<void> init() {
    _initFuture ??= _doInit();
    return _initFuture!;
  }

  Future<void> _doInit() async {
    if (_initialized) return;

    final dir = await getApplicationDocumentsDirectory();
    _cookieJar = PersistCookieJar(
      storage: FileStorage('${dir.path}/.cookies/'),
    );

    dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 20),
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      ),
    );

    dio.interceptors.add(CookieManager(_cookieJar));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.readAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final response = error.response;
          final requestOptions = error.requestOptions;
          // Only skip refresh for unauthenticated auth endpoints — not /auth/me or /auth/me/profile.
          final path = requestOptions.path;
          final skipRefresh = path.contains('/auth/login') ||
              path.contains('/auth/refresh') ||
              path.contains('/auth/logout');
          final alreadyRetried = requestOptions.extra['_retry'] == true;

          if (response?.statusCode == 401 && !skipRefresh && !alreadyRetried) {
            try {
              final refreshResponse = await dio.post('/auth/refresh');
              final newToken = refreshResponse.data['accessToken'] as String?;
              if (newToken != null) {
                await _storage.writeAccessToken(newToken);
                requestOptions.headers['Authorization'] = 'Bearer $newToken';
                requestOptions.extra['_retry'] = true;
                final retry = await dio.fetch(requestOptions);
                return handler.resolve(retry);
              }
            } catch (_) {
              await _storage.writeAccessToken(null);
            }
          }
          handler.next(error);
        },
      ),
    );

    _initialized = true;
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    await init();
    return dio.get<T>(path, queryParameters: queryParameters);
  }

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
  }) async {
    await init();
    return dio.post<T>(path, data: data);
  }

  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
  }) async {
    await init();
    return dio.patch<T>(path, data: data);
  }

  Future<Response<T>> delete<T>(String path, {dynamic data}) async {
    await init();
    return dio.delete<T>(path, data: data);
  }

  Future<Map<String, dynamic>> uploadFile(String filePath, {String? filename}) async {
    await init();
    final name = filename ?? filePath.split('/').last;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath, filename: name),
    });
    try {
      final res = await dio.post<Map<String, dynamic>>(
        '/uploads',
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );
      return res.data ?? {};
    } on DioException catch (e) {
      throw ApiException(extractErrorMessage(e), statusCode: e.response?.statusCode);
    }
  }

  Future<void> clearSession() async {
    await init();
    await _storage.writeAccessToken(null);
    await _cookieJar.deleteAll();
  }

  Future<String?> readAccessToken() => _storage.readAccessToken();

  Future<void> writeAccessToken(String? token) => _storage.writeAccessToken(token);

  String extractErrorMessage(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] != null) {
      final message = data['message'];
      if (message is List) return message.join(', ');
      return message.toString();
    }
    if (error.type == DioExceptionType.connectionError) {
      return 'Cannot reach the server. Check API_BASE_URL and that the API is running.';
    }
    return error.message ?? 'Request failed';
  }
}
