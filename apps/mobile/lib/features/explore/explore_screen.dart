import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/branding/branding_controller.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/church_logo.dart';
import '../../widgets/decorative_background.dart';

class ExploreScreen extends StatelessWidget {
  const ExploreScreen({super.key});

  static final _modules = [
    (Icons.people_alt_rounded, 'Members', 'Directory & households', AppColors.statGradients[0], '/members'),
    (Icons.groups_rounded, 'Groups', 'Small groups & ministries', AppColors.statGradients[1], '/groups'),
    (Icons.event_available_rounded, 'Attendance', 'Services & sessions', AppColors.statGradients[3], '/attendance'),
    (Icons.calendar_month_rounded, 'Events', 'Registrations & calendar', AppColors.statGradients[2], '/events'),
    (Icons.volunteer_activism_rounded, 'Finance', 'Giving & expenses', AppColors.statGradients[2], '/finance'),
    (Icons.mic_rounded, 'Sermons', 'Messages & series', AppColors.statGradients[2], '/sermons'),
    (Icons.favorite_rounded, 'Testimonies', 'Stories & approvals', AppColors.statGradients[0], '/testimonies'),
    (Icons.campaign_rounded, 'Outreach', 'Community missions', AppColors.statGradients[3], '/outreaches'),
    (Icons.phone_in_talk_rounded, 'Follow-ups', 'Pastoral care tasks', AppColors.statGradients[0], '/follow-ups'),
    (Icons.location_city_rounded, 'Branches', 'Church locations', AppColors.statGradients[1], '/branches'),
  ];

  @override
  Widget build(BuildContext context) {
    final branding = context.watch<BrandingController>().branding;

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: DecorativeBackground(
              height: 170,
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      ChurchLogo(
                        branding: branding,
                        variant: ChurchLogoVariant.compact,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text(
                              'Explore',
                              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                            Text(
                              '${branding.displayName} modules',
                              style: TextStyle(color: Colors.white.withValues(alpha: 0.85)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 14,
                crossAxisSpacing: 14,
                childAspectRatio: 0.92,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, i) {
                  final (icon, title, subtitle, gradient, route) = _modules[i];
                  return _ExploreModuleCard(
                    icon: icon,
                    title: title,
                    subtitle: subtitle,
                    gradient: gradient,
                    onTap: () => context.push(route),
                  );
                },
                childCount: _modules.length,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ExploreModuleCard extends StatefulWidget {
  const _ExploreModuleCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.gradient,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Gradient gradient;
  final VoidCallback onTap;

  @override
  State<_ExploreModuleCard> createState() => _ExploreModuleCardState();
}

class _ExploreModuleCardState extends State<_ExploreModuleCard> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.96 : 1,
        duration: const Duration(milliseconds: 120),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: widget.gradient,
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(
                color: AppColors.navy.withValues(alpha: 0.18),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(widget.icon, color: Colors.white, size: 24),
              ),
              const Spacer(),
              Text(
                widget.title,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                widget.subtitle,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.88),
                  fontSize: 11,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
