const inviteLinkService = require("../services/invite-link.service");

async function create(req, res, next) {
  try {
    const { role, clubId, maxUses, expiresInDays } = req.body;

    if (!role || !maxUses || !expiresInDays) {
      return res.status(400).json({
        success: false,
        message: "role, maxUses, and expiresInDays are required",
      });
    }

    const validRoles = ["COORDINATOR", "MEMBER"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role for invite. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    if (maxUses < 1 || maxUses > 100) {
      return res.status(400).json({
        success: false,
        message: "maxUses must be between 1 and 100",
      });
    }

    if (expiresInDays < 1 || expiresInDays > 30) {
      return res.status(400).json({
        success: false,
        message: "expiresInDays must be between 1 and 30",
      });
    }

    const link = await inviteLinkService.createLink({
      role,
      clubId: clubId || null,
      maxUses: parseInt(maxUses),
      expiresInDays: parseInt(expiresInDays),
      createdById: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: link,
    });
  } catch (error) {
    next(error);
  }
}

async function validate(req, res, next) {
  try {
    const { token } = req.params;

    const link = await inviteLinkService.validateLink(token);

    res.status(200).json({
      success: true,
      data: link,
    });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const links = await inviteLinkService.listLinks(req.user.id, req.user.role);

    res.status(200).json({
      success: true,
      data: links,
    });
  } catch (error) {
    next(error);
  }
}

async function revoke(req, res, next) {
  try {
    const result = await inviteLinkService.revokeLink(
      req.params.id,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { create, validate, list, revoke };
