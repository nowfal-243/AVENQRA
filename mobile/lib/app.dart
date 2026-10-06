import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/auth_provider.dart';
import 'features/auth/login_screen.dart';
import 'features/home/home_screen.dart';
import 'features/profile/profile_screen.dart';

class AvenqraApp extends StatefulWidget {
  const AvenqraApp({super.key});

  @override
  State<AvenqraApp> createState() => _AvenqraAppState();
}

class _AvenqraAppState extends State<AvenqraApp> {
  final AuthProvider _authProvider = AuthProvider();
  int _currentIndex = 0;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _authProvider.checkAuthStatus().then((_) {
      if (mounted) setState(() => _initialized = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return MaterialApp(
        theme: AppTheme.lightTheme,
        home: const Scaffold(
          body: Center(
            child: CircularProgressIndicator(),
          ),
        ),
      );
    }

    return ListenableBuilder(
      listenable: _authProvider,
      builder: (context, _) {
        if (!_authProvider.isAuthenticated) {
          return MaterialApp(
            title: 'AVENQRA',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            home: LoginScreen(
              authProvider: _authProvider,
              onLoginSuccess: () => setState(() {}),
            ),
          );
        }

        return MaterialApp(
          title: 'AVENQRA',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          home: Scaffold(
            body: IndexedStack(
              index: _currentIndex,
              children: [
                const HomeScreen(),
                ProfileScreen(
                  authProvider: _authProvider,
                  onLogout: () => setState(() => _currentIndex = 0),
                ),
              ],
            ),
            bottomNavigationBar: BottomNavigationBar(
              currentIndex: _currentIndex,
              onTap: (index) => setState(() => _currentIndex = index),
              selectedItemColor: const Color(0xFF1E3A8A),
              items: const [
                BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
                BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
              ],
            ),
          ),
        );
      },
    );
  }
}
