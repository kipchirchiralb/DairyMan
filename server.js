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
const protectedRoutes = [
  "/dashboard",
  "/expenses",
  "/animal-profiles",
  "/new-animal",
  "/milk-production",
  "/add-milk-production",
];
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

      dbConn.query(
        `select * from animal WHERE owner_id=${req.session.farmer.farmer_id}`,
        (err, allAnimalsForFarmer) => {
          res.render("animal-profiles.ejs", {
            animals: utils.getChartData(animals),
            allAnimalsForFarmer,
          });
        }
      );
    }
  );
});

app.post("/add-milk-production", (req, res) => {
  let {animal_unique_val, production_date, production_time, quantity, quality } =
    req.body;
  quality = quality || "High";
  const insertProductionStatement = `INSERT INTO milkproduction(animal_id,production_date,production_time,quantity,quality) VALUES("${animal_unique_val}","${production_date}","${production_time}",${quantity}, "${quality}")`;
  dbConn.query(insertProductionStatement, (sqlErr) => {
    if (sqlErr) {
      console.log(sqlErr);
      return res.status(500).send("Server Error!" + sqlErr);
    }
    res.redirect("/milk-production");
  });
});

app.post("/new-animal", (req, res) => {
  let { animal_tag, dob, purchase_date, breed, name, source, gender, status } =
    req.body;
  purchase_date.length == 0
    ? (purchase_date = "2000-01-01")
    : (purchase_date = purchase_date);
  console.log(req.body);

  const insertAnimalStatement = `INSERT INTO animal(animal_tag,name,dob,purchase_date,breed,status,source,gender,owner_id) VALUES("${animal_tag}","${name}","${dob}","${purchase_date}","${breed}","${status}","${source}","${gender}", ${req.session.farmer.farmer_id})`;

  dbConn.query(insertAnimalStatement, (sqlErr) => {
    if (sqlErr) {
      console.log(sqlErr);
      return res.status(500).send("Server Error!" + sqlErr);
    }
    res.redirect("/animal-profiles");
  });
});

app.get("/milk-production", (req, res) => {
  const productionQuery = `
    SELECT 
        Animal.animal_tag,
        Animal.name as animal_name,
        MilkProduction.production_date,
        MilkProduction.production_time,
        quantity
    FROM MilkProduction 
    JOIN Animal ON MilkProduction.animal_id = Animal.animal_tag
    JOIN Farmers ON Animal.owner_id = Farmers.farmer_id
    WHERE Farmers.farmer_id = ${req.session.farmer.farmer_id}
    ORDER BY MilkProduction.production_date DESC
    LIMIT 30;`;

  dbConn.query(productionQuery, (sqlErr, productions) => {
    if (sqlErr) return res.status(500).send("Server Error!" + sqlErr);
    console.log(productions);
    res.render("milk-production.ejs", { productions });
  });
});

app.get("/add-milk-production", (req, res) => {
  dbConn.query(
    `SELECT animal_tag,name FROM animal WHERE owner_id=${req.session.farmer.farmer_id} AND status = "Alive" AND gender = "Female"`,
    (sqlErr, animals) => {
      res.render("add-milk-production.ejs", { animals });
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
