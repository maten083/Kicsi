const statusCodes = {
	0: "Todo",
	1: "In progress",
	2: "Completed!"
};
const statusCodesInverse = {
	"Todo": 0,
	"In progress": 1,
	"Completed!": 2
};
window.addEventListener("DOMContentLoaded", async function() {
	const tasks = await getTasks();
	console.log(tasks);
	const table = document.querySelector('#tasks');

	for (const task of tasks) {
		table.innerHTML += `
		<tr id="row${task.id}">
			<td>${task.id}</td>
			<td>${task.name}</td>
			<td>${statusCodes[task.status]}</td>
			<td>
				<div style="display: flex;">
					<a class="button" href="javascript:deleteTask(${task.id})">Delete</a>
					<a class="button" href="javascript:showUpdate(${task.id})">Update</a>
				</div>
			</td>
		</tr>`;
	}
});

function showUpdate(id) {
	const update = document.querySelector('.update');
	const row = document.querySelector("#row" + id);

	update.querySelector('#id').value = id;
	update.querySelector('#name').value = row.querySelector("td+td").innerText;
	update.querySelector('#status').value = statusCodesInverse[row.querySelector("td+td+td").innerText];
	update.style.display = "";
}
function doUpdate(e) {

	const update = document.querySelector('.update');
	const id = update.querySelector('#id').value;
	const name = update.querySelector('#name');
	const status = update.querySelector('#status');
	updateTask(id, name.value.trim() === "" ? undefined : name.value, status.value).then(() => {});
}
function doCreate() {
	const name = document.querySelector('.create #name_create').value;
	createTask(name).then(() => {});
}
/* HELPER FUNCTIONS */
async function getTasks() {
	return await (await apiCall("get")).json();
}
async function createTask(name) {
	await apiCall("create", "POST", {
		name: name
	});
	window.location.reload();
}
async function updateTask(id, name = undefined, status = undefined) {
	await apiCall("update", "PUT", {
		id: id,
		name: name,
		status: status
	});
	window.location.reload();
}
async function deleteTask(id) {
	await apiCall("delete/" + id, "DELETE");
	window.location.reload();
}

async function apiCall(endpoint, method = "GET", body) {
	return await fetch("http://localhost:8080/tasks/" + endpoint, {
		method: method,
		cors: 'no-cors',
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify(body)
	});
}