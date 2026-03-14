import { z } from "zod";

export const doctorIdParamSchema = z.object({
  id: z.string().min(1),
});
