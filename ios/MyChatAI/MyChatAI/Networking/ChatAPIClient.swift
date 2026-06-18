import Foundation

protocol ChatAPIClientProtocol: Sendable {
    func reply(to message: String, history: [ChatMessage]) async throws -> String
}

struct ChatAPIClient: ChatAPIClientProtocol {
    enum APIError: LocalizedError {
        case invalidConfiguration
        case invalidResponse
        case server(statusCode: Int)
        case emptyReply

        var errorDescription: String? {
            switch self {
            case .invalidConfiguration:
                return "서버 주소가 이상행"
            case .invalidResponse:
                return "답장이 이상하게 왓엉"
            case let .server(statusCode):
                return "서버 오류낫엉 (\(statusCode))"
            case .emptyReply:
                return "답장이 비어잇엉"
            }
        }
    }

    private struct RequestBody: Encodable {
        struct HistoryItem: Encodable {
            let id: String
            let role: String
            let text: String
            let createdAt: Int
        }

        let message: String
        let history: [HistoryItem]
    }

    private struct ResponseBody: Decodable {
        let reply: String?
    }

    private let session: URLSession
    private let baseURL: URL

    init(
        session: URLSession = .shared,
        baseURL: URL? = AppConfiguration.apiBaseURL
    ) {
        self.session = session
        self.baseURL = baseURL ?? URL(string: "http://127.0.0.1:3000")!
    }

    func reply(to message: String, history: [ChatMessage]) async throws -> String {
        let url = baseURL.appending(path: "api/chat")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30

        let historyItems = history.suffix(6).map { item in
            RequestBody.HistoryItem(
                id: item.id.uuidString,
                role: item.role.rawValue,
                text: item.text,
                createdAt: Int(item.createdAt.timeIntervalSince1970 * 1_000)
            )
        }
        request.httpBody = try JSONEncoder().encode(
            RequestBody(message: message, history: historyItems)
        )

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            throw APIError.server(statusCode: httpResponse.statusCode)
        }

        let body = try JSONDecoder().decode(ResponseBody.self, from: data)
        guard let reply = body.reply?.trimmingCharacters(in: .whitespacesAndNewlines),
              !reply.isEmpty else {
            throw APIError.emptyReply
        }
        return reply
    }
}
