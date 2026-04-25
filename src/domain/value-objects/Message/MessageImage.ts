import { z } from "zod";

export const messageImageSchema = z.object({
  id: z.string(),
  mime_type: z.string(),
  file_size: z.number(),
  sha256: z.string(),
  link: z.string(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  caption: z.string().nullable().optional(),
});

export type MessageImageDTO = z.infer<typeof messageImageSchema>;

export class MessageImage {
  private props: MessageImageDTO;

  constructor(props: MessageImageDTO) {
    this.props = messageImageSchema.parse(props);
  }

  get id() {
    return this.props.id;
  }

  get link() {
    return this.props.link;
  }

  get caption() {
    return this.props.caption;
  }

  toDTO(): MessageImageDTO {
    return { ...this.props };
  }
}
