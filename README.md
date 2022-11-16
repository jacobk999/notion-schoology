# Schoology + Notion
- Takes everything from your Schoology calendar and puts it into a Notion database
- Schoology Rest API implementation based off of https://github.com/jbeuckm/schoology

## Setup
- Clone the repository
- Run `npm install`
- Create a `config.json` file in the root directory with your class names mapped to their respective notion database tag name
- Create a `.env` file in the root directory following the format of `.env.schema`
- Run `npm run start` to sync Schoology events with Notion