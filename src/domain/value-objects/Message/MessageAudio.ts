import { z } from "zod";

export const messageAudioSchema = z.object({
  id: z.string(),

  mime_type: z.string(),

  file_size: z.preprocess(
    (val) => (val !== undefined ? Number(val) : undefined),
    z.number(),
  ),

  sha256: z.string(),

  seconds: z.preprocess(
    (val) => (val !== undefined ? Number(val) : undefined),
    z.number().optional(),
  ),
  link: z.string(),
});

export type MessageAudioDTO = z.infer<typeof messageAudioSchema>;

export class MessageAudio {
  private props: MessageAudioDTO;

  constructor(props: MessageAudioDTO) {
    this.props = { ...messageAudioSchema.parse(props) };
  }

  toDTO(): MessageAudioDTO {
    return { ...this.props };
  }
}
