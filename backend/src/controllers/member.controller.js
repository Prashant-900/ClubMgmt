const memberService = require("../services/member.service");

async function list(req, res, next) {
  try {
    const { role, page, limit, clubId, search, clubStatus } = req.query;

    const result = await memberService.listMembers({
      role,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      clubId,
      search,
      clubStatus,
    }, req.user);

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
    const member = await memberService.getMemberById(req.params.id, req.user);

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
    const result = await memberService.removeMember(
      req.params.id,
      req.user.id,
      req.user.role,
      req.user.clubId
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function promote(req, res, next) {
  try {
    const { clubId } = req.body;
    const member = await memberService.promoteMember(req.params.id, clubId);

    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

async function assign(req, res, next) {
  try {
    const { clubId, role } = req.body;
    const member = await memberService.assignMemberToClub(req.params.id, { clubId, role });

    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { list, getById, remove, promote, assign };
