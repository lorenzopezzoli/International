// Copyright [2018] [Banana.ch SA - Lugano Switzerland]
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// @id = sa.app.vatreport.2018
// @api = 1.0
// @pubdate = 2017-12-27
// @publisher = Banana.ch SA
// @description = Saudi Arabia: VAT return  2018 (Beta)
// @task = app.command
// @doctype = 100.110;110.110;130.110;100.130
// @docproperties =
// @outputformat = none
// @inputdataform = none
// @timeout = -1


/*
SUMMARY
-------
Saudi Arabia  VAT report -
 **/

/* Function that loads some parameters */
function loadParam(param, banDoc, startDate, endDate) {
	param.scriptVersion = Banana.script.getParamLocaleValue('pubdate');
	param.headerLeft = banDoc.info("Base", "HeaderLeft");
	param.vatNumber = banDoc.info("AccountingDataBase", "VatNumber");
	param.startDate = startDate;
	param.endDate = endDate;
}

/* Function that loads all the description texts */
function loadText(param, banDoc) {
	var lan = banDoc.info("Base", "Language");
	param.text = {};
	param.text.reportName = "VAT Report Saudi Arabia";
	param.text.title = "VAT Return Form";
	param.text.version = "Version " + param.scriptVersion + " (BETA)";
	param.text.period = "Report Period: ";
	param.text.vatNum = "VAT identification number: ";
	param.text.headerAmount = "Amount";
	param.text.headerAdjustments = "Adjoustment";
	param.text.headerVat = "VAT amount";
	param.text.headerCurrency = "(SAD)";
	param.text.description1 = "- 1 Stanadard rated Sales";
	param.text.description2 = "– 2 Sales to customers in VAT implementing GCC countries";
	param.text.description3 = "- 3 Zero rated domestic sales";
	param.text.description4 = "- 4 Exports:";
	param.text.description5 = "- 5 Exempt sales:";
	param.text.description6 = "- 6 Total sales";
	param.text.description7 = "- 7 Standard rated domestic purchases";
	param.text.description8 = "- 8 Imports subject to VAT paid at customs";
	param.text.description9 = "- 9 Imports subject to VAT accounted for through reverse charge mechanism";
	param.text.description10 = "- 10 Zero rated purchases";
	param.text.description11 = "- 11 Exempt purchases:";
	param.text.description12 = "- 12 Total purchases";
	param.text.description13 = "- 13 Total VAT due for the current period";
	param.text.description14 = "- 14 Corrections from previous period (between SAR ±5,000)";
	param.text.description15 = "- 15 VAT credit carried forward from previous period(s)";
	param.text.description16 = "- 16 Net VAT due (or reclaimed)";

}

/* Main function */
function exec() {

	var param = {};
	//Check the version of Banana. If < than 9.0.0.171128 the script does not start
	var requiredVersion = "9.0.0.171128";
	if (Banana.compareVersion && Banana.compareVersion(Banana.application.version, requiredVersion) >= 0) {

		var dateform = getPeriodSettings(param);
		if (!dateform) {
			return;
		}

		//Check if we are on an opened document
		if (!Banana.document) {
			return;
		}

		//Create the VAT report
		var report = createVatReport(param, Banana.document, dateform.selectionStartDate, dateform.selectionEndDate);

		//Add styles and print the report
		var stylesheet = createStyleSheet();
		Banana.Report.preview(report, stylesheet);

	} else {
		return;
	}
}

