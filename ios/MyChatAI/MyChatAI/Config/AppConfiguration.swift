import Foundation

enum AppConfiguration {
    static var apiBaseURL: URL? {
        guard let value = Bundle.main.object(
            forInfoDictionaryKey: "ChatAPIBaseURL"
        ) as? String else {
            return nil
        }

        return URL(string: value)
    }
}
