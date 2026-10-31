import { Router } from "express";
import { validate } from "../middleware/validate";
import * as slotsService from "../services/slots.service";
import { resetSchema } from "../validation/reset.schema";

export const resetRouter = Router();

/** POST /reset — wipes all bookings, replaces every slot. */
resetRouter.post("/", validate(resetSchema), async (req, res) => {
  await slotsService.resetData(req.body);
  res.status(200).json({ ok: true });
});
