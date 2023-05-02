import aroflo from "./lib/aroflo-api.js";
import notion from "./lib/notion-api.js";

if (await aroflo.login()) {
	const databaseItems = await notion.getRows();

	for (const row of databaseItems.results) {
		const taskId = notion.getTaskIdFromDatabaseProperty(row);
		if (!taskId) { continue; }

		const task = await aroflo.getTaskById(taskId);

		//Check if option already exists in notion database
		if (!notion.getPropertyOption({key: "Task Status", value: task.status})) {
			notion.addPropertyOption({key: "Task Status", value: task.status});
		}
		if (!notion.getPropertyOption({key: "Substatus", value: task.substatus.name})) {
			notion.addPropertyOption({key: "Substatus", value: task.substatus.name});
		}

		const taskStatus = notion.getPropertyOption({key: "Task Status", value: task.status});
		const substatus = notion.getPropertyOption({key: "Substatus", value: task.substatus.name});

		let params = {};
		if (!taskStatus && !substatus) { continue; }

		if (taskStatus) {
			params['Task Status'] = {
				select: taskStatus
			};
		}
		if (substatus) {
			params['Substatus'] = {
				select: substatus
			};
		}

		await notion.updateRow({
			id: row.id,
			properties: params
		});
	}
}