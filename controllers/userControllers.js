const router = require("express").Router();
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

//create a test route
router.get("/hello", (req, res) => {
  res.send("Welcome to API");
});

//create a route for user registration
router.post("/register", async (req, res) => {
  console.log(req.body);

  // destructuring
  const { fname, lname, email, password } = req.body;

  //validation
  if (!fname || !lname || !email || !password) {
    return res.status(400).json({ msg: "Please enter all the fields" });
  }

  try {
    //check existing user
    const existingUser = await User.findOne({ email });
    //hash the password
    const salt = await bcrypt.genSaltSync(10);
    const passwordHash = await bcrypt.hashSync(password, salt);

    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    //create a new user
    const newUser = new User({
      fname: fname,
      lname: lname,
      email: email,
      password: passwordHash,
    });

    //save the user
    newUser.save();
    res.json({ msg: "User registered Sucessfully" });
  } catch (error) {
    res.status(500).json("User registration failed");
  }
});

//create a route for login
router.post("/login", async (req, res) => {
  console.log("login");
  console.log(req.body);
  //destructing
  const { email, password } = req.body;

  //validation
  if (!email || !password) {
    return res.status(400).json({ msg: "Please enter all the fields" });
  }
  try {
    const user = await User.findOne({ email });

    //check if user exists
    if (!user) {
      return res.status(400).json({ msg: "User does not exist" });
    }

    // checkc if paswrod is correct
    const isCorrectPassword = await bcrypt.compareSync(password, user.password);
    if (!isCorrectPassword) {
      await res.status(400).json({ msg: "Invalid Credentials" });
    }

    //creating a token and signing with jwt
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    //send the token in a HTTP- only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    //send user data
    res.json({
      token,
      user,
      msg: "User logged in successfully",
    });
  } catch (error) {
    console.log(error);
  }
});

// forgot password
router.post("/forgot_password", async (req, res) => {
  // destructuring
  const { email } = req.body;

  // validation
  if (!email) {
    return res.status(400).json({ msg: "Please enter all fields" });
  }

  try {
    //  check existing user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "User does not exists" });
    }

    // create a token
    const secret = process.env.JWT_SECRET + user.password;
    const token = jwt.sign({ email: user.email, id: user._id }, secret, {
      expiresIn: "10m",
    });

    // create a link
    const link = `http://localhost:5000/api/user/reset-password/${user._id}/${token}`;

    // send email using nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "primenotes490@gmail.com",
        pass: "tcusekosxopiarzk",
      },
    });
    // email options
    var mailOptions = {
      from: "primenotes490@gmail.com",
      to: email,
      subject: "Reset Password",
      text: `Please click on the link to reset your password: ${link}`,
    };

    // send email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent" + info.response);
      }
    });

    res.json("Verification email sent");
  } catch (error) {
    console.log(error);
    res.status(500).json("Verification email not sent");
  }
});

// update password
router.get("/reset-password/:id/:token", async (req, res) => {
  // get id and token from params
  const { id, token } = req.params;

  // if id or token is not provided
  const oldUser = await User.findOne({ _id: id });
  if (!oldUser) {
    return res.status(400).json({ msg: "User does not exists" });
  }

  // verify token
  const secret = process.env.JWT_SECRET + oldUser.password;
  try {
    // verify token
    const verifyToken = jwt.verify(token, secret);
    // if token is verified
    if (verifyToken) {
      res.render("index", { email: verifyToken.email });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json("Password reset link not verified");
  }
});

// update password
router.post("/reset-password/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;

  // check if id or token is not valid
  const oldUser = await User.findOne({ _id: id });
  if (!oldUser) {
    return res.status(400).json({ msg: "User does not exists" });
  }
  // create a token to verify
  const secret = process.env.JWT_SECRET + oldUser.password;
  try {
    const verifyToken = jwt.verify(token, secret);

    // if token is verified
    const hashedPassword = await bcrypt.hashSync(password, 10);
    await User.updateOne({ _id: id }, { $set: { password: hashedPassword } });
    res.json("Password reset successfully");
  } catch (error) {
    res.status(500).json("Password reset failed");
  }
});

module.exports = router;
