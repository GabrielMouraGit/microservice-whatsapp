import { z } from "zod";
import { DomainError } from "../utils/DomainError";

export const tenantSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome do tenant é obrigatório"),
  created_at: z.coerce.date().optional(),
});

export type TenantDTO = z.infer<typeof tenantSchema>;

export class Tenant {
  private _id: string;
  private _name: string;
  private _created_at?: Date;

  private constructor(props: TenantDTO) {
    this._id = props.id;
    this._name = props.name;
    this._created_at = props.created_at;
  }

  static create(props: Omit<TenantDTO, "created_at">): Tenant {
    const data = tenantSchema.omit({ created_at: true }).parse(props);

    return new Tenant({
      ...data,
      created_at: new Date(),
    });
  }

  static restore(props: TenantDTO): Tenant {
    const data = tenantSchema.parse(props);

    if (!data.id) {
      throw new DomainError("Tenant precisa de ID");
    }

    return new Tenant(data);
  }

  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  get created_at() {
    return this._created_at;
  }

  set name(value: string) {
    if (!value || value.trim().length === 0) {
      throw new DomainError("Nome do tenant é obrigatório");
    }

    this._name = value;
  }

  toDTO(): TenantDTO {
    return {
      id: this._id,
      name: this._name,
      created_at: this._created_at,
    };
  }
}
