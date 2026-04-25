import { z } from "zod";

export const messageContextSchema = z.object({
  quoted_id: z.string(),
  quoted_author: z.string(),
  quoted_type: z.string(),
});

export type MessageContextDTO = z.infer<typeof messageContextSchema>;

export class MessageContext {
  private props: MessageContextDTO;

  constructor(props: MessageContextDTO) {
    this.props = messageContextSchema.parse(props);
  }

  get quoted_id() {
    return this.props.quoted_id;
  }

  toDTO(): MessageContextDTO {
    return { ...this.props };
  }
}