/* Function that creates and prints the report */
function createVatReport(param, banDoc, startDate, endDate) {

	/* 1) Load parameters and form */
	loadParam(param, banDoc, startDate, endDate);
	loadText(param, banDoc);

	/* 2) Extract data from journal and calculate balances */
	var transactions = getJournal(banDoc, startDate, endDate);

	//--------------------------------------------------------------------------------------------------------------//
	//  6) Print the report
	//--------------------------------------------------------------------------------------------------------------//
	// Create the report
	var report = Banana.Report.newReport(param.reportName);

	if (param.headerLeft) {
		report.addParagraph(param.headerLeft, "heading2");
	}
	if (param.vatNumber) {
		report.addParagraph(param.text.vatNum + " " + param.vatNumber, "heading3");
	}

	checkUsedVatCodes(param, banDoc, report);
	checkUsedVatCodesHaveGr1(banDoc, report);

	report.addParagraph(" ", "");
	report.addParagraph(param.text.title, "heading1 textGreen");
	

	var table = report.addTable("tableI");
	var col1 = table.addColumn("col1");
	var col2 = table.addColumn("col2");
	var col3 = table.addColumn("col3");
	var col4 = table.addColumn("col4");
	/**********
	I.
	 **********/
	var taxable = "";
	var adjustment = "";
	var posted = "";
	var taxableTot = "";
	var adjustmentTot = "";
	var postedTotDue = "";
	var postedTotRecoverable = "";
	var dueCurrentPeriod = "";
	var correctionsPreviousPeriod = "";
	var carryForwardPreviousPeriod = "";
	var netDueOrClaim = "";

	/* Header  */
	tableRow = table.addRow();
	tableRow.addCell(param.text.period + Banana.Converter.toLocaleDateFormat(startDate) + " - " + Banana.Converter.toLocaleDateFormat(endDate), "bold");
	tableRow.addCell(param.text.headerAmount, "bold center");
	tableRow.addCell(param.text.headerAdjustments, "bold center");
	tableRow.addCell(param.text.headerVat, "bold center");
	tableRow = table.addRow();
	tableRow.addCell();
	tableRow.addCell(param.text.headerCurrency, "bold center");
	tableRow.addCell(param.text.headerCurrency, "bold center");
	tableRow.addCell(param.text.headerCurrency, "bold center");

	/* 1 - Standard rated sales */
	tableRow = table.addRow();
	tableRow.addCell(param.text.description1, "textDue");
	taxable = getGr1VatBalance(banDoc, transactions, "1", 2, startDate, endDate);
	tableRow.addCell(formatNumber(taxable), "right dataCell");
	/* Adjustment is positive for deductions */
	adjustment = getGr1VatBalance(banDoc, transactions, "1A", 1, startDate, endDate);
	tableRow.addCell(formatNumber(adjustment), "right dataCell");
	posted = getGr1VatBalance(banDoc, transactions, "1;1A", 4, startDate, endDate);
	tableRow.addCell(formatNumber(posted), "right totalCell");

	taxableTot = Banana.SDecimal.add(taxableTot, taxable);
	adjustmentTot = Banana.SDecimal.add(adjustmentTot, adjustment);
	postedTotDue = Banana.SDecimal.add(postedTotDue, posted);

	/* 2 - Sales to customers in VAT implementing GCC countries */
	tableRow = table.addRow();
	tableRow.addCell(param.text.description2, "textDue");
	taxable = getGr1VatBalance(banDoc, transactions, "2", 2, startDate, endDate);
	tableRow.addCell(formatNumber(taxable), "right dataCell");
	/* Adjustment is positive for deductions */
	adjustment = getGr1VatBalance(banDoc, transactions, "2A", 1, startDate, endDate);
	tableRow.addCell(formatNumber(adjustment), "right dataCell");
	posted = getGr1VatBalance(banDoc, transactions, "2;2A", 4, startDate, endDate);
	if (Banana.SDecimal.isZero(posted)) {
		tableRow.addCell(formatNumber(posted), "error right dataCell");
	}
	taxableTot = Banana.SDecimal.add(taxableTot, taxable);
	adjustmentTot = Banana.SDecimal.add(adjustmentTot, adjustment);

	/* 3 - Zero rated domestic sales */
	tableRow = table.addRow();
	tableRow.addCell(param.text.description3, "textDue");
	taxable = getGr1VatBalance(banDoc, transactions, "3", 2, startDate, endDate);
	tableRow.addCell(formatNumber(taxable), "right dataCell");
	/* Adjustment is positive for deductions */
	adjustment = getGr1VatBalance(banDoc, transactions, "3A", 1, startDate, endDate);
	tableRow.addCell(formatNumber(adjustment), "right dataCell");
	posted = getGr1VatBalance(banDoc, transactions, "3;3A", 4, startDate, endDate);
	if (Banana.SDecimal.isZero(posted)) {
		tableRow.addCell(formatNumber(posted), "error right dataCell");
	}
	taxableTot = Banana.SDecimal.add(taxableTot, taxable);
	adjustmentTot = Banana.SDecimal.add(adjustmentTot, adjustment);

	/* 4 - Exports */
	tableRow = table.addRow();
	tableRow.addCell(param.text.description4, "textDue");
	taxable = getGr1VatBalance(banDoc, transactions, "4", 2, startDate, endDate);
	tableRow.addCell(formatNumber(taxable), "right dataCell");
	/* Adjustment is positive for deductions */
	adjustment = getGr1VatBalance(banDoc, transactions, "4A", 1, startDate, endDate);
	tableRow.addCell(formatNumber(adjustment), "right dataCell");
	posted = getGr1VatBalance(banDoc, transactions, "4;4A", 4, startDate, endDate);
	if (Banana.SDecimal.isZero(posted)) {
		tableRow.addCell(formatNumber(posted), "error right dataCell");
	}
	taxableTot = Banana.SDecimal.add(taxableTot, taxable);
	adjustmentTot = Banana.SDecimal.add(adjustmentTot, adjustment);

	/* 5 - Exempt sales: */
	tableRow = table.addRow();
	tableRow.addCell(param.text.description5, "textDue");
	taxable = getGr1VatBalance(banDoc, transactions, "5", 2, startDate, endDate);
	tableRow.addCell(formatNumber(taxable), "right dataCell");
	/* Adjustment is positive for deductions */
	adjustment = getGr1VatBalance(banDoc, transactions, "5A", 1, startDate, endDate);
	tableRow.addCell(formatNumber(adjustment), "right dataCell");
	posted = getGr1VatBalance(banDoc, transactions, "5;5A", 4, startDate, endDate);
	if (Banana.SDecimal.isZero(posted)) {
		tableRow.addCell(formatNumber(posted), "error right dataCell");
	}
	taxableTot = Banana.SDecimal.add(taxableTot, taxable);
	adjustmentTot = Banana.SDecimal.add(adjustmentTot, adjustment);

	/* 6 - Total sales: */
	tableRow = table.addRow();
	tableRow.addCell(param.text.description6, "bold textDue");
	tableRow.addCell(formatNumber(taxableTot, true), "right totalCell");
	tableRow.addCell(formatNumber(adjustmentTot, true), "right totalCell");
	tableRow.addCell(formatNumber(postedTotDue, true), "right totalCell");
	tableRow = table.addRow().addCell("");

	/* PURCHASE */
	taxableTot = "";
	adjustmentTot = "";

	/* 7 - Standard rated domestic purchases */
	tableRow = table.addRow();
	tableRow.addCell(param.text.description7, "textRecoverable");
	taxable = getGr1VatBalance(banDoc, transactions, "7", 1, startDate, endDate);
	tableRow.addCell(formatNumber(taxable, true), "right dataCell");
	/* Adjustment is positive for deductions */
	adjustment = getGr1VatBalance(banDoc, transactions, "7A", 2, startDate, endDate);
	tableRow.addCell(formatNumber(adjustment, true), "right dataCell");
	posted = getGr1VatBalance(banDoc, transactions, "7;7A", 3, startDate, endDate);
	tableRow.addCell(formatNumber(posted, true), "right totalCell");

	taxableTot = Banana.SDecimal.add(taxableTot, taxable);
	adjustmentTot = Banana.SDecimal.add(adjustmentTot, adjustment);
	postedTotRecoverable = Banana.SDecimal.add(postedTotRecoverable, posted);

	/* 8 - Imports subject to VAT paid at customs */
	tableRow = table.addRow();
	tableRow.addCell(param.text.description8, "textRecoverable");
	taxable = getGr1VatBalance(banDoc, transactions, "8", 1, startDate, endDate);
	tableRow.addCell(formatNumber(taxable, true), "right dataCell");
	/* Adjustment is positive for deductions */
	adjustment = getGr1VatBalance(banDoc, transactions, "8A", 2, startDate, endDate);
	tableRow.addCell(formatNumber(adjustment, true), "right dataCell");
	posted = getGr1VatBalance(banDoc, transactions, "8;8A", 3, startDate, endDate);
	tableRow.addCell(formatNumber(posted, true), "right totalCell");

	taxableTot = Banana.SDecimal.add(taxableTot, taxable);
	adjustmentTot = Banana.SDecimal.add(adjustmentTot, adjustment);
	postedTotRecoverable = Banana.SDecimal.add(postedTotRecoverable, posted);

	/* 9 - Imports subject to VAT accounted for through reverse charge mechanism */
	tableRow = table.addRow();
	tableRow.addCell(param.text.description9, "textRecoverable");
	taxable = getGr1VatBalance(banDoc, transactions, "9", 1, startDate, endDate);
	tableRow.addCell(formatNumber(taxable, true), "right dataCell");
	/* Adjustment is positive for deductions */
	adjustment = getGr1VatBalance(banDoc, transactions, "9A", 2, startDate, endDate);
	tableRow.addCell(formatNumber(adjustment, true), "right dataCell");
	posted = getGr1VatBalance(banDoc, transactions, "9;9A", 3, startDate, endDate);
	tableRow.addCell(formatNumber(posted, true), "right totalCell");

	taxableTot = Banana.SDecimal.add(taxableTot, taxable);
	adjustmentTot = Banana.SDecimal.add(adjustmentTot, adjustment);
	postedTotRecoverable = Banana.SDecimal.add(postedTotRecoverable, posted);

	/* 10 - Zero rated purchases */
	tableRow = table.addRow();
	tableRow.addCell(param.text.description10, "textRecoverable");
	taxable = getGr1VatBalance(banDoc, transactions, "10", 1, startDate, endDate);
	tableRow.addCell(formatNumber(taxable), "right dataCell");
	/* Adjustment is positive for deductions */
	adjustment = getGr1VatBalance(banDoc, transactions, "10A", 2, startDate, endDate);
	tableRow.addCell(formatNumber(adjustment), "right dataCell");
	posted = getGr1VatBalance(banDoc, transactions, "19;10A", 3, startDate, endDate);
	if (Banana.SDecimal.isZero(posted)) {
		tableRow.addCell(formatNumber(posted), "error right dataCell");
	}
	taxableTot = Banana.SDecimal.add(taxableTot, taxable);
	adjustmentTot = Banana.SDecimal.add(adjustmentTot, adjustment);

	/* 11 - Exempt purchases */
	tableRow = table.addRow();
	tableRow.addCell(param.text.description11, "textRecoverable");
	taxable = getGr1VatBalance(banDoc, transactions, "11", 1, startDate, endDate);
	tableRow.addCell(formatNumber(taxable), "right dataCell");
	/* Adjustment is positive for deductions */
	adjustment = getGr1VatBalance(banDoc, transactions, "11A", 2, startDate, endDate);
	tableRow.addCell(formatNumber(adjustment), "right dataCell");
	posted = getGr1VatBalance(banDoc, transactions, "11;11A", 3, startDate, endDate);
	if (Banana.SDecimal.isZero(posted)) {
		tableRow.addCell(formatNumber(posted), "error right dataCell");
	}
	taxableTot = Banana.SDecimal.add(taxableTot, taxable);
	adjustmentTot = Banana.SDecimal.add(adjustmentTot, adjustment);

	/* 12 - Total pruchases */
	tableRow = table.addRow();
	tableRow.addCell(param.text.description12, "bold textRecoverable");
	tableRow.addCell(formatNumber(taxableTot, true), "right totalCell");
	tableRow.addCell(formatNumber(adjustmentTot, true), "right totalCell");
	tableRow.addCell(formatNumber(postedTotRecoverable, true), "right totalCell");
	tableRow = table.addRow().addCell("");

	/* 13 - Total due current period */
	dueCurrentPeriod = Banana.SDecimal.subtract(postedTotDue, postedTotRecoverable);
	tableRow = table.addRow();
	tableRow.addCell(param.text.description13, "textGreen");
	tableRow.addCell();
	tableRow.addCell();
	if (Banana.SDecimal.abs(dueCurrentPeriod) > 5000) {
		// Errore
	}
	tableRow.addCell(formatNumber(dueCurrentPeriod, true), "right totalCell");

	/* 14 - Corrections from previous period (between SAR ±5,000) */
	correctionsPreviousPeriod = getGr1VatBalance(banDoc, transactions, "14", 4, startDate, endDate);
	tableRow = table.addRow();
	tableRow.addCell(param.text.description14, "textGreen");
	tableRow.addCell();
	tableRow.addCell();
	tableRow.addCell(formatNumber(correctionsPreviousPeriod, true), "right totalCell");

	/* 15 - VAT credit carried forward from previous period(s) */
	//carryForwardPreviousPeriod = Banana.SDecimal.subtract(postedTotDue, postedTotRecoverable);
	tableRow = table.addRow();
	tableRow.addCell(param.text.description15, "textGreen");
	tableRow.addCell();
	tableRow.addCell();
	tableRow.addCell(formatNumber(carryForwardPreviousPeriod, true), "right dataCell");

	/* 16 - Net VAT due (or reclaimed): */
	netDueOrClaim = Banana.SDecimal.add(dueCurrentPeriod, correctionsPreviousPeriod);
	netDueOrClaim = Banana.SDecimal.add(netDueOrClaim, carryForwardPreviousPeriod);
	tableRow = table.addRow();
	tableRow.addCell(param.text.description16, "bold textGreen");
	tableRow.addCell();
	tableRow.addCell();
	tableRow.addCell(formatNumber(netDueOrClaim, true), "right totalCell");

	//Add Header and footer
	addHeader(param, report);
	addFooter(param, report);

	return report;
}

