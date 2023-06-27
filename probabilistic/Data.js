"use strict"

const express = require("express");
// const catalyst = require('zcatalyst-sdk-node');
const catalyst = require("zoho-catalyst-sdk");

// const app = express();
// app.use(express.json());
const app = express.Router();

app.all("/", (req,res) => {
	const catalystApp = catalyst.initialize(req);
	const zcql = catalystApp.zcql();
	// code
	let query = "";
	const { action } = req.query;
	if (action === "list") {
		const { table, condition } = req.query;
		if (table && condition) {
		query = `SELECT * from ${table} WHERE ${condition}`;
		}
	} else if (action === "update") {
		const { table, set, condition } = req.body;
		if (table && set && condition) {
		let fields = [];
		for (let key in set) {
			fields.push(`${key}=${set[key]}`);
		}
		query = `UPDATE ${table} SET ${fields.join(",")} WHERE ${condition}`;
		}
	} else {
		const limit = req.query.limit || 1;
		if (req.query.rowid_gt) {
		query = `WHERE ROWID > ${req.query.rowid_gt}`;
		}
		query = `SELECT * from Sessions ${query} limit ${limit}`;
	}
  
	if (query) {
		zcql.executeZCQLQuery(query).then((result)=>{
			res.status(200).send(result);
		});
	} else {
		res.status(400).send("Bad Request");
	}
});

module.exports = app;