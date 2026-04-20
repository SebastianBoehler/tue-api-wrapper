import Foundation

struct UniversityHTMLForm {
    var actionURL: URL
    var payload: [(String, String)]

    func applying(credentials: AlmaCredentials) -> UniversityHTMLForm {
        var next = self
        next.payload = payload.map { name, value in
            switch name {
            case "j_username":
                (name, credentials.username)
            case "j_password":
                (name, credentials.password)
            default:
                (name, value)
            }
        }
        if !next.payload.contains(where: { $0.0 == "_eventId_proceed" }) {
            next.payload.append(("_eventId_proceed", ""))
        }
        return next
    }
}

enum UniversityHTMLFormParser {
    static func linkURL(containing marker: String, in html: String, pageURL: URL) throws -> URL {
        for match in HTMLRegex.matches(#"<a\b[^>]*href\s*=\s*(['"])(.*?)\1[^>]*>"#, in: html) {
            guard let tagRange = Range(match.range(at: 0), in: html) else {
                continue
            }
            let tag = String(html[tagRange])
            guard let href = HTMLRegex.attribute("href", in: tag), href.contains(marker) else {
                continue
            }
            return try resolve(href, pageURL: pageURL)
        }
        throw UniversityPortalError.parsing("Could not find the portal login link.")
    }

    static func idpLoginForm(in html: String, pageURL: URL) throws -> UniversityHTMLForm {
        for form in forms(in: html) where form.payload.contains(where: { $0.0 == "j_password" }) {
            return try UniversityHTMLForm(actionURL: actionURL(from: form.tag, pageURL: pageURL), payload: form.payload)
        }
        throw UniversityPortalError.parsing("Could not find the university login form.")
    }

    static func hiddenForm(
        in html: String,
        pageURL: URL,
        requiredFields: Set<String>
    ) throws -> UniversityHTMLForm {
        for form in forms(in: html) {
            let names = Set(form.payload.map(\.0))
            guard requiredFields.isSubset(of: names) else {
                continue
            }
            return try UniversityHTMLForm(actionURL: actionURL(from: form.tag, pageURL: pageURL), payload: form.payload)
        }
        throw UniversityPortalError.parsing("Could not find the expected portal handoff form.")
    }

    static func idpError(in html: String) -> String? {
        let pattern = #"<[^>]*class\s*=\s*(['"])[^'"]*\bform-error\b[^'"]*\1[^>]*>(.*?)</[^>]+>"#
        return HTMLRegex.firstCapture(pattern, in: html, group: 2)
            .map(HTMLText.stripTags)
            .flatMap { $0.isEmpty ? nil : $0 }
    }

    private static func forms(in html: String) -> [(tag: String, payload: [(String, String)])] {
        let pattern = #"(<form\b[^>]*>)(.*?)</form>"#
        return HTMLRegex.matches(pattern, in: html).compactMap { match in
            guard let tagRange = Range(match.range(at: 1), in: html),
                  let bodyRange = Range(match.range(at: 2), in: html) else {
                return nil
            }
            let tag = String(html[tagRange])
            return (tag, inputPayload(in: String(html[bodyRange])))
        }
    }

    private static func inputPayload(in html: String) -> [(String, String)] {
        HTMLRegex.matches(#"<input\b[^>]*>"#, in: html).compactMap { match in
            guard let range = Range(match.range(at: 0), in: html) else {
                return nil
            }
            let tag = String(html[range])
            guard let name = HTMLRegex.attribute("name", in: tag), !name.isEmpty else {
                return nil
            }
            if HTMLRegex.attribute("type", in: tag)?.lowercased() == "checkbox" {
                return nil
            }
            return (name, HTMLRegex.attribute("value", in: tag) ?? "")
        }
    }

    private static func actionURL(from formTag: String, pageURL: URL) throws -> URL {
        try resolve(HTMLRegex.attribute("action", in: formTag) ?? "", pageURL: pageURL)
    }

    private static func resolve(_ rawURL: String, pageURL: URL) throws -> URL {
        guard let url = URL(string: rawURL, relativeTo: pageURL)?.absoluteURL else {
            throw UniversityPortalError.invalidURL("The portal returned an invalid URL.")
        }
        return url
    }
}
