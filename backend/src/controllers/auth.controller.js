const authService = require("../services/auth.service");

async function register(req, res, next) {
  try {
    const { inviteToken, email, password, name, phone } = req.body;

    if (!inviteToken || !email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "inviteToken, email, password, and name are required",
      });
    }

    const result = await authService.register({
      inviteToken,
      email,
      password,
      name,
      phone,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await authService.login({ email, password });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const profile = await authService.getProfile(req.user.id);

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, getProfile };
