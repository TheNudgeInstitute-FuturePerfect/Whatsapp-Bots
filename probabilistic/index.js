const express = require("express");
const app = express.Router();

const getEnglishProficiency = require("./getEnglishProficiency.js");

app.use("/getEnglishProficiency", getEnglishProficiency);

module.exports = app;
