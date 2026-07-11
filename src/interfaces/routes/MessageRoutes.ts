import { FastifyInstance } from "fastify";
import { messageController } from "container";
import { MessageAdapters } from "../adapters/MessageAdapters";

const adapters = new MessageAdapters(messageController);

export async function MessageRoutes(net: FastifyInstance) {
  net.post("/api/v1/message/send-text", adapters.httpSendText.bind(adapters));

  net.post("/api/v1/message/send-image", adapters.httpSendImage.bind(adapters));

  net.post("/api/v1/message/send-video", adapters.httpSendVideo.bind(adapters));

  net.post("/api/v1/message/send-audio", adapters.httpSendAudio.bind(adapters));

  net.post("/api/v1/message/send-voice", adapters.httpSendVoice.bind(adapters));

  net.post(
    "/api/v1/message/send-document",
    adapters.httpSendDocument.bind(adapters),
  );
  net.post(
    "/api/v1/message/delete-message",
    adapters.httpDeleteMessage.bind(adapters),
  );
  net.post(
    "/api/v1/message/edit-message",
    adapters.httpEditMessage.bind(adapters),
  );
  net.post(
    "/api/v1/message/forward-message",
    adapters.httpForwardMessage.bind(adapters),
  );

  net.post(
    "/api/v1/message/mark-chat-as-read",
    adapters.httpMarkChatAsRead.bind(adapters),
  );

  net.post(
    "/api/v1/message/send-typing",
    adapters.httpSendTyping.bind(adapters),
  );

  net.post(
    "/api/v1/message/mark-as-read",
    adapters.httpMarkAsRead.bind(adapters),
  );

  // Reactions
  net.post(
    "/api/v1/message/send-reaction",
    adapters.httpSendReaction.bind(adapters),
  );
  net.post(
    "/api/v1/message/remove-reaction",
    adapters.httpRemoveReaction.bind(adapters),
  );

  // Message actions
  net.post(
    "/api/v1/message/star-message",
    adapters.httpStarMessage.bind(adapters),
  );
  net.post(
    "/api/v1/message/pin-message",
    adapters.httpPinMessage.bind(adapters),
  );
  net.post(
    "/api/v1/message/delete-for-me",
    adapters.httpDeleteMessageForMe.bind(adapters),
  );

  // Presence
  net.post(
    "/api/v1/message/send-recording",
    adapters.httpSendRecording.bind(adapters),
  );
  net.post(
    "/api/v1/message/subscribe-presence",
    adapters.httpSubscribePresence.bind(adapters),
  );

  // Chat management
  net.post(
    "/api/v1/message/archive-chat",
    adapters.httpArchiveChat.bind(adapters),
  );
  net.post("/api/v1/message/mute-chat", adapters.httpMuteChat.bind(adapters));
  net.post(
    "/api/v1/message/delete-chat",
    adapters.httpDeleteChat.bind(adapters),
  );
  net.post("/api/v1/message/clear-chat", adapters.httpClearChat.bind(adapters));

  // Rich content messages
  net.post(
    "/api/v1/message/send-location",
    adapters.httpSendLocation.bind(adapters),
  );
  net.post(
    "/api/v1/message/send-contact",
    adapters.httpSendContactCard.bind(adapters),
  );
  net.post(
    "/api/v1/message/send-sticker",
    adapters.httpSendSticker.bind(adapters),
  );
  net.post("/api/v1/message/send-poll", adapters.httpSendPoll.bind(adapters));
}
