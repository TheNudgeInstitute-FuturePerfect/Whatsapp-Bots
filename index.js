const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const probabilistic = require("./probabilistic/index.js");

const app = express();

// Use the json and urlencoded middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use("/whatsapp/probabilistic", probabilistic);

app.listen(process.env.WHATSAPP_PORT, () => {
  console.log(`API listening on port ${process.env.WHATSAPP_PORT}!`);
});
