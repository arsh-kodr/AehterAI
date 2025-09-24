const express = require("express");

const router = express.Router();
const {registerUser , loginUser} = require("../controllers/auth.controller");
const {authUser} = require("../middlewares/auth.middleware");


router.post("/register" , registerUser);    
router.post("/login" , loginUser);    
router.get("/me", authUser, async (req, res) => {
  res.status(200).json({
    message: "User fetched successfully",
    user: req.user,
  });
});

module.exports = router;