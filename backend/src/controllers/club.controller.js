const clubService = require("../services/club.service");

async function list(req, res, next) {
  try {
    // H-01: `?enriched=true` returns member counts and coordinators inline so
    // the club grid doesn't have to fire one request per card.
    const clubs = await clubService.listClubs({
      enriched: req.query.enriched === "true",
    });

    res.status(200).json({
      success: true,
      data: clubs,
    });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const club = await clubService.getClubById(req.params.id);

    res.status(200).json({
      success: true,
      data: club,
    });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const { name, description } = req.body;
    const club = await clubService.createClub({ name, description });

    res.status(201).json({
      success: true,
      data: club,
    });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const { name, description } = req.body;
    const club = await clubService.updateClub(req.params.id, {
      // Only forward keys the caller actually sent, so a rename doesn't clear
      // the description.
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    });

    res.status(200).json({
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

module.exports = { list, getById, create, update, remove };
