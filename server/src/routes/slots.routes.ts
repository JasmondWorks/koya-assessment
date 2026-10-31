import { Router } from "express";
import * as slotsService from "../services/slots.service";

export const slotsRouter = Router();

/** GET /slots?provider= — every slot, earliest start first. */
slotsRouter.get("/", async (req, res) => {
  const provider =
    typeof req.query.provider === "string" ? req.query.provider : undefined;

  const slots = await slotsService.listSlots(provider);
  res.status(200).json({ slots });
});
