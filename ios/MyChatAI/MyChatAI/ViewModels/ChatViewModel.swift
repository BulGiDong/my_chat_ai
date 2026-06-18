import Foundation

@MainActor
final class ChatViewModel: ObservableObject {
    @Published private(set) var messages: [ChatMessage] = []
    @Published private(set) var isSending = false
    @Published var draft = ""
    @Published var errorMessage: String?

    private let apiClient: any ChatAPIClientProtocol

    init(apiClient: any ChatAPIClientProtocol = ChatAPIClient()) {
        self.apiClient = apiClient
    }

    var canSend: Bool {
        !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isSending
    }

    func send() async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isSending else { return }

        let history = messages
        messages.append(ChatMessage(role: .user, text: text))
        draft = ""
        errorMessage = nil
        isSending = true

        defer { isSending = false }

        do {
            let reply = try await apiClient.reply(to: text, history: history)
            messages.append(ChatMessage(role: .assistant, text: reply))
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func retryLastMessage() async {
        guard let lastUserMessage = messages.last(where: { $0.role == .user }) else {
            return
        }

        if messages.last?.id == lastUserMessage.id {
            messages.removeLast()
        }
        draft = lastUserMessage.text
        await send()
    }
}
