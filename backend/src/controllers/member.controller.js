const memberService = require("../services/member.service");

async function invite(req, res, next) {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: "Email and role are required",
      });
    }

    const validRoles = ["ADMIN", "COORDINATOR", "MEMBER"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    const member = await memberService.inviteMember({
      email,
      role,
      invitedById: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const { role, page, limit } = req.query;

    const result = await memberService.listMembers({
      role,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const member = await memberService.getMemberById(req.params.id);

    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await memberService.removeMember(req.params.id, req.user.id);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { invite, list, getById, remove };
