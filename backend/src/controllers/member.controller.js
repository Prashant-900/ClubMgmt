const memberService = require("../services/member.service");

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
    const result = await memberService.removeMember(req.params.id, req.user.id, req.user.role);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { list, getById, remove };