function formatNumber(amount, convZero) {

	return Banana.Converter.toLocaleNumberFormat(amount, 2, convZero);
}

/* Function that checks for all the used vat codes without Gr1 and prints a warning message */
function checkUsedVatCodesHaveGr1(banDoc, report) {

	// Get all the vat codes used on the Transactions table
	var usedVatCodes = getVatCodesUsed(banDoc);

	// For each code checks if on the VatCodes table there is a Gr1
	// Shows a warning message in red for all the vat codes without the Gr1
	var codesWithoutGr1 = [];

	// Save all the vat codes without Gr1 into an array
	for (var i = 0; i < usedVatCodes.length; i++) {
		var gr1 = getVatCodeGr1(banDoc, usedVatCodes[i]);
		if (!gr1) {
			codesWithoutGr1.push(usedVatCodes[i]);
		}
	}

	// Print all the warning messages
	for (var i = 0; i < codesWithoutGr1.length; i++) {
		report.addParagraph(param.checkVatCode4 + codesWithoutGr1[i] + param.checkVatCode5, "red");
	}
}

/* Function that retrieves the total vat from Banana */
function getTotalFromBanana(banDoc, checkValues, startDate, endDate) {
	var vatReportTable = banDoc.vatReport(startDate, endDate);

	for (var i = 0; i < vatReportTable.rowCount; i++) {
		var tRow = vatReportTable.row(i);
		var group = tRow.value("Group");

		//The balance is summed in group named "_tot_"
		if (group === "_tot_") {
			checkValues.vatAmount = tRow.value("VatBalance"); //VatAmount VatBalance

			// //In order to compare correctly the values we have to invert the sign of the result from Banana (if negative)
			// if (Banana.SDecimal.sign(totalFromBanana) == -1) {
			//     totalFromBanana = Banana.SDecimal.invert(totalFromBanana);
			// }
		}
	}
}

