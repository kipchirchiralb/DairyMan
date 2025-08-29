const express = require("express");
const path = require("path");
const app = express();

// middleware
app.use(express.static(path.join(__dirname, "public"))); // static files will be served from the 'public' directory/folder

app.get("/", (req, res) => {
  // root route/landing page/index route
  res.render("index.ejs");
});
app.get("/dashboard", (req, res) => {
  res.render("dashboard.ejs");
})

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
