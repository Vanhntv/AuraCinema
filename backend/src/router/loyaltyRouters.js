import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";
import { getMembership, getPointHistory, listRewardOffers, redeemReward, saveRewardOffer, previewGrant, confirmGrant, grantHistory } from "../services/loyaltyService.js";

const router = express.Router();
const customer = [authMiddleware, authorizeRoles("user")];
const admin = [authMiddleware, authorizeRoles("admin")];
const respond = (work) => async (req, res, next) => {
  try { res.json({ success: true, ...await work(req) }); } catch (error) { next(error); }
};
router.get("/membership", customer, respond(async req => ({ data: await getMembership(req.user.id) })));
router.get("/points", customer, respond(req => getPointHistory(req.user.id, req.query)));
router.get("/rewards", customer, respond(async () => ({ data: await listRewardOffers() })));
router.post("/rewards/:id/redeem", customer, respond(async req => ({ data: await redeemReward(req.user.id, req.params.id, req.body.key) })));
router.get("/admin/rewards", admin, respond(async () => ({ data: await listRewardOffers(true) })));
router.put("/admin/rewards", admin, respond(async req => ({ data: await saveRewardOffer(req.body) })));
router.post("/admin/grants/preview", admin, respond(async req => ({ data: await previewGrant(req.user.id, req.body) })));
router.post("/admin/grants/:id/confirm", admin, respond(async req => ({ data: await confirmGrant(req.user.id, req.params.id) })));
router.get("/admin/grants", admin, respond(req => grantHistory(req.query.page)));
export default router;
