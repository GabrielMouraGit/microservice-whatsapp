import { z } from "zod";

export const messageDocumentSchema = z.object({
  id: z.string(),
  mime_type: z.string(),
  file_size: z.number(),
  sha256: z.string(),
  filename: z.string(),
  link: z.string(),
});

export type MessageDocumentDTO = z.infer<typeof messageDocumentSchema>;

export class MessageDocument {
  private props: MessageDocumentDTO;

  constructor(props: MessageDocumentDTO) {
    this.props = messageDocumentSchema.parse(props);
  }

  toDTO(): MessageDocumentDTO {
    return { ...this.props };
  }
}
