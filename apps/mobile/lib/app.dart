import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/api/api_client.dart';
import 'core/branding/branding_controller.dart';
import 'core/data/chms_repository.dart';
import 'core/push/push_service.dart';
import 'core/routing/app_router.dart';
import 'core/storage/cache_store.dart';
import 'core/storage/secure_storage.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/auth_controller.dart';
import 'features/auth/auth_repository.dart';

class ChmsApp extends StatefulWidget {
  const ChmsApp({super.key});

  @override
  State<ChmsApp> createState() => _ChmsAppState();
}

class _ChmsAppState extends State<ChmsApp> with WidgetsBindingObserver {
  late final SecureStorage _storage;
  late final CacheStore _cacheStore;
  late final ApiClient _apiClient;
  late final AuthRepository _authRepository;
  late final ChmsRepository _chmsRepository;
  late final PushService _pushService;
  late final BrandingController _brandingController;
  late final AuthController _authController;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _storage = SecureStorage();
    _cacheStore = CacheStore();
    _apiClient = ApiClient(_storage);
    _authRepository = AuthRepository(_apiClient, _cacheStore);
    _chmsRepository = ChmsRepository(_apiClient, _cacheStore);
    _pushService = PushService(_chmsRepository);
    _brandingController = BrandingController(_apiClient, _cacheStore);
    _authController = AuthController(_authRepository, _pushService);
    // Bootstrap runs from SplashScreen; router redirects when auth resolves.
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _authController.isAuthenticated) {
      _pushService.syncToken();
    }
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: _apiClient),
        Provider<CacheStore>.value(value: _cacheStore),
        Provider<AuthRepository>.value(value: _authRepository),
        Provider<ChmsRepository>.value(value: _chmsRepository),
        Provider<PushService>.value(value: _pushService),
        ChangeNotifierProvider<BrandingController>.value(value: _brandingController),
        ChangeNotifierProvider<AuthController>.value(value: _authController),
      ],
      child: ListenableBuilder(
        listenable: _brandingController,
        builder: (context, _) => MaterialApp.router(
          title: _brandingController.displayName,
          theme: AppTheme.light(),
          routerConfig: createAppRouter(_authController),
          debugShowCheckedModeBanner: false,
        ),
      ),
    );
  }
}
