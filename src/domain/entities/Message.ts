import { z } from "zod";
import {
  MessageText,
  messageTextSchema,
} from "../value-objects/Message/MessageText";
import {
  MessageImage,
  messageImageSchema,
} from "../value-objects/Message/MessageImage";
import {
  MessageVideo,
  messageVideoSchema,
} from "../value-objects/Message/MessageVideo";
import {
  MessageAudio,
  messageAudioSchema,
} from "../value-objects/Message/MessageAudio";
import {
  MessageDocument,
  messageDocumentSchema,
} from "../value-objects/Message/MessageDocument";
import {
  MessageContext,
  messageContextSchema,
} from "../value-objects/Message/MessageContext";
import { DomainError } from "../utils/DomainError";

export const messageTypeSchema = z.enum([
  "text",
  "image",
  "video",
  "audio",
  "voice",
  "document",
  "reply",
  "system",
]);

export type MessageType = z.infer<typeof messageTypeSchema>;

export const messageSchema = z.object({
  id: z.string(),
  from_me: z.boolean(),
  type: z.string(),
  chat_id: z.string(),
  from: z.string(),
  from_name: z.string(),
  source: z.string(),
  forwarded: z.boolean(),
  is_read: z.boolean(),
  timestamp: z.coerce.date(),
  text: messageTextSchema.optional(),
  image: messageImageSchema.optional(),
  video: messageVideoSchema.optional(),
  audio: messageAudioSchema.optional(),
  document: messageDocumentSchema.optional(),
  context: messageContextSchema.optional(),
  created_at: z.coerce.date().optional(),
});

export type MessageDTO = z.infer<typeof messageSchema>;

export class Message {
  private _id: string;
  private _chat_id: string;
  private _type: MessageType;
  private _from: string;
  private _from_name: string;
  private _from_me: boolean;
  private _is_read: boolean;
  private _forwarded: boolean;
  private _source: string;

  private _text?: MessageText;
  private _image?: MessageImage;
  private _video?: MessageVideo;
  private _audio?: MessageAudio;
  private _document?: MessageDocument;
  private _context?: MessageContext;

  private _timestamp: Date;
  private _created_at?: Date;

  private constructor(props: MessageDTO) {
    this._id = props.id;
    this._chat_id = props.chat_id;
    this._type = props.type as MessageType;
    this._from = props.from;
    this._from_name = props.from_name;
    this._from_me = props.from_me;
    this._source = props.source;
    this._is_read = props.is_read;
    this._forwarded = props.forwarded;
    this._timestamp = props.timestamp;

    this._created_at = props.created_at;

    if (props.text) this._text = new MessageText(props.text);
    if (props.image) this._image = new MessageImage(props.image);
    if (props.video) this._video = new MessageVideo(props.video);
    if (props.audio) this._audio = new MessageAudio(props.audio);
    if (props.document) this._document = new MessageDocument(props.document);
    if (props.context) this._context = new MessageContext(props.context);
    if (
      !this._text &&
      !this._image &&
      !this._video &&
      !this._audio &&
      !this._document &&
      !this._context
    ) {
      throw new DomainError("Message precisa ter pelo menos um conteúdo");
    }
  }

  static create(props: Omit<MessageDTO, "created_at">): Message {
    const data = messageSchema.omit({ created_at: true }).parse(props);

    return new Message({
      ...data,
      created_at: new Date(),
    });
  }

  static restore(props: MessageDTO): Message {
    const data = messageSchema.parse(props);

    if (!data.id) {
      throw new DomainError("Message precisa de ID");
    }

    return new Message(data);
  }

  get id() {
    return this._id;
  }

  get type() {
    return this._type;
  }
  get timestamp() {
    return this._timestamp;
  }
  get is_read() {
    return this._is_read;
  }
  get from_me() {
    return this._from_me;
  }
  get from_name() {
    return this._from_name;
  }
  get contact_id() {
    return this._chat_id;
  }

  get text() {
    return this._text;
  }

  get image() {
    return this._image;
  }

  get video() {
    return this._video;
  }

  get context() {
    return this._context;
  }

  get message() {
    switch (this._type) {
      case "text":
      case "reply":
        return this._text;

      case "image":
        return this._image;

      case "video":
        return this._video;

      case "audio":
      case "voice":
        return this._audio;

      case "document":
        return this._document;

      case "system":
        return null;

      default:
        return null;
    }
  }

  set is_read(value: boolean) {
    this._is_read = value;
  }

  toDTO(): MessageDTO {
    return {
      id: this._id,
      chat_id: this._chat_id,
      type: this._type,
      from: this._from,
      from_name: this._from_name,
      from_me: this._from_me,
      source: this._source,
      timestamp: this._timestamp,
      forwarded: this._forwarded,
      is_read: this._is_read,
      created_at: this._created_at,

      text: this._text?.toDTO(),
      image: this._image?.toDTO(),
      video: this._video?.toDTO(),
      audio: this._audio?.toDTO(),
      document: this._document?.toDTO(),
      context: this._context?.toDTO(),
    };
  }
}
