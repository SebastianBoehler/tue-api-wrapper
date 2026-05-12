import 'package:flutter/material.dart';

import 'app_section.dart';

class CredentialsPanel extends StatelessWidget {
  const CredentialsPanel({
    required this.username,
    required this.password,
    required this.busy,
    required this.onSave,
    required this.onLoadPrivate,
    super.key,
  });

  final TextEditingController username;
  final TextEditingController password;
  final bool busy;
  final VoidCallback onSave;
  final VoidCallback onLoadPrivate;

  @override
  Widget build(BuildContext context) {
    return AppSection(
      title: 'Account',
      icon: Icons.lock_outline,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: username,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'ZDV user'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: password,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Password'),
              onSubmitted: (_) {
                if (!busy) {
                  onLoadPrivate();
                }
              },
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                FilledButton.icon(
                  onPressed: busy ? null : onSave,
                  icon: const Icon(Icons.save_outlined),
                  label: const Text('Save'),
                ),
                const SizedBox(width: 10),
                OutlinedButton.icon(
                  onPressed: busy ? null : onLoadPrivate,
                  icon: const Icon(Icons.login),
                  label: const Text('Load private'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class PublicPanel extends StatelessWidget {
  const PublicPanel({
    required this.date,
    required this.timms,
    required this.busy,
    required this.onLoadPublic,
    super.key,
  });

  final TextEditingController date;
  final TextEditingController timms;
  final bool busy;
  final VoidCallback onLoadPublic;

  @override
  Widget build(BuildContext context) {
    return AppSection(
      title: 'Public',
      icon: Icons.public,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: date,
                    decoration: const InputDecoration(labelText: 'Lecture date'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: timms,
                    decoration: const InputDecoration(labelText: 'TIMMS search'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton.icon(
                onPressed: busy ? null : onLoadPublic,
                icon: const Icon(Icons.cloud_sync_outlined),
                label: const Text('Load public'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