/* Function that checks all the vat/gr1 codes used in the transactions.
It returns a warning message (red) if wrong codes are used. */
function checkUsedVatCodes(param, banDoc, report) {
	var usedGr1Codes = [];
	var vatCodes = getVatCodesUsed(banDoc);
	for (var i = 0; i < vatCodes.length; i++) {
		var gr1Codes = getVatCodeGr1(banDoc, vatCodes[i]);
		for (var j = 0; j < gr1Codes.length; j++) {
			usedGr1Codes.push(gr1Codes[j]);
		}
	}

	//Removing duplicates
	for (var i = 0; i < usedGr1Codes.length; i++) {
		for (var x = i + 1; x < usedGr1Codes.length; x++) {
			if (usedGr1Codes[x] === usedGr1Codes[i]) {
				usedGr1Codes.splice(x, 1);
				--x;
			}
		}
	}

	for (var j = 0; j < usedGr1Codes.length; j++) {
		if (usedGr1Codes[j] !== "1" && usedGr1Codes[j] !== "1A" &&
			usedGr1Codes[j] !== "2" && usedGr1Codes[j] !== "2A" &&
			usedGr1Codes[j] !== "3" && usedGr1Codes[j] !== "3A" &&
			usedGr1Codes[j] !== "4" && usedGr1Codes[j] !== "4A" &&
			usedGr1Codes[j] !== "5" && usedGr1Codes[j] !== "5A" &&
			usedGr1Codes[j] !== "7" && usedGr1Codes[j] !== "7A" &&
			usedGr1Codes[j] !== "8" && usedGr1Codes[j] !== "8A" &&
			usedGr1Codes[j] !== "9" && usedGr1Codes[j] !== "9A" &&
			usedGr1Codes[j] !== "10" && usedGr1Codes[j] !== "10A" &&
			usedGr1Codes[j] !== "11" && usedGr1Codes[j] !== "11A" &&
			usedGr1Codes[j] !== "14" &&
			usedGr1Codes[j] !== "xxx") {
			report.addParagraph(param.checkVatCode1 + " '" + usedGr1Codes[j] + "' " + param.checkVatCode2, "red");
		}
	}
}

