# MyChatAI iOS

SwiftUI client for the existing Next.js `/api/chat` endpoint. The OpenAI API key and `tone_prompt.md` stay on the server and are never bundled into the iOS app.

## Run

1. Start the server from the repository root with `npm.cmd run dev -- --port 3000`.
2. Open `ios/MyChatAI/MyChatAI.xcodeproj` in Xcode.
3. Run the `MyChatAI` scheme on an iOS 17 or newer simulator.

The Debug configuration uses `http://127.0.0.1:3000`. For a physical iPhone, change `CHAT_API_BASE_URL` in `MyChatAI/Config/Debug.xcconfig` to the Mac's LAN address. Release builds require an HTTPS backend URL in `Release.xcconfig`.
