import { Tenant } from "../entities/Tenant";

export interface ITenant {
  register(data: Tenant): Promise<void>;
}