/* Function that returns an array with all the gr1 codes for the given vat code */
function getVatCodeGr1(banDoc, vatCode) {
	var str = [];
	var table = banDoc.table("VatCodes");
	if (table === undefined || !table) {
		return str;
	}
	//Loop to take the values of each rows of the table
	for (var i = 0; i < table.rowCount; i++) {
		var tRow = table.row(i);
		var gr1 = tRow.value("Gr1");
		var vatcode = tRow.value("VatCode");

		if (gr1 && vatcode === vatCode) {
			var code = gr1.split(";");
			for (var j = 0; j < code.length; j++) {
				if (code[j]) {
					str.push(code[j]);
				}
			}
		}
	}
	return str;
}

/* Function that returns all the vat codes used in the transactions table */
function getVatCodesUsed(banDoc) {
	var str = [];
	var table = banDoc.table("Transactions");
	if (table === undefined || !table) {
		return str;
	}
	//Loop to take the values of each rows of the table
	for (var i = 0; i < table.rowCount; i++) {
		var tRow = table.row(i);
		var vatRow = tRow.value("VatCode");

		if (vatRow) {
			var code = vatRow.split(";");
			for (var j = 0; j < code.length; j++) {
				if (code[j]) {
					str.push(code[j]);
				}
			}
		}
	}
	//Removing duplicates
	for (var i = 0; i < str.length; i++) {
		for (var x = i + 1; x < str.length; x++) {
			if (str[x] === str[i]) {
				str.splice(x, 1);
				--x;
			}
		}
	}
	//Return the array
	return str;
}

