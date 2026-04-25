import { z } from "zod";

export const messageTextSchema = z.object({
  body: z.string().min(1),
});

export type MessageTextDTO = z.infer<typeof messageTextSchema>;

export class MessageText {
  private _body: string;

  constructor(props: MessageTextDTO) {
    const data = messageTextSchema.parse(props);
    this._body = data.body;
  }

  get body() {
    return this._body;
  }

  toDTO(): MessageTextDTO {
    return {
      body: this._body,
    };
  }
}
