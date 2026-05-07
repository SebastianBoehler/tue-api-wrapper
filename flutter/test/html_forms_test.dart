import 'package:flutter_test/flutter_test.dart';
import 'package:tue_api_flutter/src/html/html_forms.dart';

void main() {
  const responseField = 'SAML' 'Response';
  const relayField = 'Relay' 'State';

  test('formById resolves action and collects editable fields', () {
    final form = formById(
      '''
      <form id="login" action="/submit">
        <input name="user" value="alice">
        <input name="disabled" value="skip" disabled>
        <input type="checkbox" name="unchecked" value="1">
        <input type="checkbox" name="checked" value="yes" checked>
        <button type="submit" name="submit" value="go">Go</button>
      </form>
      ''',
      Uri.parse('https://example.edu/start'),
      'login',
    );

    expect(form.action, Uri.parse('https://example.edu/submit'));
    expect(form.fields, {'user': 'alice', 'checked': 'yes'});
  });

  test('hiddenFormWithFields finds handoff forms', () {
    final form = hiddenFormWithFields(
      '''
      <form action="handoff">
        <input type="hidden" name="$relayField" value="state">
        <input type="hidden" name="$responseField" value="payload">
      </form>
      ''',
      Uri.parse('https://idp.example.edu/login'),
      [responseField, relayField],
    );

    expect(form.action, Uri.parse('https://idp.example.edu/handoff'));
    expect(form.fields[relayField], 'state');
  });
}
