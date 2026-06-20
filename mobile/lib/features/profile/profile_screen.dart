import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/branding/branding_controller.dart';
import '../../core/theme/app_colors.dart';
import '../../models/auth_user.dart';
import '../../widgets/church_info_card.dart';
import '../../widgets/hero_header.dart';
import '../../widgets/ui_components.dart';
import '../../widgets/user_avatar.dart';
import '../auth/auth_controller.dart';
import '../auth/auth_repository.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  UserProfile? _profile;
  bool _loading = true;
  String? _error;
  int _tab = 0;

  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _phone = TextEditingController();
  final _currentPassword = TextEditingController();
  final _newPassword = TextEditingController();
  final _confirmPassword = TextEditingController();

  bool _savingProfile = false;
  bool _savingPassword = false;
  String? _profileMessage;
  String? _passwordMessage;
  String _appVersion = '';

  @override
  void initState() {
    super.initState();
    _loadProfile();
    _loadAppInfo();
  }

  Future<void> _loadAppInfo() async {
    final info = await PackageInfo.fromPlatform();
    if (mounted) setState(() => _appVersion = '${info.version}+${info.buildNumber}');
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _phone.dispose();
    _currentPassword.dispose();
    _newPassword.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = context.read<AuthRepository>();
      final profile = await repo.fetchProfile();
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _firstName.text = profile.firstName;
        _lastName.text = profile.lastName;
        _phone.text = profile.phone ?? '';
        _loading = false;
      });
      final user = context.read<AuthController>().user;
      if (user != null && profile.avatarUrl != user.avatarUrl) {
        context.read<AuthController>().updateUser(user.copyWith(avatarUrl: profile.avatarUrl));
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      final user = context.read<AuthController>().user;
      if (user != null && e.statusCode == 401) {
        await context.read<AuthController>().bootstrap();
        if (!mounted) return;
        try {
          final profile = await context.read<AuthRepository>().fetchProfile();
          if (!mounted) return;
          setState(() {
            _profile = profile;
            _firstName.text = profile.firstName;
            _lastName.text = profile.lastName;
            _phone.text = profile.phone ?? '';
            _loading = false;
          });
          return;
        } catch (_) {}
      }
      if (user != null) {
        final fallback = context.read<AuthRepository>().profileFromSession(user);
        setState(() {
          _profile = fallback;
          _firstName.text = fallback.firstName;
          _lastName.text = fallback.lastName;
          _phone.text = fallback.phone ?? '';
          _loading = false;
          _error = null;
        });
        return;
      }
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _saveProfile() async {
    setState(() {
      _savingProfile = true;
      _profileMessage = null;
    });
    try {
      final updated = await context.read<AuthRepository>().updateProfile(
            firstName: _firstName.text.trim(),
            lastName: _lastName.text.trim(),
            phone: _phone.text.trim(),
          );
      if (!mounted) return;
      context.read<AuthController>().updateUser(updated);
      setState(() {
        _profile = _profile?.copyWith(
              firstName: updated.firstName,
              lastName: updated.lastName,
              avatarUrl: updated.avatarUrl,
            ) ??
            UserProfile(
              id: updated.id,
              email: updated.email,
              firstName: updated.firstName,
              lastName: updated.lastName,
              avatarUrl: updated.avatarUrl,
            );
        _savingProfile = false;
        _profileMessage = 'Profile updated successfully';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _savingProfile = false;
        _profileMessage = e.toString();
      });
    }
  }

  Future<void> _savePassword() async {
    if (_newPassword.text != _confirmPassword.text) {
      setState(() => _passwordMessage = 'Passwords do not match');
      return;
    }
    setState(() {
      _savingPassword = true;
      _passwordMessage = null;
    });
    try {
      await context.read<AuthRepository>().changePassword(
            currentPassword: _currentPassword.text,
            newPassword: _newPassword.text,
          );
      if (!mounted) return;
      _currentPassword.clear();
      _newPassword.clear();
      _confirmPassword.clear();
      setState(() {
        _savingPassword = false;
        _passwordMessage = 'Password updated successfully';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _savingPassword = false;
        _passwordMessage = e.toString();
      });
    }
  }

  Future<void> _logout() async {
    await context.read<AuthController>().logout();
    if (mounted) context.go('/welcome');
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().user;
    final avatarUrl = _profile?.avatarUrl ?? user?.avatarUrl;
    final initials = user?.initials ?? '?';

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        GradientButton(label: 'Retry', onPressed: _loadProfile),
                      ],
                    ),
                  ),
                )
              : CustomScrollView(
                  slivers: [
                    SliverToBoxAdapter(
                      child: HeroOverlapHeader(
                        headerHeight: 220,
                        floatingHeight: 56,
                        headerContent: SafeArea(
                          bottom: false,
                          child: Column(
                            children: [
                              const SizedBox(height: 16),
                              UserAvatar(
                                avatarUrl: avatarUrl,
                                initials: initials,
                                size: 88,
                                borderColor: Colors.white,
                                borderWidth: 3,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                '${_profile?.firstName ?? ''} ${_profile?.lastName ?? ''}'.trim(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Text(
                                _profile?.email ?? '',
                                style: TextStyle(color: Colors.white.withValues(alpha: 0.85)),
                              ),
                            ],
                          ),
                        ),
                        floatingChild: AppCard(
                          padding: const EdgeInsets.all(6),
                          child: Row(
                            children: [
                              _TabChip(
                                label: 'Account',
                                selected: _tab == 0,
                                onTap: () => setState(() => _tab = 0),
                              ),
                              _TabChip(
                                label: 'Password',
                                selected: _tab == 1,
                                onTap: () => setState(() => _tab = 1),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                      sliver: SliverToBoxAdapter(
                        child: _tab == 0
                            ? _AccountPanel(
                                profile: _profile!,
                                firstName: _firstName,
                                lastName: _lastName,
                                phone: _phone,
                                saving: _savingProfile,
                                message: _profileMessage,
                                onSave: _saveProfile,
                                onLogout: _logout,
                                appVersion: _appVersion,
                              )
                            : _PasswordPanel(
                                current: _currentPassword,
                                newPassword: _newPassword,
                                confirm: _confirmPassword,
                                saving: _savingPassword,
                                message: _passwordMessage,
                                onSave: _savePassword,
                              ),
                      ),
                    ),
                  ],
                ),
    );
  }
}

class _TabChip extends StatelessWidget {
  const _TabChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            gradient: selected ? AppColors.primaryGradient : null,
            color: selected ? null : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: selected ? Colors.white : Colors.grey.shade600,
            ),
          ),
        ),
      ),
    );
  }
}

