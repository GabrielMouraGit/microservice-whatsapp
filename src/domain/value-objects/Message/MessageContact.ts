import { z } from "zod";

export const messageContactSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  vcard: z.string(),
  phone: z.string().nullable().optional(),
});

export type MessageContactDTO = z.infer<typeof messageContactSchema>;

export class MessageContact {
  private props: MessageContactDTO;

  constructor(props: MessageContactDTO) {
    this.props = messageContactSchema.parse(props);
  }

  toDTO(): MessageContactDTO {
    return { ...this.props };
  }
}
