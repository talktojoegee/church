import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

/// Concentric ring pattern used in hero headers (inspired by modern booking apps).
class DecorativeBackground extends StatelessWidget {
  const DecorativeBackground({
    super.key,
    this.height = 280,
    this.gradient = AppColors.heroGradient,
    this.child,
  });

  final double height;
  final Gradient gradient;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      width: double.infinity,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(decoration: BoxDecoration(gradient: gradient)),
          Positioned(
            right: -40,
            top: -20,
            child: _Ring(size: 180, opacity: 0.12),
          ),
          Positioned(
            right: 20,
            top: 40,
            child: _Ring(size: 120, opacity: 0.18),
          ),
          Positioned(
            left: -30,
            bottom: -10,
            child: _Ring(size: 140, opacity: 0.1),
          ),
          if (child != null) Positioned.fill(child: child!),
        ],
      ),
    );
  }
}

class _Ring extends StatelessWidget {
  const _Ring({required this.size, required this.opacity});

  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size(size, size),
      painter: _RingPainter(opacity: opacity),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({required this.opacity});

  final double opacity;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: opacity)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    for (var i = 1; i <= 4; i++) {
      canvas.drawCircle(center, size.width * 0.12 * i, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class FloatingIconBadge extends StatelessWidget {
  const FloatingIconBadge({
    super.key,
    required this.icon,
    this.size = 72,
    this.gradient = AppColors.primaryGradient,
  });

  final IconData icon;
  final double size;
  final Gradient gradient;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: gradient,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: AppColors.navy.withValues(alpha: 0.35),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Icon(icon, color: Colors.white, size: size * 0.45),
    );
  }
}

String greetingForTime() {
  final hour = DateTime.now().hour;
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
