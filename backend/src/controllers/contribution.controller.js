const contributionService = require("../services/contribution.service");

async function create(req, res, next) {
  try {
    const contribution = await contributionService.createContribution(
      req.body,
      req.user
    );
    res.status(201).json({ success: true, data: contribution });
  } catch (error) {
    next(error);
  }
}

async function listMine(req, res, next) {
  try {
    const { status, category, page, limit } = req.query;
    const result = await contributionService.listMyContributions(
      {
        status,
        category,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      },
      req.user
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const { status, category, clubId, userId, page, limit } = req.query;
    const result = await contributionService.listContributions(
      {
        status,
        category,
        clubId,
        userId,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      },
      req.user
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const contribution = await contributionService.getContributionById(
      req.params.id,
      req.user
    );
    res.status(200).json({ success: true, data: contribution });
  } catch (error) {
    next(error);
  }
}

async function approve(req, res, next) {
  try {
    const contribution = await contributionService.approveContribution(
      req.params.id,
      req.user
    );
    res.status(200).json({ success: true, data: contribution });
  } catch (error) {
    next(error);
  }
}

async function reject(req, res, next) {
  try {
    const contribution = await contributionService.rejectContribution(
      req.params.id,
      { rejectionReason: req.body.rejectionReason },
      req.user
    );
    res.status(200).json({ success: true, data: contribution });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await contributionService.deleteContribution(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function clubAnalytics(req, res, next) {
  try {
    const { clubId } = req.query;
    const result = await contributionService.getClubAnalytics(clubId, req.user);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function globalAnalytics(req, res, next) {
  try {
    const { clubId } = req.query;
    const result = await contributionService.getGlobalAnalytics(clubId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function leaderboard(req, res, next) {
  try {
    const { period, clubId, page, limit } = req.query;
    const result = await contributionService.getLeaderboard(
      {
        period,
        clubId,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      },
      req.user
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  listMine,
  list,
  getById,
  approve,
  reject,
  remove,
  clubAnalytics,
  globalAnalytics,
  leaderboard,
};
