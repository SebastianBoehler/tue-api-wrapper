class UniversityCredentials {
  const UniversityCredentials({
    required this.username,
    required this.password,
  });

  final String username;
  final String password;

  bool get isComplete => username.trim().isNotEmpty && password.isNotEmpty;
}
