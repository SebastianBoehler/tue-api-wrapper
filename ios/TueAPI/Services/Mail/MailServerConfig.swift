import Foundation

struct MailServerConfig {
    var host: String
    var port: UInt16

    static let uniTuebingen = MailServerConfig(
        host: "mailserv.uni-tuebingen.de",
        port: 993
    )
}
