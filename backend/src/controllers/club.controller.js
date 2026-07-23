const clubService = require("../services/club.service");

async function list(req, res, next) {
  try {
    const clubs = await clubService.listClubs();

    res.status(200).json({
      success: true,
      data: clubs,
    });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const { name } = req.body;
    const club = await clubService.createClub(name);

    res.status(201).json({
      success: true,
      data: club,
    });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await clubService.deleteClub(req.params.id);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { list, create, remove };