import 'package:flutter/material.dart';

import 'decorative_background.dart';

/// Header with a floating card that overlaps without being clipped.
class HeroOverlapHeader extends StatelessWidget {
  const HeroOverlapHeader({
    super.key,
    required this.headerHeight,
    required this.headerContent,
    required this.floatingChild,
    this.floatingHeight = 76,
    this.horizontalPadding = 20,
  });

  final double headerHeight;
  final Widget headerContent;
  final Widget floatingChild;
  final double floatingHeight;
  final double horizontalPadding;

  @override
  Widget build(BuildContext context) {
    final overlap = floatingHeight * 0.45;
    return SizedBox(
      height: headerHeight + overlap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: headerHeight,
            child: DecorativeBackground(
              height: headerHeight,
              child: headerContent,
            ),
          ),
          Positioned(
            top: headerHeight - overlap,
            left: horizontalPadding,
            right: horizontalPadding,
            child: floatingChild,
          ),
        ],
      ),
    );
  }
}

/// Simple hero header without floating overlap (Explore, Activity).
class PageHeroHeader extends StatelessWidget {
  const PageHeroHeader({
    super.key,
    required this.title,
    required this.subtitle,
    this.height = 150,
  });

  final String title;
  final String subtitle;
  final double height;

  @override
  Widget build(BuildContext context) {
    return DecorativeBackground(
      height: height,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                subtitle,
                style: TextStyle(color: Colors.white.withValues(alpha: 0.85)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