/* Function that returns the lines from the journal and converts some values from base currency to CHF */
function getJournal(banDoc, startDate, endDate) {

	var journal = banDoc.journal(banDoc.ORIGINTYPE_CURRENT, banDoc.ACCOUNTTYPE_NORMAL);
	var len = journal.rowCount;
	var transactions = []; //Array that will contain all the lines of the transactions

	for (var i = 0; i < len; i++) {

		var line = {};
		var tRow = journal.row(i);

		if (tRow.value("JDate") >= startDate && tRow.value("JDate") <= endDate) {

			line.date = tRow.value("JDate");
			line.account = tRow.value("JAccount");
			line.vatcode = tRow.value("JVatCodeWithoutSign");
			line.exchangerate = banDoc.exchangeRate("CHF", line.date);
			line.doc = tRow.value("Doc");
			line.description = tRow.value("Description");
			line.isvatoperation = tRow.value("JVatIsVatOperation");

			//We take only the rows with a VAT code and then we convert values from base currency to CHF
			if (line.isvatoperation) {

				line.vattaxable = tRow.value("JVatTaxable");
				line.vatamount = tRow.value("VatAmount");
				line.vatposted = tRow.value("VatPosted");
				line.amount = tRow.value("JAmount");
				line.vatextra = tRow.value["VatExtraInfo"];

				transactions.push(line);
			}
		}
	}
	return transactions;
}

/* This function sums the vat amounts for the specified vat code and period retrieved from transactions (converted journal's lines)
Returns an object containing {vatTaxable, vatPosted} */
function getVatCodesBalance(transactions, vatCodes, startDate, endDate) {

	var sDate = Banana.Converter.toDate(startDate);
	var eDate = Banana.Converter.toDate(endDate);
	var vattaxable = "";
	var vatposted = "";
	var currentBal = {};
	for (var j = 0; j < vatCodes.length; j++) {
		for (var i = 0; i < transactions.length; i++) {

			var tDate = Banana.Converter.toDate(transactions[i].date);
			var includeTransaction = false;
			if (tDate >= sDate && tDate <= eDate) {

				if (vatCodes[j] === transactions[i].vatcode) {
					includeTransaction = true;
				}
			}
			if (includeTransaction) {
				vattaxable = Banana.SDecimal.add(vattaxable, transactions[i].vattaxable);
				vatposted = Banana.SDecimal.add(vatposted, transactions[i].vatposted);

				currentBal.vatTaxable = vattaxable;
				currentBal.vatPosted = vatposted;
			}
		}
	}
	return currentBal;
}

