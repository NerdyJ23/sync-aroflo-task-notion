import dotenv from "dotenv";
import { Client } from "@notionhq/client";

dotenv.config();
let database = null;
const notion = new Client({auth: process.env.NOTION_KEY});
const db = process.env.TASK_DB;
//These properties have multiple options inside of them
const lists = ['select','status'];

await loadDatabase();
async function getDatabaseRows() {
	return await notion.databases.query({
		database_id: db,
		filter: {
			and: [{
					property: "Archived",
					checkbox: {
						equals: false
					}
				},
				{
					property: process.env.TASK_ID,
					rich_text: {
						is_not_empty: true
					}
				}
			]
		}
	});
}

async function loadDatabase() {
	database = await notion.databases.retrieve({database_id: db});
	return database;
}

function getProperty(key) {
	return database.properties[key];
}

function getPropertyOption({key, value}) {
	if (database.properties[key]) {
		const list = database.properties[key].select ?? database.properties[key].status;
		for (const option of list.options) {
			if (option.name === value) {
				return option;
			}
		}
	}
	return null;
}

async function updatePage({id, properties}) {
	const pageUpdate = await notion.pages.update({
		page_id: id,
		properties: properties
	});
	return pageUpdate;
}

export default {
	async getDatabase() {
		if (database) {
			return database;
		}
		database = loadDatabase();
		return database;
	},
	async getRows() {
		return await getDatabaseRows();
	},

	getTaskIdFromDatabaseProperty(row) {
		//rich text will always have an item due to the filter in the query
		return row.properties['Task ID'].rich_text[0].plain_text;
	},

	getProperty(key) {
		return getProperty(key);
	},

	getPropertyOption({key, value}) {
		return getPropertyOption({key:key, value:value});
	},

	async addPropertyOption({key, value}) {
		let property = getProperty(key);
		let select = property.select ?? property.status;

		if(select) {
			select.options.push({name: value});
		}

		let data = {};
		data[key] = {
			select: {
				options: select.options
			}
		};
		await notion.databases.update({
			database_id: db,
			properties: data
		});
	},

	async updateRow({id, properties}) {
		return await updatePage({id: id, properties: properties});
	}
}