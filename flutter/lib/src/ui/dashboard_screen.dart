import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../auth/university_credentials.dart';
import '../tue_client.dart';
import 'dashboard_controls.dart';
import 'dashboard_sections.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  static const _storage = FlutterSecureStorage();

  final _username = TextEditingController();
  final _password = TextEditingController();
  final _date = TextEditingController();
  final _timms = TextEditingController(text: 'machine learning');

  String? _error;
  String? _loading;
  Map<String, Object?>? _lectures;
  List<Map<String, String?>> _events = const [];
  List<Map<String, Object?>> _exams = const [];
  List<Map<String, String?>> _iliasTasks = const [];
  Map<String, Object?>? _moodleDashboard;
  Object? _canteens;
  String? _timmsHtml;

  @override
  void initState() {
    super.initState();
    _loadStoredCredentials();
  }

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    _date.dispose();
    _timms.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final busy = _loading != null;
    return Scaffold(
      appBar: AppBar(
        title: const Text('TUE Study'),
        actions: [
          IconButton(
            tooltip: 'Refresh public data',
            onPressed: busy ? null : _loadPublic,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          CredentialsPanel(
            username: _username,
            password: _password,
            busy: busy,
            onSave: _saveCredentials,
            onLoadPrivate: _loadPrivate,
          ),
          if (_error != null) ErrorBanner(_error!),
          if (_loading != null) const LinearProgressIndicator(minHeight: 3),
          const SizedBox(height: 16),
          PublicPanel(date: _date, timms: _timms, busy: busy, onLoadPublic: _loadPublic),
          LecturesSection(lectures: _lectures),
          CampusSection(canteens: _canteens, events: _events),
          TimmsSection(html: _timmsHtml),
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: FilledButton.icon(
              onPressed: busy ? null : _loadPrivate,
              icon: const Icon(Icons.person_search_outlined),
              label: const Text('Refresh private dashboard'),
            ),
          ),
          AlmaPrivateSection(exams: _exams),
          IliasSection(tasks: _iliasTasks),
          MoodleSection(dashboard: _moodleDashboard),
        ],
      ),
    );
  }

  Future<void> _loadStoredCredentials() async {
    _username.text = await _storage.read(key: 'uni_username') ?? '';
    _password.text = await _storage.read(key: 'uni_password') ?? '';
  }

  Future<void> _saveCredentials() async {
    await _storage.write(key: 'uni_username', value: _username.text.trim());
    await _storage.write(key: 'uni_password', value: _password.text);
  }

  Future<void> _loadPublic() async {
    final client = TuebingenFlutterClient();
    await _run('public data', () async {
      final lectures = await client.alma.currentLectures(date: _date.text.trim(), limit: 8);
      final canteens = await client.campus.canteens();
      final events = await client.campus.events(limit: 6);
      final timms = await client.timms.search(_timms.text.trim(), limit: 5);
      if (!mounted) {
        return;
      }
      setState(() {
        _lectures = lectures;
        _canteens = canteens;
        _events = events;
        _timmsHtml = timms;
      });
    });
    client.close();
  }

  Future<void> _loadPrivate() async {
    final credentials = UniversityCredentials(username: _username.text.trim(), password: _password.text);
    final client = TuebingenFlutterClient(credentials: credentials);
    await _run('private data', () async {
      final results = await Future.wait<Object?>([
        client.alma.exams(limit: 8),
        client.ilias.tasks(limit: 8),
        client.moodle.dashboard(eventLimit: 4, courseLimit: 8, recentLimit: 4),
      ]);
      if (!mounted) {
        return;
      }
      setState(() {
        _exams = (results[0] as List).cast<Map<String, Object?>>();
        _iliasTasks = (results[1] as List).cast<Map<String, String?>>();
        _moodleDashboard = results[2] as Map<String, Object?>;
      });
    });
    client.close();
  }

  Future<void> _run(String label, Future<void> Function() action) async {
    setState(() {
      _loading = label;
      _error = null;
    });
    try {
      await action();
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _loading = null);
      }
    }
  }

}
