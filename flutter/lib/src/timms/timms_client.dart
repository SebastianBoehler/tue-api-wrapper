import '../http/native_http_session.dart';

class TimmsClient {
  TimmsClient({NativeHttpSession? session}) : _session = session ?? NativeHttpSession();

  static final Uri _base = Uri.parse('https://timms.uni-tuebingen.de');
  final NativeHttpSession _session;

  Future<String> search(String query, {int offset = 0, int limit = 20}) async {
    final path = offset > 0 || limit != 20 ? '/Search/ListTimecode' : '/Search/_QueryControl';
    final uri = _base.resolve(path).replace(queryParameters: {
      'InputQueryString': query,
      'Offset': '$offset',
      'FetchNext': '$limit',
      'Hits': '0',
      'ShowLabel': 'False',
    });
    return (await _session.get(uri)).body;
  }

  Future<String> suggest(String term) async {
    final uri = _base.resolve('/Search/AutoCompleteSearch').replace(queryParameters: {'term': term});
    return (await _session.get(uri)).body;
  }

  Future<String> item(String itemId) async {
    return (await _session.get(_base.resolve('/tp/${Uri.encodeComponent(itemId)}'))).body;
  }

  Future<String> streams(String itemId) async {
    final uri = _base.resolve('/Player/EPlayer').replace(queryParameters: {
      'id': itemId,
      't': '0.0',
    });
    return (await _session.get(uri)).body;
  }

  Future<String> tree({String? nodeId, String? nodePath}) async {
    if (nodeId != null && nodeId.isNotEmpty && nodePath != null && nodePath.isNotEmpty) {
      final uri = _base.resolve('/List/OpenNode').replace(queryParameters: {
        'nodeid': nodeId,
        'nodepath': nodePath,
      });
      return (await _session.get(uri)).body;
    }
    return (await _session.get(_base.resolve('/List/Browse'))).body;
  }

  void close() {
    _session.close();
  }
}
