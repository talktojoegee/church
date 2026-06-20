import 'package:go_router/go_router.dart';

import '../../features/activity/activity_screen.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/splash_screen.dart';
import '../../features/auth/welcome_screen.dart';
import '../../features/explore/explore_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/modules/create_screens.dart';
import '../../features/modules/detail_screens.dart';
import '../../features/modules/member_detail_screen.dart';
import '../../features/modules/module_screens.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/shell/main_shell.dart';

GoRouter createAppRouter(AuthController auth) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: auth,
    redirect: (context, state) {
      final path = state.uri.path;
      final isPublic = path == '/' || path == '/welcome' || path == '/login';

      if (auth.isLoading) {
        return isPublic ? null : '/';
      }

      if (path == '/') {
        return auth.isAuthenticated ? '/home' : '/welcome';
      }

      if (!auth.isAuthenticated) {
        return isPublic ? null : '/welcome';
      }

      if (path == '/welcome' || path == '/login') {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/welcome', builder: (_, __) => const WelcomeScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return MainShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/explore', builder: (_, __) => const ExploreScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/activity', builder: (_, __) => const ActivityScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
            ],
          ),
        ],
      ),
      // Members
      GoRoute(path: '/members', builder: (_, __) => const MembersScreen()),
      GoRoute(path: '/members/new', builder: (_, __) => const CreateMemberScreen()),
      GoRoute(
        path: '/members/:id/edit',
        builder: (_, state) => EditMemberScreen(
          memberId: state.pathParameters['id']!,
          initial: Map<String, dynamic>.from(state.extra as Map),
        ),
      ),
      GoRoute(
        path: '/members/:id',
        builder: (_, state) => MemberDetailScreen(memberId: state.pathParameters['id']!),
      ),
      // Events
      GoRoute(path: '/events', builder: (_, __) => const EventsScreen()),
      GoRoute(path: '/events/new', builder: (_, __) => const CreateEventScreen()),
      GoRoute(
        path: '/events/:id/edit',
        builder: (_, state) => EditEventScreen(eventId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/events/:id/register',
        builder: (_, state) => RegisterEventScreen(
          eventId: state.pathParameters['id']!,
          eventTitle: state.extra as String? ?? 'Event',
        ),
      ),
      GoRoute(
        path: '/events/:id',
        builder: (_, state) => EventDetailScreen(eventId: state.pathParameters['id']!),
      ),
      // Groups
      GoRoute(path: '/groups', builder: (_, __) => const GroupsScreen()),
      GoRoute(path: '/groups/new', builder: (_, __) => const CreateGroupScreen()),
      GoRoute(
        path: '/groups/:id/meetings/new',
        builder: (_, state) => LogGroupMeetingScreen(
          groupId: state.pathParameters['id']!,
          groupName: state.extra as String? ?? 'Group',
        ),
      ),
      GoRoute(
        path: '/groups/:id',
        builder: (_, state) => GroupDetailScreen(groupId: state.pathParameters['id']!),
      ),
      // Attendance
      GoRoute(path: '/attendance', builder: (_, __) => const AttendanceScreen()),
      GoRoute(path: '/attendance/new', builder: (_, __) => const CreateAttendanceScreen()),
      GoRoute(
        path: '/attendance/:id/roll-call',
        builder: (_, state) => EditAttendanceRollCallScreen(sessionId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/attendance/:id',
        builder: (_, state) => AttendanceDetailScreen(sessionId: state.pathParameters['id']!),
      ),
      // Finance
      GoRoute(path: '/finance', builder: (_, __) => const FinanceScreen()),
      GoRoute(
        path: '/finance/contribution/new',
        builder: (_, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return RecordContributionScreen(
            memberId: extra?['memberId'] as String?,
            memberName: extra?['memberName'] as String?,
          );
        },
      ),
      GoRoute(path: '/finance/expense/new', builder: (_, __) => const RecordExpenseScreen()),
      // Follow-ups
      GoRoute(path: '/follow-ups', builder: (_, __) => const FollowUpsScreen()),
      GoRoute(
        path: '/follow-ups/new',
        builder: (_, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return CreateFollowUpScreen(
            memberId: extra?['memberId'] as String?,
            memberName: extra?['memberName'] as String?,
          );
        },
      ),
      GoRoute(
        path: '/follow-ups/:id',
        builder: (_, state) => FollowUpDetailScreen(followUpId: state.pathParameters['id']!),
      ),
      // Branches
      GoRoute(path: '/branches', builder: (_, __) => const BranchesScreen()),
      GoRoute(
        path: '/branches/:id',
        builder: (_, state) => BranchDetailScreen(branchId: state.pathParameters['id']!),
      ),
      // Sermons
      GoRoute(path: '/sermons', builder: (_, __) => const SermonsScreen()),
      GoRoute(path: '/sermons/new', builder: (_, __) => const CreateSermonScreen()),
      GoRoute(
        path: '/sermons/:id/edit',
        builder: (_, state) => EditSermonScreen(sermonId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/sermons/:id',
        builder: (_, state) => SermonDetailScreen(sermonId: state.pathParameters['id']!),
      ),
      // Outreach
      GoRoute(path: '/outreaches', builder: (_, __) => const OutreachesScreen()),
      GoRoute(path: '/outreaches/new', builder: (_, __) => const CreateOutreachScreen()),
      GoRoute(
        path: '/outreaches/:id/edit',
        builder: (_, state) => EditOutreachScreen(outreachId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/outreaches/:id',
        builder: (_, state) => OutreachDetailScreen(outreachId: state.pathParameters['id']!),
      ),
      // Testimonies
      GoRoute(path: '/testimonies', builder: (_, __) => const TestimoniesScreen()),
      GoRoute(path: '/testimonies/new', builder: (_, __) => const SubmitTestimonyScreen()),
      GoRoute(
        path: '/testimonies/:id',
        builder: (_, state) => TestimonyDetailScreen(testimonyId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
    ],
  );
}
