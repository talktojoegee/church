import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/branding/branding_controller.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/church_logo.dart';
import '../../widgets/decorative_background.dart';
import '../../widgets/ui_components.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final branding = context.watch<BrandingController>().branding;

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(
        children: [
          DecorativeBackground(
            height: MediaQuery.of(context).size.height * 0.48,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 56, 24, 0),
              child: Column(
                children: [
                  ChurchLogo(
                    branding: branding,
                    variant: ChurchLogoVariant.login,
                    showName: true,
                  ),
                  const Spacer(),
                  Text(
                    'Welcome to ${branding.displayName}',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          height: 1.3,
                        ),
                  ),
                  const SizedBox(height: 12),
                    Text(
                      branding.welcomeSubtitle,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: 15,
                        height: 1.5,
                      ),
                    ),
                    if (branding.hasServiceTimes) ...[
                      const SizedBox(height: 16),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.schedule_rounded, color: Colors.white.withValues(alpha: 0.9)),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                branding.serviceTimes,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.92),
                                  fontSize: 13,
                                  height: 1.4,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 32),
                ],
              ),
            ),
          ),
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(28, 36, 28, 24),
                child: Column(
                  children: [
                    _FeatureRow(
                      icon: Icons.people_alt_rounded,
                      color: AppColors.accentAt(0),
                      title: 'Members & groups',
                      subtitle: 'Stay connected with your congregation',
                    ),
                    const SizedBox(height: 16),
                    _FeatureRow(
                      icon: Icons.event_available_rounded,
                      color: AppColors.accentAt(1),
                      title: 'Attendance & events',
                      subtitle: 'Track engagement in real time',
                    ),
                    const SizedBox(height: 16),
                    _FeatureRow(
                      icon: Icons.volunteer_activism_rounded,
                      color: AppColors.accentAt(2),
                      title: 'Giving & finance',
                      subtitle: 'Insights at your fingertips',
                    ),
                    const Spacer(),
                    GradientButton(
                      label: 'Get Started',
                      icon: Icons.arrow_forward_rounded,
                      gradient: AppColors.flameGradient,
                      onPressed: () => context.go('/login'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  const _FeatureRow({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: color),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
              Text(subtitle, style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
            ],
          ),
        ),
      ],
    );
  }
}
