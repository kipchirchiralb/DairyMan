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

// middleware
app.use(express.static(path.join(__dirname, "public"))); // static files will be served from the 'public' directory/folder
app.use(express.urlencoded({ extended: true })); // body parser to decrypt incoming data to req.body

app.get("/", (req, res) => {
  // root route/landing page/index route
  res.render("index.ejs");
});
// Authentication routes
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});
app.post("/register", (req, res) => {
  const { email, phone, password, fullname, farm_location, farm_name, county } =
    req.body;
  const hashedPassword = bcrypt.hashSync(password, salt);
  const insertFarmerStatement = `INSERT INTO farmers(fullname,phone,email,password,farm_name,farm_location,county) VALUES("${fullname}","${phone}","${email}","${hashedPassword}","${farm_name}","${farm_location}","${county}")`;
  const checkEmailStatement = `SELECT email FROM farmers WHERE email="${email}"`;

  dbConn.query(checkEmailStatement, (sqlErr,data)=>{
    if(sqlErr) return res.status(500).send("Server Error")
    if(data.length > 0){
      res.send("This email is already registered. Login or reset password")
    }else{
      dbConn.query(insertFarmerStatement, (insertError)=>{
        if(insertError){
          res.status(500).send("Error while registering farmer. If this persists contact admin")
        }else{
          res.redirect("/login?message=success")
        }
      })
    }
  })
});
// Dashboard route
app.get("/dashboard", (req, res) => {
  res.render("dashboard.ejs");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
