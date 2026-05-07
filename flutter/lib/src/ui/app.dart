import 'package:flutter/material.dart';

import 'dashboard_screen.dart';

class TueApiFlutterApp extends StatelessWidget {
  const TueApiFlutterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TUE Study',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff006c67)),
        useMaterial3: true,
        inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder()),
      ),
      home: const DashboardScreen(),
    );
  }
}
