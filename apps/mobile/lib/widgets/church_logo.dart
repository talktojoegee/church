import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/util/asset_url.dart';
import '../models/church_branding.dart';

enum ChurchLogoVariant { splash, login, header, compact }

class ChurchLogo extends StatelessWidget {
  const ChurchLogo({
    super.key,
    required this.branding,
    this.variant = ChurchLogoVariant.login,
    this.showName = false,
    this.nameStyle,
  });

  final ChurchBranding branding;
  final ChurchLogoVariant variant;
  final bool showName;
  final TextStyle? nameStyle;

  double get _size => switch (variant) {
        ChurchLogoVariant.splash => 96,
        ChurchLogoVariant.login => 88,
        ChurchLogoVariant.header => 48,
        ChurchLogoVariant.compact => 36,
      };

  @override
  Widget build(BuildContext context) {
    final logoUrl = branding.logoUrl;
    final resolved = logoUrl != null && logoUrl.isNotEmpty ? assetUrl(logoUrl) : null;

    final badge = _LogoBadge(size: _size, imageUrl: resolved, name: branding.displayName);

    if (!showName) return badge;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        badge,
        SizedBox(height: variant == ChurchLogoVariant.splash ? 20 : 14),
        Text(
          branding.displayName,
          textAlign: TextAlign.center,
          style: nameStyle ??
              Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                  ),
        ),
        if (branding.tagline.isNotEmpty && variant != ChurchLogoVariant.compact) ...[
          const SizedBox(height: 8),
          Text(
            branding.tagline,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.85),
              fontSize: variant == ChurchLogoVariant.splash ? 15 : 13,
              height: 1.4,
            ),
          ),
        ],
      ],
    );
  }
}

class _LogoBadge extends StatelessWidget {
  const _LogoBadge({
    required this.size,
    required this.imageUrl,
    required this.name,
  });

  final double size;
  final String? imageUrl;
  final String name;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: imageUrl == null ? AppColors.flameGradient : null,
        color: imageUrl != null ? Colors.white : null,
        boxShadow: [
          BoxShadow(
            color: AppColors.navy.withValues(alpha: 0.28),
            blurRadius: size * 0.25,
            offset: Offset(0, size * 0.12),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: imageUrl != null
          ? Image.network(
              imageUrl!,
              fit: BoxFit.cover,
              loadingBuilder: (_, child, progress) {
                if (progress == null) return child;
                return Center(
                  child: SizedBox(
                    width: size * 0.35,
                    height: size * 0.35,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.indigo.withValues(alpha: 0.7),
                    ),
                  ),
                );
              },
              errorBuilder: (_, __, ___) => _FallbackIcon(size: size, name: name),
            )
          : _FallbackIcon(size: size, name: name),
    );
  }
}

class _FallbackIcon extends StatelessWidget {
  const _FallbackIcon({required this.size, required this.name});

  final double size;
  final String name;

  @override
  Widget build(BuildContext context) {
    final initials = _initials(name);
    if (initials.length >= 2 && size >= 40) {
      return Container(
        decoration: const BoxDecoration(gradient: AppColors.flameGradient),
        alignment: Alignment.center,
        child: Text(
          initials,
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            fontSize: size * 0.32,
          ),
        ),
      );
    }
    return Container(
      decoration: const BoxDecoration(gradient: AppColors.primaryGradient),
      alignment: Alignment.center,
      child: Icon(Icons.church_rounded, color: Colors.white, size: size * 0.45),
    );
  }

  String _initials(String value) {
    final parts = value.split(' ').where((p) => p.isNotEmpty).take(2).toList();
    if (parts.isEmpty) return 'C';
    return parts.map((p) => p[0].toUpperCase()).join();
  }
}
