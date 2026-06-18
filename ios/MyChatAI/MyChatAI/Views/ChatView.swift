import SwiftUI

struct ChatView: View {
    @StateObject private var viewModel = ChatViewModel()

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 10) {
                        if viewModel.messages.isEmpty {
                            ContentUnavailableView(
                                "머행",
                                systemImage: "bubble.left.and.bubble.right",
                                description: Text("아무 말이나 보내바")
                            )
                            .padding(.top, 120)
                        }

                        ForEach(viewModel.messages) { message in
                            MessageBubble(message: message)
                                .id(message.id)
                        }

                        if viewModel.isSending {
                            HStack {
                                ProgressView()
                                    .controlSize(.small)
                                Spacer()
                            }
                            .padding(.horizontal, 14)
                            .id("typing")
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 12)
                }
                .onChange(of: viewModel.messages.count) {
                    scrollToBottom(using: proxy)
                }
                .onChange(of: viewModel.isSending) {
                    scrollToBottom(using: proxy)
                }
            }
            .navigationTitle("채팅")
            .navigationBarTitleDisplayMode(.inline)
            .safeAreaInset(edge: .bottom) {
                MessageComposer(
                    text: $viewModel.draft,
                    isSending: viewModel.isSending
                ) {
                    Task { await viewModel.send() }
                }
            }
            .alert(
                "오류낫엉",
                isPresented: Binding(
                    get: { viewModel.errorMessage != nil },
                    set: { if !$0 { viewModel.errorMessage = nil } }
                )
            ) {
                Button("다시 보내기") {
                    Task { await viewModel.retryLastMessage() }
                }
                Button("닫기", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
        }
    }

    private func scrollToBottom(using proxy: ScrollViewProxy) {
        withAnimation(.easeOut(duration: 0.2)) {
            if viewModel.isSending {
                proxy.scrollTo("typing", anchor: .bottom)
            } else if let id = viewModel.messages.last?.id {
                proxy.scrollTo(id, anchor: .bottom)
            }
        }
    }
}

#Preview {
    ChatView()
}
