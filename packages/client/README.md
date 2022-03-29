# Polyratings Client
Nodejs and browser library to interact with the polyratings backend

## Install
```
npm install @polyratings/client
```

## Setup
If you are using this library with NodeJS, you must set fetch to the global object. This will become no longer necessary when fetch lands in stable NodeJS in version 18.

For Example:
```js
const fetch = require("node-fetch")

global.fetch = fetch
```

## Using the Library
You can initialize a client by giving it an env. PROD_ENV, BETA_ENV, and DEV_ENV are the official environments, but you can pass the client a custom environment as well. The client constructor also takes an optional second parameter allowing for network error interception. This is used on the frontend to redirect to the login page on a 401 status.

With default environment:
```js
import { Client, PROD_ENV } from "@polyratings/client";

const client = new Client(PROD_ENV)
```

With custom environment:
```js
import { Client, PolyratingsAPIEnv } from "@polyratings/client";

export const myEnvironment: PolyratingsAPIEnv = {
    url: "https://SELF-HOSTED-POLYRATINGS.com",
};

const client = new Client(myEnvironment)
```

The client object has 4 submodules:
* professors - Retrieve and add professors to Polyratings
* ratings - Add ratings to Polyratings
* auth - Authenticate as an admin as well as registering a new admin user
*  admin - Perform admin operations such as removing ratings and professors

The easiest way to see the capabilities of the library is to install it explore the methods. Each is documented with types as well as a description of what the function does.

## Sample
Program to retrieve data on a particular professor

```js
import { Client, PolyratingsAPIEnv } from "@polyratings/client";

async function main() {
    const client = new Client(PROD_ENV);

    const allProfessors = await client.professors.all();
    const nicoTruncated = allProfessors.find(professor => professor.lastName === "Nico" && professor.firstName === "Phillip")
    
    const nico = await client.professors.get(nicoTruncated.id)
    
    console.log(nico)
}

main()
```
