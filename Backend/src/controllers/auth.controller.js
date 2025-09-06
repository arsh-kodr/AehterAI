const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const jwt_Secret = process.env.JWT_SECRET;

async function registerUser(req, res) {
  const {
    fullName: { firstName, lastName },
    email,
    password,
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Please enter email & password",
    });
  }

  const isUserAlreadyExist = await userModel.findOne({
    email,
  });

  if (isUserAlreadyExist) {
    return res.status(400).json({
      message: "User Already Exist",
    });
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const user = await userModel.create({
    fullName: {
      firstName,
      lastName,
    },
    password: hashPassword,
    email,
  });

  const token = jwt.sign(
    {
      id: user._id,
    },
    jwt_Secret
  );

  res.cookie("token", token);

  res.status(201).json({
    message: "User Created Successfully",
    token,
    user,
  });
}

async function loginUser(req, res ) {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email });

  if (!user) {
    return res.status(422).json({
      message: "Invalid Email or Password",
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(422).json({
      message: "Invalid Email or Password",
    });
  }

  const token = jwt.sign(
    {
      id: user._id,
    },
    jwt_Secret
  );

  res.cookie("token", token);

  res.status(200).json({
    message: "User Logged In Successfully",
    user,
    token,
  });
}

module.exports = {
  registerUser,
  loginUser
};
