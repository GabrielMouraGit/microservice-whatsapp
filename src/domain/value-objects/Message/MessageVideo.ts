import { z } from "zod";

export const messageVideoSchema = z.object({
  id: z.string(),
  mime_type: z.string(),
  file_size: z.number(),
  sha256: z.string(),

  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  seconds: z.number().nullable().optional(),
  caption: z.string().nullable().optional(),
  link: z.string(),
});

export type MessageVideoDTO = z.infer<typeof messageVideoSchema>;

export class MessageVideo {
  private props: MessageVideoDTO;

  constructor(props: MessageVideoDTO) {
    this.props = messageVideoSchema.parse(props);
  }

  toDTO(): MessageVideoDTO {
    return { ...this.props };
  }
}
