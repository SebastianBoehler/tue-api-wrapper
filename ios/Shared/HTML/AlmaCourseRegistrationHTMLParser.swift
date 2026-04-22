import Foundation

struct AlmaRegistrationStartRequest {
    var actionURL: URL
    var payload: [String: String]
    var enctype: String?
    var action: String
}

struct AlmaCourseRegistrationConfirmRequest {
    var actionURL: URL
    var payload: [String: String]
    var selectedOption: AlmaCourseRegistrationOption
}

enum AlmaCourseRegistrationHTMLParser {
    static func extractStartRequest(from html: String, pageURL: URL) throws -> AlmaRegistrationStartRequest? {
        guard let form = AlmaCourseRegistrationHTMLFormSupport.form(named: "detailViewData", in: html) else {
            return nil
        }
        let (target, jsFields) = AlmaCourseRegistrationHTMLFormSupport.findRegistrationStartTarget(in: form.body)
        guard let target else {
            return nil
        }

        var payload = AlmaCourseRegistrationHTMLFormSupport.formPayload(in: form.body)
        for (key, value) in jsFields where AlmaCourseRegistrationHTMLFormSupport.detailActionFields.contains(key) {
            payload[key] = value
        }
        AlmaCourseRegistrationHTMLFormSupport.setAssignmentRowLimits(in: &payload)

        let formID = HTMLRegex.attribute("id", in: form.tag)
            ?? HTMLRegex.attribute("name", in: form.tag)
            ?? "detailViewData"
        payload["\(formID)_SUBMIT"] = payload["\(formID)_SUBMIT"] ?? "1"
        payload["\(formID):_idcl"] = target
        payload["belegungsAktion"] = payload["belegungsAktion"] ?? AlmaCourseRegistrationHTMLFormSupport.registrationAction
        AlmaCourseRegistrationHTMLFormSupport.fillDetailIdentifiers(in: &payload, pageURL: pageURL)

        return AlmaRegistrationStartRequest(
            actionURL: try AlmaCourseRegistrationHTMLFormSupport.resolveURL(
                from: HTMLRegex.attribute("action", in: form.tag) ?? "",
                pageURL: pageURL
            ),
            payload: payload,
            enctype: HTMLRegex.attribute("enctype", in: form.tag),
            action: payload["belegungsAktion"] ?? AlmaCourseRegistrationHTMLFormSupport.registrationAction
        )
    }

    static func buildConfirmRequest(
        from html: String,
        pageURL: URL,
        planelementID: String? = nil
    ) throws -> AlmaCourseRegistrationConfirmRequest {
        guard let form = AlmaCourseRegistrationHTMLFormSupport.form(named: "enrollForm", in: html) else {
            throw AlmaClientError.courseRegistration("Alma did not expose the course-registration confirmation form.")
        }

        let options = extractOptions(from: html)
        let selected = try AlmaCourseRegistrationHTMLFormSupport.selectOption(from: options, planelementID: planelementID)
        var payload = AlmaCourseRegistrationHTMLFormSupport.formPayload(in: form.body)
        let formID = HTMLRegex.attribute("id", in: form.tag)
            ?? HTMLRegex.attribute("name", in: form.tag)
            ?? "enrollForm"
        payload["\(formID)_SUBMIT"] = payload["\(formID)_SUBMIT"] ?? "1"
        payload["planelementId"] = selected.planelementID
        payload["belegungsAktion"] = AlmaCourseRegistrationHTMLFormSupport.registrationAction
        payload["\(formID):_idcl"] = selected.actionName

        return AlmaCourseRegistrationConfirmRequest(
            actionURL: try AlmaCourseRegistrationHTMLFormSupport.resolveURL(
                from: HTMLRegex.attribute("action", in: form.tag) ?? "",
                pageURL: pageURL
            ),
            payload: payload,
            selectedOption: selected
        )
    }

    static func extractOptions(from html: String) -> [AlmaCourseRegistrationOption] {
        guard let form = AlmaCourseRegistrationHTMLFormSupport.form(named: "enrollForm", in: html) else {
            return []
        }

        var options: [AlmaCourseRegistrationOption] = []
        var seen = Set<String>()
        let scopes = AlmaCourseRegistrationHTMLFormSupport.rowScopes(in: form.body)
        for scope in scopes {
            for control in AlmaCourseRegistrationHTMLFormSupport.controlBlocks(in: scope) {
                guard let actionName = AlmaCourseRegistrationHTMLFormSupport.registrationConfirmActionName(for: control),
                      let planelementID = AlmaCourseRegistrationHTMLFormSupport.extractPlanelementID(from: control, scope: scope) else {
                    continue
                }
                let key = "\(planelementID)|\(actionName)"
                guard seen.insert(key).inserted else {
                    continue
                }
                options.append(
                    AlmaCourseRegistrationOption(
                        planelementID: planelementID,
                        label: AlmaCourseRegistrationHTMLFormSupport.optionLabel(
                            from: scope,
                            fallbackIndex: options.count + 1
                        ),
                        actionName: actionName
                    )
                )
            }
        }
        return options
    }

    static func extractMessages(from html: String) -> [String] {
        let patterns = [
            #"<ul\b[^>]*class\s*=\s*(['"])[^'"]*\blistMessages\b[^'"]*\1[^>]*>(.*?)</ul>"#,
            #"<div\b[^>]*class\s*=\s*(['"])[^'"]*messages-infobox-scroll-container[^'"]*\1[^>]*>(.*?)</div>"#,
            #"<div\b[^>]*class\s*=\s*(['"])[^'"]*ui-messages[^'"]*\1[^>]*>(.*?)</div>"#
        ]
        var messages: [String] = []
        var seen = Set<String>()

        for pattern in patterns {
            for match in HTMLRegex.matches(pattern, in: html) {
                guard let containerRange = Range(match.range(at: 2), in: html) else {
                    continue
                }
                let container = String(html[containerRange])
                for item in HTMLRegex.matches(#"<li\b[^>]*>(.*?)</li>"#, in: container) {
                    guard let itemRange = Range(item.range(at: 1), in: container) else {
                        continue
                    }
                    let message = HTMLText.stripTags(String(container[itemRange]))
                    guard !message.isEmpty, seen.insert(message).inserted else {
                        continue
                    }
                    messages.append(message)
                }
            }
        }
        return messages
    }

    static func extractStatus(from html: String, messages: [String]) -> String? {
        let text = HTMLText.stripTags(([messages.joined(separator: " "), html].joined(separator: " ")))
        let positiveText = text.replacingOccurrences(
            of: #"\bnicht\s+angemeldet\b"#,
            with: "",
            options: .regularExpression
        )
        if positiveText.range(of: #"\bangemeldet\b"#, options: .regularExpression) != nil {
            return "registered"
        }
        if text.range(of: #"\b(nicht\s+angemeldet|abgemeldet)\b"#, options: .regularExpression) != nil {
            return "not_registered"
        }
        return nil
    }
}
