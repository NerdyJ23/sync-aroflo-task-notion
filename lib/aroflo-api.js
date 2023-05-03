import inquirer from "inquirer";
import axios from 'axios';
import fs from 'fs';
import dotenv from "dotenv";
dotenv.config();

const cookieFile = process.env.COOKIE_FILE;
const aroflo = "https://office.aroflo.com";

axios.defaults.withCredentials = true;

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

	const config = {
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
		message: "Enter your AroFlo 2FA code: "
	}]);

	const fa2Response = await send2FA(result.code);
	console.log(fa2Response);
	if (!fa2Response.data.success) {
		await login(username, password);
	}

	//Get session ID cookies
	const indexResponse = await axios.request(`${aroflo}/ims/Site/Home/index.cfm?view=1`);
	axios.defaults.headers.cookie = indexResponse.headers['set-cookie'];

	//Save cookies to file for next time
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

async function send2FA(code) {
	const response = await axios.request(`${aroflo}/ims/rpc/mfa/MfaRpcController.cfc?method=verifyToken
	&token=${encodeURIComponent(code)}
	&trustDevice=true`);
	return response;
}

export default {
	async login(useTest = false) {
		const env = process.env;
		return useTest ? await login(env.TEST_AROFLO_USERNAME, env.TEST_AROFLO_PASSWORD): await login(env.AROFLO_USERNAME, env.AROFLO_PASSWORD);
	},
	async getTaskById(taskId) {
		const response = await axios.request(`${aroflo}/cf-api/tasks/${taskId}`)
			.catch((error) => {
				return error.response.data;
			});
		return response.data;
	}
}
