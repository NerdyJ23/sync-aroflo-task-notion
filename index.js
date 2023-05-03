import aroflo from "./lib/aroflo-api.js";
import notion from "./lib/notion-api.js";
import dotenv from "dotenv";
dotenv.config();

const loggedIn = await aroflo.login();

if (loggedIn) {
	const databaseItems = await notion.getRows();

	for (const row of databaseItems.results) {
		const taskId = notion.getTaskIdFromDatabaseProperty(row);
		if (!taskId) { continue; }

		const task = await aroflo.getTaskById(taskId);

		//Check if option already exists in notion database
		if (!notion.getPropertyOption({key: process.env.TASK_STATUS, value: prettifyTaskStatus(task.status)})) {
			notion.addPropertyOption({key: process.env.TASK_STATUS, value: prettifyTaskStatus(task.status)});
		}

		if (!notion.getPropertyOption({key: process.env.TASK_SUBSTATUS, value: task.substatus.name})) {
			notion.addPropertyOption({key: process.env.TASK_SUBSTATUS, value: task.substatus.name});
		}

		const taskStatus = notion.getPropertyOption({key: process.env.TASK_STATUS, value: prettifyTaskStatus(task.status)});
		const substatus = notion.getPropertyOption({key: process.env.TASK_SUBSTATUS, value: task.substatus.name});

		let params = {};
		if (!taskStatus && !substatus) { continue; }

		if (taskStatus) {
			params[process.env.TASK_STATUS] = {
				select: taskStatus
			};

			params["Archived"] = {
				checkbox: task.status === "COMPLETED"
			};
		}
		if (substatus) {
			params[process.env.TASK_SUBSTATUS] = {
				select: substatus
			};
		}
		console.log(`Updating ${row.properties.Name.title[0].plain_text}`);
		await notion.updateRow({
			id: row.id,
			properties: params
		});
	}
}

function prettifyTaskStatus(name) {
	let result = "";
	for (const part of name.split("_")) {
		result += part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() + " ";
	}
	return result.trim();
}