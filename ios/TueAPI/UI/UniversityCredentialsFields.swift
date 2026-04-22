import SwiftUI

struct UniversityCredentialsFields: View {
    @Binding var username: String
    @Binding var password: String

    var body: some View {
        VStack(spacing: 12) {
            UniversityCredentialsFieldContainer(title: "Username") {
                TextField("abc12345", text: $username)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .textContentType(.username)
                    .submitLabel(.next)
            }

            UniversityCredentialsFieldContainer(title: "Password") {
                SecureField("Password", text: $password)
                    .textContentType(.password)
                    .submitLabel(.go)
            }
        }
    }
}

private struct UniversityCredentialsFieldContainer<Field: View>: View {
    let title: String
    @ViewBuilder var field: Field

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.secondary)

            field
                .font(.body)
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color(uiColor: .secondarySystemBackground))
                )
        }
    }
}
