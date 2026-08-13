import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'constants/theme.dart';
import 'providers/inventory_provider.dart';
import 'screens/home_screen.dart';
import 'screens/timeline_screen.dart';
import 'screens/automations_screen.dart';
import 'screens/add_product_screen.dart';
import 'screens/settings_screen.dart';

void main() {
  runApp(const FurInventoryApp());
}

class FurInventoryApp extends StatelessWidget {
  const FurInventoryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => InventoryProvider(),
      child: MaterialApp(
        title: 'FurInventory Pro',
        theme: AppTheme.darkTheme,
        debugShowCheckedModeBanner: false,
        home: const MainNavigation(),
      ),
    );
  }
}

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});
  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;
  final List<Widget> _screens = const [
    HomeScreen(),
    TimelineScreen(),
    AutomationsScreen(),
    AddProductScreen(),
    SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _screens),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.grid_view), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.timeline), label: 'Cronologia'),
          BottomNavigationBarItem(icon: Icon(Icons.account_tree), label: 'Automazioni'),
          BottomNavigationBarItem(icon: Icon(Icons.add_circle), label: 'Aggiungi'),
          BottomNavigationBarItem(icon: Icon(Icons.settings), label: 'Impostazioni'),
        ],
      ),
    );
  }
}
