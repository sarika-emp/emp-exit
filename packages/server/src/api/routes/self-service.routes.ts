// ============================================================================
// SELF-SERVICE ROUTES (employee-facing)
// POST /resign     — submit resignation
// GET /my-exit     — my exit status with summary
// GET /my-checklist — my exit checklist items
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";
import { submitResignationSchema } from "@emp-exit/shared";
import { ValidationError, NotFoundError } from "../../utils/errors";
import * as exitService from "../../services/exit/exit-request.service";
import * as checklistService from "../../services/checklist/checklist.service";
import * as buyoutService from "../../services/buyout/notice-buyout.service";
import * as letterService from "../../services/letter/letter.service";
import * as ktService from "../../services/kt/knowledge-transfer.service";

const router = Router();

router.use(authenticate);

// POST /resign — submit my resignation
router.post(
  "/resign",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = submitResignationSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid resignation data", parsed.error.flatten().fieldErrors as any);
      }

      const exit = await exitService.submitResignation(
        req.user!.empcloudOrgId,
        req.user!.empcloudUserId,
        parsed.data as any,
      );
      sendSuccess(res, exit, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /my-exit — get my exit status
router.get(
  "/my-exit",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exit = await exitService.getMyExit(
        req.user!.empcloudOrgId,
        req.user!.empcloudUserId,
      );
      sendSuccess(res, exit);
    } catch (err) {
      next(err);
    }
  },
);

// GET /my-checklist — get my exit checklist
router.get(
  "/my-checklist",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exit = await exitService.getMyExit(
        req.user!.empcloudOrgId,
        req.user!.empcloudUserId,
      );

      if (!exit) {
        return sendSuccess(res, { items: [], total: 0, completed: 0, progress: 0 });
      }

      const checklist = await checklistService.getChecklist(
        req.user!.empcloudOrgId,
        exit.id,
      );
      sendSuccess(res, checklist);
    } catch (err) {
      next(err);
    }
  },
);

// POST /my-buyout/calculate — preview buyout for my exit
router.post(
  "/my-buyout/calculate",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const userId = req.user!.empcloudUserId;

      const exit = await exitService.getMyExit(orgId, userId);
      if (!exit) {
        throw new ValidationError("You do not have an active exit request");
      }

      const { requested_last_date } = req.body;
      if (!requested_last_date) {
        throw new ValidationError("requested_last_date is required");
      }

      const calculation = await buyoutService.calculateBuyout(orgId, exit.id, requested_last_date);
      sendSuccess(res, calculation);
    } catch (err) {
      next(err);
    }
  },
);

// POST /my-buyout/request — submit buyout request for my exit
router.post(
  "/my-buyout/request",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const userId = req.user!.empcloudUserId;

      const exit = await exitService.getMyExit(orgId, userId);
      if (!exit) {
        throw new ValidationError("You do not have an active exit request");
      }

      const { requested_last_date } = req.body;
      if (!requested_last_date) {
        throw new ValidationError("requested_last_date is required");
      }

      const buyout = await buyoutService.submitBuyoutRequest(
        orgId,
        exit.id,
        requested_last_date,
        userId,
      );
      sendSuccess(res, buyout, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /my-buyout — get buyout request for my exit
router.get(
  "/my-buyout",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const userId = req.user!.empcloudUserId;

      const exit = await exitService.getMyExit(orgId, userId);
      if (!exit) {
        return sendSuccess(res, null);
      }

      const buyout = await buyoutService.getBuyoutRequest(orgId, exit.id);
      sendSuccess(res, buyout);
    } catch (err) {
      next(err);
    }
  },
);

// GET /my-letters — list the letters generated for my exit
router.get(
  "/my-letters",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const userId = req.user!.empcloudUserId;

      const exit = await exitService.getMyExit(orgId, userId);
      if (!exit) {
        return sendSuccess(res, []);
      }

      const letters = await letterService.listLetters(orgId, exit.id);
      sendSuccess(res, letters);
    } catch (err) {
      next(err);
    }
  },
);

// GET /my-letters/:letterId/download — download one of MY letters as HTML.
// Verifies the letter belongs to the requesting employee's own exit before
// serving it (a self-service user must not read another employee's letter).
router.get(
  "/my-letters/:letterId/download",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.empcloudOrgId;
      const userId = req.user!.empcloudUserId;

      const exit = await exitService.getMyExit(orgId, userId);
      if (!exit) {
        throw new NotFoundError("Generated letter", req.params.letterId as string);
      }

      const letter = (await letterService.getLetter(orgId, req.params.letterId as string)) as any;
      // Ownership guard: the letter must belong to THIS employee's exit.
      if (letter.exit_request_id !== exit.id) {
        throw new NotFoundError("Generated letter", req.params.letterId as string);
      }

      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Disposition", `attachment; filename="${letter.letter_type}_letter.html"`);
      return res.send(letter.generated_body);
    } catch (err) {
      next(err);
    }
  },
);

// GET /my-kt — the knowledge-transfer plan (with items) for my own exit.
// Resolves the employee's exit server-side so no exitId is needed in the URL.
router.get("/my-kt", async (req, res, next) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const userId = req.user!.empcloudUserId;

    const exit = await exitService.getMyExit(orgId, userId);
    if (!exit) {
      return sendSuccess(res, null);
    }

    const kt = await ktService.getKT(orgId, exit.id);
    sendSuccess(res, kt);
  } catch (err) {
    next(err);
  }
});

// PUT /my-kt/items/:itemId — let the employee mark their own KT item
// complete / reopen. Ownership is enforced: the item's KT must belong to
// the requester's own exit.
router.put("/my-kt/items/:itemId", async (req, res, next) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const userId = req.user!.empcloudUserId;

    const exit = await exitService.getMyExit(orgId, userId);
    if (!exit) {
      throw new NotFoundError("Knowledge transfer item", req.params.itemId as string);
    }

    const kt = await ktService.getKT(orgId, exit.id);
    const ownsItem = kt?.items?.some((i: any) => i.id === req.params.itemId);
    if (!ownsItem) {
      throw new NotFoundError("Knowledge transfer item", req.params.itemId as string);
    }

    const status = req.body?.status;
    if (status !== "not_started" && status !== "in_progress" && status !== "completed") {
      throw new ValidationError("status must be not_started, in_progress, or completed");
    }

    const item = await ktService.updateItem(orgId, req.params.itemId as string, { status });
    sendSuccess(res, item);
  } catch (err) {
    next(err);
  }
});

// PUT /my-kt/complete — employee formally marks their whole KT plan complete.
// Guarded: only allowed once every KT item is completed (the UI enforces this
// too, but we re-check server-side so the plan can't be closed with open items).
router.put("/my-kt/complete", async (req, res, next) => {
  try {
    const orgId = req.user!.empcloudOrgId;
    const userId = req.user!.empcloudUserId;

    const exit = await exitService.getMyExit(orgId, userId);
    if (!exit) {
      throw new NotFoundError("Knowledge transfer plan", "");
    }

    const kt = await ktService.getKT(orgId, exit.id);
    if (!kt) {
      throw new NotFoundError("Knowledge transfer plan", "");
    }

    const items = kt.items ?? [];
    const allDone = items.length > 0 && items.every((i: any) => i.status === "completed");
    if (!allDone) {
      throw new ValidationError("All KT items must be completed before finishing the KT.");
    }

    const updated = await ktService.updateKT(orgId, exit.id, { status: "completed" });
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

export { router as selfServiceRoutes };
