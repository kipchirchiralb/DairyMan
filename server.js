const express = require("express");
const path = require("path");
const app = express();
const mysql = require("mysql");
const dbConn = mysql.createConnection({
  host: "localhost",
  database: "dairyman",
  user: "root",
  password: "password",
  port: 3307,
});
const bcrypt = require("bcrypt");
const salt = bcrypt.genSaltSync(13);
const session = require("express-session");
const sqlQueries = require("./sqlStatement.js");
const utils = require("./utils.js");

// middleware
app.use(express.static(path.join(__dirname, "public"))); // static files will be served from the 'public' directory/folder
app.use(express.urlencoded({ extended: true })); // body parser to decrypt incoming data to req.body
app.use(
  session({
    secret: "ojfsklfsmkfsmfsjfskjkfsjfkjkfjs",
    resave: false,
    saveUninitialized: true,
  })
);
// authorization middleware
const protectedRoutes = ["/dashboard", "/expenses", "/animal-profiles"];
app.use((req, res, next) => {
  if (protectedRoutes.includes(req.path)) {
    // check if user is logged in
    if (req.session && req.session.farmer) {
      console.log(req.session.farmer);

      res.locals.farmer = req.session.farmer;
      next();
    } else {
      res.redirect("/login?message=unauthorized");
    }
  } else {
    next();
  }
});

// root route/landing page/index route
app.get("/", (req, res) => {
  res.render("index.ejs");
});
// Authentication routes
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/login", (req, res) => {
  const message = req.query.message;
  if (message === "exists") {
    res.locals.message = "Email already exists. Please login.";
  } else if (message === "success") {
    res.locals.message = "Registration successful. Please login.";
  } else if (message === "invalid") {
    res.locals.message = "Invalid email or password. Try again";
  } else if (message === "unauthorized") {
    res.locals.message = "Your are unauthorized to access that page.";
  }
  res.render("login.ejs");
});
app.post("/register", (req, res) => {
  const { email, phone, password, fullname, farm_location, farm_name, county } =
    req.body;
  const hashedPassword = bcrypt.hashSync(password, salt);
  const insertFarmerStatement = `INSERT INTO farmers(fullname,phone,email,password,farm_name,farm_location,county) VALUES("${fullname}","${phone}","${email}","${hashedPassword}","${farm_name}","${farm_location}","${county}")`;
  const checkEmailStatement = `SELECT email FROM farmers WHERE email="${email}"`;

  dbConn.query(checkEmailStatement, (sqlErr, data) => {
    if (sqlErr) return res.status(500).send("Server Error");
    if (data.length > 0) {
      res.redirect("/login?message=exists");
    } else {
      dbConn.query(insertFarmerStatement, (insertError) => {
        if (insertError) {
          res
            .status(500)
            .send(
              "Error while registering farmer. If this persists contact admin"
            );
        } else {
          res.redirect("/login?message=success");
        }
      });
    }
  });
});

app.post("/login", (req, res) => {
  console.log(req.body);
  const { email, password } = req.body;
  const checkEmailStatement = `SELECT farmer_id,email,fullname,password FROM farmers WHERE email="${email}"`;
  dbConn.query(checkEmailStatement, (sqlErr, data) => {
    if (sqlErr) return res.status(500).send("Server Error");
    if (data.length === 0) {
      res.redirect("/login?message=invalid");
    } else {
      const user = data[0];
      console.log(user);
      const passwordMatch = bcrypt.compareSync(password, user.password); // bcrypt to compare hashed passwords
      if (passwordMatch) {
        // create a session and redirect to dashboard
        req.session.farmer = user; // setting session for a farmer - a cookie is set in the req/browser
        res.redirect("/dashboard");
      } else {
        res.redirect("/login?message=invalid");
      }
    }
  });
});
// console.log(bcrypt.hashSync("john123", salt));

console.log(sqlQueries.getProductionRecordsForFarmer(4));

// Dashboard route
app.get("/dashboard", (req, res) => {
  dbConn.query(
    sqlQueries.getProductionRecordsForFarmer(req.session.farmer.farmer_id),
    (sqlErr, data) => {
      if (sqlErr) return res.status(500).send("Server Error!" + sqlErr);
      const groupedData = utils.groupAndExtractLatest(data);
      res.render("dashboard.ejs", { groupedData });
    }
  );
});

app.get("/animal-profiles", (req, res) => {
  dbConn.query(
    sqlQueries.getAnimalsProductionsForFarmer(req.session.farmer.farmer_id),
    (sqlErr, animals) => {
      if (sqlErr) return res.status(500).send("Server Error!" + sqlErr);
      console.log(utils.getChartData(animals));

      res.render("animal-profiles.ejs", {
        animals: utils.getChartData(animals),
      });
    }
  );
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
