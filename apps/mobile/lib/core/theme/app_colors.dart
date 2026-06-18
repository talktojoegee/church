import 'package:flutter/material.dart';

/// Logo-aligned palette: deep navy + flame red/orange/gold only.
class AppColors {
  AppColors._();

  // Brand core
  static const navyDark = Color(0xFF0A1552);
  static const navy = Color(0xFF152A7A);
  static const navyMid = Color(0xFF1E2F6E);
  static const navyLight = Color(0xFF243B8A);
  static const flame = Color(0xFFC62828);
  static const flameOrange = Color(0xFFE65100);
  static const gold = Color(0xFFFFB300);
  static const surface = Color(0xFFF6F7FB);
  static const card = Colors.white;

  // Semantic aliases (keep API stable, map to brand)
  static const indigo = navyLight;
  static const violet = navy;
  static const sky = navyMid;
  static const emerald = gold;
  static const amber = gold;
  static const rose = flame;
  static const coral = flameOrange;
  static const success = gold;
  static const error = flame;

  static const primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [navyDark, navy, navyMid],
  );

  static const flameGradient = LinearGradient(
    begin: Alignment.bottomCenter,
    end: Alignment.topCenter,
    colors: [flame, flameOrange, gold],
  );

  static const heroGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [navyDark, navy, navyMid],
  );

  /// Stat cards — navy and flame families only (no bright blue/purple).
  static const statGradients = [
    LinearGradient(colors: [navyDark, navy]),
    LinearGradient(colors: [flame, flameOrange]),
    LinearGradient(colors: [flameOrange, gold]),
    LinearGradient(colors: [navy, navyMid]),
  ];

  static const quickActionColors = [navy, flame, flameOrange, gold, navyMid, flameOrange];

  static Color accentAt(int index) => quickActionColors[index % quickActionColors.length];
}