class _AccountPanel extends StatelessWidget {
  const _AccountPanel({
    required this.profile,
    required this.firstName,
    required this.lastName,
    required this.phone,
    required this.saving,
    required this.message,
    required this.onSave,
    required this.onLogout,
    this.appVersion = '',
  });

  final UserProfile profile;
  final TextEditingController firstName;
  final TextEditingController lastName;
  final TextEditingController phone;
  final bool saving;
  final String? message;
  final VoidCallback onSave;
  final VoidCallback onLogout;
  final String appVersion;

  @override
  Widget build(BuildContext context) {
    final roleName = profile.roles.isNotEmpty
        ? profile.roles.first['name'] as String? ?? '—'
        : '—';
    final branchName = profile.branch?['name'] as String? ?? '—';
    final branding = context.watch<BrandingController>().branding;

    return Column(
      children: [
        ChurchInfoCard(branding: branding),
        const SizedBox(height: 10),
        MenuTile(
          icon: Icons.badge_rounded,
          label: 'Role',
          subtitle: roleName,
          color: AppColors.indigo,
        ),
        const SizedBox(height: 10),
        MenuTile(
          icon: Icons.location_city_rounded,
          label: 'Branch',
          subtitle: branchName,
          color: AppColors.emerald,
        ),
        const SizedBox(height: 20),
        AppCard(
          child: Column(
            children: [
              TextField(controller: firstName, decoration: const InputDecoration(labelText: 'First name')),
              const SizedBox(height: 14),
              TextField(controller: lastName, decoration: const InputDecoration(labelText: 'Last name')),
              const SizedBox(height: 14),
              TextField(
                controller: phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone'),
              ),
              if (message != null) ...[
                const SizedBox(height: 12),
                Text(
                  message!,
                  style: TextStyle(
                    color: message!.contains('success')
                        ? AppColors.emerald
                        : AppColors.rose,
                    fontSize: 13,
                  ),
                ),
              ],
              const SizedBox(height: 16),
              GradientButton(label: 'Save changes', loading: saving, onPressed: onSave),
            ],
          ),
        ),
        const SizedBox(height: 16),
        GradientButton(
          label: 'Sign out',
          icon: Icons.logout_rounded,
          gradient: const LinearGradient(colors: [AppColors.rose, Color(0xFFE53935)]),
          onPressed: onLogout,
        ),
        if (appVersion.isNotEmpty) ...[
          const SizedBox(height: 24),
          Center(
            child: Text(
              '${branding.displayName} v$appVersion',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
            ),
          ),
        ],
      ],
    );
  }
}

class _PasswordPanel extends StatelessWidget {
  const _PasswordPanel({
    required this.current,
    required this.newPassword,
    required this.confirm,
    required this.saving,
    required this.message,
    required this.onSave,
  });

  final TextEditingController current;
  final TextEditingController newPassword;
  final TextEditingController confirm;
  final bool saving;
  final String? message;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        children: [
          TextField(
            controller: current,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Current password'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: newPassword,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'New password'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: confirm,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Confirm new password'),
          ),
          if (message != null) ...[
            const SizedBox(height: 12),
            Text(
              message!,
              style: TextStyle(
                color: message!.contains('success') ? AppColors.emerald : AppColors.rose,
                fontSize: 13,
              ),
            ),
          ],
          const SizedBox(height: 16),
          GradientButton(label: 'Update password', loading: saving, onPressed: onSave),
        ],
      ),
    );
  }
}
