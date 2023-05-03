# sync-aroflo-task-notion
Syncs aroflo task status and substatus to a notion database

# What you will need:
A notion integration key/app: https://developers.notion.com/docs/create-a-notion-integration

The notion database ID you wish to use for integration

Node.js
Linux screen application (apt-get install screen)

# Basic setup
Copy the .env_example file to .env and replace the example information with your own
Ensure you have 3 database properties that represent Task Status, Task Substatus and Task ID. You will also need a checkbox property called "Archived"

# Running the script
On your first run of the script (and every 30 days) you will need to enter your AroFlo MFA code to login
Ensure you have filled out the correct Task ID for the database row as it will look against that for the correct task to sync with
Wait
