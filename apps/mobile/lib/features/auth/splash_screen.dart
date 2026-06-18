import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/branding/branding_controller.dart';
import '../../widgets/church_logo.dart';
import '../../widgets/decorative_background.dart';
import 'auth_controller.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;
  bool _started = false;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    if (_started) return;
    _started = true;

    final branding = context.read<BrandingController>();
    final auth = context.read<AuthController>();

    await Future<void>.delayed(const Duration(milliseconds: 600));
    await Future.wait([
      branding.bootstrap().timeout(const Duration(seconds: 10), onTimeout: () {}),
      auth.bootstrap().timeout(const Duration(seconds: 12), onTimeout: () {
        auth.markUnauthenticated();
      }),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final branding = context.watch<BrandingController>().branding;

    return Scaffold(
      body: DecorativeBackground(
        height: double.infinity,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ScaleTransition(
                scale: Tween<double>(begin: 0.92, end: 1.06).animate(
                  CurvedAnimation(parent: _pulse, curve: Curves.easeInOut),
                ),
                child: ChurchLogo(
                  branding: branding,
                  variant: ChurchLogoVariant.splash,
                  showName: true,
                ),
              ),
              const SizedBox(height: 32),
              const SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white70),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
