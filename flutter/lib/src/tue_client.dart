import 'alma/alma_client.dart';
import 'auth/university_credentials.dart';
import 'campus/campus_client.dart';
import 'ilias/ilias_client.dart';
import 'moodle/moodle_client.dart';
import 'timms/timms_client.dart';

class TuebingenFlutterClient {
  TuebingenFlutterClient({UniversityCredentials? credentials})
      : alma = AlmaClient(credentials: credentials),
        campus = CampusClient(),
        ilias = IliasClient(credentials: credentials),
        moodle = MoodleClient(credentials: credentials),
        timms = TimmsClient();

  final AlmaClient alma;
  final CampusClient campus;
  final IliasClient ilias;
  final MoodleClient moodle;
  final TimmsClient timms;

  void close() {
    alma.close();
    campus.close();
    ilias.close();
    moodle.close();
    timms.close();
  }
}
