import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/util/asset_url.dart';

/// Circular user avatar — shows profile photo or initials fallback.
class UserAvatar extends StatelessWidget {
  const UserAvatar({
    super.key,
    this.avatarUrl,
    required this.initials,
    this.size = 40,
    this.borderColor,
    this.borderWidth = 2,
    this.onTap,
  });

  final String? avatarUrl;
  final String initials;
  final double size;
  final Color? borderColor;
  final double borderWidth;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final resolved = avatarUrl != null && avatarUrl!.isNotEmpty ? assetUrl(avatarUrl!) : null;
    final displayInitials = initials.isNotEmpty ? initials.toUpperCase() : '?';

    final avatar = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: resolved == null ? AppColors.primaryGradient : null,
        color: resolved != null ? Colors.white : null,
        border: borderColor != null
            ? Border.all(color: borderColor!, width: borderWidth)
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: size * 0.2,
            offset: Offset(0, size * 0.08),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: resolved != null
          ? Image.network(
              resolved,
              fit: BoxFit.cover,
              loadingBuilder: (_, child, progress) {
                if (progress == null) return child;
                return Center(
                  child: SizedBox(
                    width: size * 0.35,
                    height: size * 0.35,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.navy.withValues(alpha: 0.6),
                    ),
                  ),
                );
              },
              errorBuilder: (_, __, ___) => _InitialsFallback(initials: displayInitials, size: size),
            )
          : _InitialsFallback(initials: displayInitials, size: size),
    );

    if (onTap == null) return avatar;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: avatar,
      ),
    );
  }
}

class _InitialsFallback extends StatelessWidget {
  const _InitialsFallback({required this.initials, required this.size});

  final String initials;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(gradient: AppColors.primaryGradient),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w700,
          fontSize: size * 0.36,
        ),
      ),
    );
  }
}