/* The purpose of this function is to calculate all the VAT balances of the accounts belonging to the same group (grText) */
function getGr1VatBalance(banDoc, transactions, grCodes, vatClass, startDate, endDate) {

	var vatCodes = getVatCodeForGr(banDoc, grCodes, 'Gr1');
	//Banana.console.log("vatCodes: " + vatCodes);

	//Sum the vat amounts for the specified vat code and period
	var currentBal = getVatCodesBalance(transactions, vatCodes, startDate, endDate);

	//The "vatClass" decides which value to use
	if (vatClass == "1") {
		return currentBal.vatTaxable;
	} else if (vatClass == "2") {
		return Banana.SDecimal.invert(currentBal.vatTaxable);
	} else if (vatClass == "3") {
		return currentBal.vatPosted;
	} else if (vatClass == "4") {
		return Banana.SDecimal.invert(currentBal.vatPosted);
	} else if (vatClass == "5") {
		return Banana.SDecimal.add(currentBal.vatTaxable, currentBal.vatAmount);
	} else if (vatClass == "6") {
		return Banana.SDecimal.invert(Banana.SDecimal.add(currentBal.vatTaxable, currentBal.vatAmount));
	}
}

/* The main purpose of this function is to create an array with all the values of a given column of the table (codeColumn) belonging to the same group (grText) */
function getVatCodeForGr(banDoc, grText, grColumn) {

	var str = [];
	if (!banDoc || !banDoc.table("VatCodes")) {
		return str;
	}
	var table = banDoc.table("VatCodes");

	if (!grColumn) {
		grColumn = "Gr1";
	}

	/* Can have multiple values */
	var arrayGrText = grText.split(';');

	//Loop to take the values of each rows of the table
	for (var i = 0; i < table.rowCount; i++) {
		var tRow = table.row(i);

		//If Gr1 column contains other characters (in this case ";") we know there are more values
		//We have to split them and take all values separately
		//If there are only alphanumeric characters in Gr1 column we know there is only one value
		var arrCodeString = tRow.value(grColumn).split(";");
		for (var j = 0; j < arrayGrText.length; j++) {
			if (arrayContains(arrCodeString, arrayGrText[j])) {
				var vatCode = tRow.value('VatCode');
				if (!arrayContains(str, vatCode)) {
					str.push(vatCode);
				}
			}
		}
	}

	//Return the array
	return str;
}

function arrayContains(array, value) {
	for (var i = 0; i < array.length; i++) {
		if (array[i] === value) {
			return true;
		}
	}
	return false;
}

/* The main purpose of this function is to allow the user to enter the accounting period desired and saving it for the next time the script is run
Every time the user runs of the script he has the possibility to change the date of the accounting period */
function getPeriodSettings(param) {

	//The formeters of the period that we need
	var scriptform = {
		"selectionStartDate": "",
		"selectionEndDate": "",
		"selectionChecked": "false"
	};

	//Read script settings
	var data = Banana.document.getScriptSettings();

	//Check if there are previously saved settings and read them
	if (data.length > 0) {
		try {
			var readSettings = JSON.parse(data);

			//We check if "readSettings" is not null, then we fill the formeters with the values just read
			if (readSettings) {
				scriptform = readSettings;
			}
		} catch (e) {}
	}

	//We take the accounting "starting date" and "ending date" from the document. These will be used as default dates
	var docStartDate = Banana.document.startPeriod();
	var docEndDate = Banana.document.endPeriod();

	//A dialog window is opened asking the user to insert the desired period. By default is the accounting period
	var selectedDates = Banana.Ui.getPeriod(param.reportName, docStartDate, docEndDate,
			scriptform.selectionStartDate, scriptform.selectionEndDate, scriptform.selectionChecked);

	//We take the values entered by the user and save them as "new default" values.
	//This because the next time the script will be executed, the dialog window will contains the new values.
	if (selectedDates) {
		scriptform["selectionStartDate"] = selectedDates.startDate;
		scriptform["selectionEndDate"] = selectedDates.endDate;
		scriptform["selectionChecked"] = selectedDates.hasSelection;

		//Save script settings
		var formToString = JSON.stringify(scriptform);
		var value = Banana.document.setScriptSettings(formToString);
	} else {
		//User clicked cancel
		return;
	}
	return scriptform;
}

