import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../models/church_branding.dart';
import 'ui_components.dart';

/// Fade + slide entrance for dashboard charts (staggered by index).
class AnimatedChartEntrance extends StatefulWidget {
  const AnimatedChartEntrance({
    super.key,
    required this.child,
    this.index = 0,
  });

  final Widget child;
  final int index;

  @override
  State<AnimatedChartEntrance> createState() => _AnimatedChartEntranceState();
}

class _AnimatedChartEntranceState extends State<AnimatedChartEntrance>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _slide = Tween<Offset>(begin: const Offset(0, 0.08), end: Offset.zero).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );
    Future<void>.delayed(Duration(milliseconds: 80 * widget.index), () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(position: _slide, child: widget.child),
    );
  }
}

class ChurchInfoCard extends StatelessWidget {
  const ChurchInfoCard({
    super.key,
    required this.branding,
    this.compact = false,
  });

  final ChurchBranding branding;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    if (!branding.hasServiceTimes && !branding.hasContactInfo) {
      return const SizedBox.shrink();
    }

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  gradient: AppColors.statGradients[1],
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.church_rounded, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  branding.displayName,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                ),
              ),
            ],
          ),
          if (branding.hasServiceTimes) ...[
            const SizedBox(height: 14),
            _InfoRow(
              icon: Icons.schedule_rounded,
              color: AppColors.violet,
              label: 'Service times',
              value: branding.serviceTimes,
              multiline: true,
            ),
          ],
          if (!compact && branding.hasContactInfo) ...[
            if (branding.email.isNotEmpty) ...[
              const SizedBox(height: 10),
              _InfoRow(icon: Icons.email_outlined, color: AppColors.indigo, label: 'Email', value: branding.email),
            ],
            if (branding.phone.isNotEmpty) ...[
              const SizedBox(height: 10),
              _InfoRow(icon: Icons.phone_outlined, color: AppColors.emerald, label: 'Phone', value: branding.phone),
            ],
            if (branding.address.isNotEmpty) ...[
              const SizedBox(height: 10),
              _InfoRow(
                icon: Icons.location_on_outlined,
                color: AppColors.coral,
                label: 'Address',
                value: branding.address,
                multiline: true,
              ),
            ],
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
    this.multiline = false,
  });

  final IconData icon;
  final Color color;
  final String label;
  final String value;
  final bool multiline;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: multiline ? CrossAxisAlignment.start : CrossAxisAlignment.center,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
              Text(
                value,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, height: 1.35),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
