import 'package:flutter/foundation.dart';

import '../../core/api/api_client.dart';
import '../../core/push/push_service.dart';
import '../../models/auth_user.dart';
import 'auth_repository.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthController extends ChangeNotifier {
  AuthController(this._repository, this._push);

  final AuthRepository _repository;
  final PushService _push;

  AuthStatus status = AuthStatus.unknown;
  AuthUser? user;
  String? error;

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.unknown;

  Future<void>? _bootstrapFuture;

  Future<void> bootstrap() {
    return _bootstrapFuture ??= _doBootstrap();
  }

  Future<void> _doBootstrap() async {
    user = await _repository.restoreSession();
    status = user != null ? AuthStatus.authenticated : AuthStatus.unauthenticated;
    notifyListeners();
    if (user != null) await _push.syncToken();
  }

  Future<bool> login(String email, String password) async {
    error = null;
    notifyListeners();
    try {
      final response = await _repository.login(email, password);
      user = response.user;
      status = AuthStatus.authenticated;
      notifyListeners();
      await _push.syncToken();
      return true;
    } on ApiException catch (e) {
      error = e.message;
      status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _push.unregister();
    await _repository.logout();
    user = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  void updateUser(AuthUser updated) {
    user = updated;
    notifyListeners();
  }

  void markUnauthenticated() {
    user = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
