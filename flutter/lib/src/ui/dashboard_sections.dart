import 'dart:convert';

import 'package:flutter/material.dart';

import 'app_section.dart';

class LecturesSection extends StatelessWidget {
  const LecturesSection({required this.lectures, super.key});

  final Map<String, Object?>? lectures;

  @override
  Widget build(BuildContext context) {
    final results = (lectures?['results'] as List?)?.cast<Map<String, Object?>>() ?? const [];
    return AppSection(
      title: 'Alma Lectures',
      icon: Icons.event_note_outlined,
      child: MapItemList(
        items: results,
        titleKey: 'title',
        subtitleKeys: const ['start', 'end', 'room', 'lecturer'],
      ),
    );
  }
}

class CampusSection extends StatelessWidget {
  const CampusSection({required this.canteens, required this.events, super.key});

  final Object? canteens;
  final List<Map<String, String?>> events;

  @override
  Widget build(BuildContext context) {
    return AppSection(
      title: 'Campus',
      icon: Icons.location_city_outlined,
      child: Column(
        children: [
          ListTile(
            title: const Text('Canteens'),
            subtitle: Text(summaryValue(canteens)),
          ),
          const Divider(height: 1),
          MapItemList(
            items: events.cast<Map<String, Object?>>(),
            titleKey: 'title',
            subtitleKeys: const ['published'],
          ),
        ],
      ),
    );
  }
}

class TimmsSection extends StatelessWidget {
  const TimmsSection({required this.html, super.key});

  final String? html;

  @override
  Widget build(BuildContext context) {
    return AppSection(
      title: 'TIMMS',
      icon: Icons.video_library_outlined,
      child: EmptyState(html == null ? 'No search loaded.' : '${html!.length} bytes returned.'),
    );
  }
}

class AlmaPrivateSection extends StatelessWidget {
  const AlmaPrivateSection({required this.exams, super.key});

  final List<Map<String, Object?>> exams;

  @override
  Widget build(BuildContext context) {
    return AppSection(
      title: 'Alma Exams',
      icon: Icons.school_outlined,
      child: MapItemList(items: exams, titleKey: 'title', subtitleKeys: const ['grade', 'cp', 'status']),
    );
  }
}

class IliasSection extends StatelessWidget {
  const IliasSection({required this.tasks, super.key});

  final List<Map<String, String?>> tasks;

  @override
  Widget build(BuildContext context) {
    return AppSection(
      title: 'ILIAS Tasks',
      icon: Icons.task_alt_outlined,
      child: MapItemList(items: tasks.cast<Map<String, Object?>>(), titleKey: 'title', subtitleKeys: const ['kind']),
    );
  }
}

class MoodleSection extends StatelessWidget {
  const MoodleSection({required this.dashboard, super.key});

  final Map<String, Object?>? dashboard;

  @override
  Widget build(BuildContext context) {
    return AppSection(
      title: 'Moodle',
      icon: Icons.forum_outlined,
      child: EmptyState(dashboard == null ? 'No dashboard loaded.' : summaryValue(dashboard)),
    );
  }
}

class ErrorBanner extends StatelessWidget {
  const ErrorBanner(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(message, style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer)),
    );
  }
}

String summaryValue(Object? value) {
  if (value == null) {
    return 'No data loaded.';
  }
  if (value is List) {
    return '${value.length} entries';
  }
  final encoded = jsonEncode(value);
  return encoded.length <= 140 ? encoded : '${encoded.substring(0, 140)}...';
}
