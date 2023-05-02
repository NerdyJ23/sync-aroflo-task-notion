import { Client } from "@notionhq/client";
import dotenv from "dotenv";
import fs from "fs";
import axios from "axios";
import inquirer from "inquirer";

dotenv.config();

const aroflo = "https://office.aroflo.com";
const db = process.env.TASK_DB;
const cookieFile = process.env.COOKIE_FILE;
const notion = new Client({auth: process.env.NOTION_KEY});

axios.defaults.withCredentials = true;
const loggedIn = await login(process.env.AROFLO_USERNAME, process.env.AROFLO_PASSWORD);
console.log(loggedIn);
// console.log(axios.defaults.headers.cookie);
if (loggedIn) {
	const databaseItems = await notion.databases.query({
		database_id: db,
		filter: {
			and: [{
					property: "Archived",
					checkbox: {
						equals: false
					}
				},
				{
					property: "Task ID",
					rich_text: {
						is_not_empty: true
					}
				}
			]
		}
	});

	for (const row of databaseItems.results) {
		let database = await notion.databases.retrieve({database_id: db});
		// console.log(row);
		const task = await getTaskById(getTaskIdFromDatabaseProperty(row));
		// console.log(task.data);

		//Check if option already exists
		// if (!getSelectOption(database, "Task Status", task.data.status)) {
		// 	addSelectProperty(database, "Task Status", task.data.status);
		// }
		// console.log(`substatus name: ${task.data.substatus.name}`);
		if (!getSelectOption(database, "Substatus", task.data.substatus.name)) {
			database = addSelectProperty(database, "Substatus", task.data.substatus.name);
		}
		database = await notion.databases.retrieve({database_id: db});
		// console.log(row.properties['Task Status'].status);
		// console.log(row.properties.Substatus);

		const taskStatus = getSelectOption(database, "Task Status", task.data.status);
		console.log('taskstatus');
		console.log(taskStatus);
		const substatus = getSelectOption(database, "Substatus", task.data.substatus.name);
		console.log('task substatus');
		console.log(substatus);

		let params = {};
		if (!taskStatus && !substatus) { break; }

		if (taskStatus) {
			params['Task Status'] = taskStatus;
		}
		if (substatus) {
			params['Substatus'] = {
				select: substatus
			};
		}

		const pageUpdate = await notion.pages.update({
			page_id: row.id,
			properties: params
		});
		// console.log(pageUpdate);
		// console.log(row.properties['Task Status'].status);
		// break;
	}
}

async function login(username, password) {
	//Check if we have cookies stored in a file first, then test if those are valid still
	if (fs.existsSync(cookieFile)) {
		const data = fs.readFileSync(cookieFile);
		axios.defaults.headers.cookie = JSON.parse(data);
		const loggedIn = await loginValid();
		if (!loggedIn) {
			fs.unlinkSync(cookieFile);
		} else {
			return true;
		}
	}
	var data = {
		loginflag: 2,
		username: username,
		password: password,
		loginto: "office"
	};
	let config = {
		method: 'POST',
		maxBodyLength: Infinity,
		url: `${aroflo}/ims/Login/login.cfm`,
		useCredentials: true,
		headers: {
			'Content-Type': "application/json",
			'Connection': "keep-alive"
		},
		data: JSON.stringify(data)
	}

	//Get login cookies
	const response = await axios.request(config);
	axios.defaults.headers.cookie = response.headers['set-cookie'];

	//Send 2FA auth token (if we don't have a valid session already)
	const result = await inquirer.prompt([{
		type: "input",
		name: "code",
		message: "Enter your AroFlo 2FA password: "
	}]);
	// const rl = readline.createInterface({input: input, output: output, terminal: true});
	// const code = await rl.question("Enter 2FA password");
	// console.log(result);
	const fa2Response = await send2FA(result.code);
	// console.log(fa2Response);
	console.log(fa2Response.data.success);
	if (!fa2Response.data.success) {
		//need to send a request to reset
		await login(username, password);
	}
	//Get session ID cookies
	const indexResponse = await axios.request(`${aroflo}/ims/Site/Home/index.cfm?view=1`);
	axios.defaults.headers.cookie = indexResponse.headers['set-cookie'];

	fs.writeFileSync(cookieFile, JSON.stringify(axios.defaults.headers.cookie));
	return true;
}

async function loginValid() {
	const response = await axios.request(`${aroflo}/cf-api/userInfo/`)
	.catch(() => {
		return false;
	});
	return response.status === 200;
}

function getTaskIdFromDatabaseProperty(row) {
	//rich text will always have an item due to the filter in the query
	return row.properties['Task ID'].rich_text[0].plain_text;
}

function getSelectOption(database, propertyName, value) {
	if (database.properties[propertyName]) {
		const list = database.properties[propertyName].select ?? database.properties[propertyName].status;
		for (const option of list.options) {
			if (option.name === value) {
				return option;
			}
		}
	}
	return null;
}

async function addSelectProperty(database, propertyName, newValue) {
	let select = database.properties[propertyName].select ?? database.properties[propertyName].status;
	// console.log(select.select.options);

	if(select) {
		select.options.push({name: newValue});
	}
	console.log(select);
	// console.log(select);
	let data = {};
	data[propertyName] = {
		select: {
			options: select.options
		}
	};
	const response = await notion.databases.update({
		database_id: db,
		properties: data
	});
	return;
}

async function getTaskById(taskId) {
	console.log(`${aroflo}/cf-api/tasks/${taskId}`);
	const response = await axios.request(`${aroflo}/cf-api/tasks/${taskId}`)
		.catch((error) => {
			return error.response;
		});
	return response;
}

async function send2FA(code) {
	const response = await axios.request(`${aroflo}/ims/rpc/mfa/MfaRpcController.cfc?method=verifyToken
	&token=${encodeURIComponent(code)}
	&trustDevice=true`);
	return response;
}