/* This function adds a Footer to the report */
function addFooter(param, report) {
	var date = new Date();
	var d = Banana.Converter.toLocaleDateFormat(date);
	report.getFooter().addClass("footer");
	var textfield = report.getFooter().addText(d + " - ");
	if (textfield.excludeFromTest) {
		textfield.excludeFromTest();
	}
	report.getFooter().addFieldPageNr();
}

/* This function adds an Header to the report */
function addHeader(param, report) {
	var pageHeader = report.getHeader();
	pageHeader.addClass("header");
	//pageHeader.addParagraph(param.text.title, "heading");
	//pageHeader.addParagraph(param.version, "");
	//pageHeader.addParagraph(" ", "");
}

/* Function that creates all the styles used to print the report */
function createStyleSheet() {
	var stylesheet = Banana.Report.newStyleSheet();

	stylesheet.addStyle("@page", "margin:10mm 10mm 10mm 10mm;")
	stylesheet.addStyle("body", "font-family:Helvetica; font-size:10pt");
	stylesheet.addStyle(".headerStyle", "background-color:#E0EFF6; text-align:center; font-weight:bold;");
	stylesheet.addStyle(".bold", "font-weight:bold;");
	stylesheet.addStyle(".right", "text-align:right;");
	stylesheet.addStyle(".center", "text-align:center;");
	stylesheet.addStyle(".heading1", "font-weight:bold; font-size:16pt; text-align:left");
	stylesheet.addStyle(".heading2", "font-weight:bold; font-size:12pt; text-align:left");
	stylesheet.addStyle(".heading3", "font-weight:bold; font-size:10pt; text-align:left");
	stylesheet.addStyle(".footer", "text-align:center; font-size:8px; font-family:Courier New;");
	stylesheet.addStyle(".horizontalLine", "border-top:1px solid orange");
	stylesheet.addStyle(".borderLeft", "border-left:thin solid orange");
	stylesheet.addStyle(".borderTop", "border-top:thin solid orange");
	stylesheet.addStyle(".borderRight", "border-right:thin solid orange");
	stylesheet.addStyle(".borderBottom", "border-bottom:thin solid orange");
	stylesheet.addStyle(".textDue", "color:green; background-color:#cbd7d8");
	stylesheet.addStyle(".textRecoverable", "color:green; background-color:#FFEFDB");
	stylesheet.addStyle(".dataCell", "");
	stylesheet.addStyle(".totalCell", "font-weight:bold; color:white; background-color:#dda930; padding-left:1px ;padding-right:1px; border-width:2px; border-bottom-color:white");
	stylesheet.addStyle(".textGreen", "color:#0a5a4a;");
	stylesheet.addStyle(".orange", "color:orange;");
	stylesheet.addStyle(".red", "color:red;");
	stylesheet.addStyle(".underline", "text-decoration:underline;");
	stylesheet.addStyle(".instructions", "background-color:#eeeeee");
	stylesheet.addStyle(".italic", "font-style:italic;");

	/* TableI */
	var tableStyle = stylesheet.addStyle("tableI");
	tableStyle.setAttribute("width", "100%");
	stylesheet.addStyle("table.tableI td", "padding-bottom: 2px; padding-top: 3px");
	//stylesheet.addStyle("table.tableI td", "border:thin solid black");
	stylesheet.addStyle(".col1", ""); //width:10%
	stylesheet.addStyle(".col2", "");
	stylesheet.addStyle(".col3", ""); //width:12%
	stylesheet.addStyle(".col4", "");
	stylesheet.addStyle(".col5", ""); //width:12%

	/* TableII */
	var tableStyle = stylesheet.addStyle("tableII");
	tableStyle.setAttribute("width", "100%");

	return stylesheet;
}
