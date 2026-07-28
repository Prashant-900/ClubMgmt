const { Router } = require("express");
const clubController = require("../controllers/club.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = Router();

/**
 * GET /api/clubs — list all clubs.
 *
 * The plain list is public (no auth) so the invite/registration form can
 * populate its club dropdown before the visitor has an account.
 *
 * `?enriched=true` additionally returns member counts and coordinator names,
 * which is internal information — so that variant requires a token even though
 * the base route does not.
 */
router.get(
  "/",
  (req, res, next) => {
    if (req.query.enriched === "true") {
      return authenticate(req, res, next);
    }
    return next();
  },
  clubController.list
);

// Everything below requires authentication.
router.use(authenticate);

router.get("/:id", clubController.getById);

router.post("/", authorize("ADMIN"), clubController.create);

// Renaming a club or editing its description is an admin action.
router.patch("/:id", authorize("ADMIN"), clubController.update);

router.delete("/:id", authorize("ADMIN"), clubController.remove);

module.exports = router;
