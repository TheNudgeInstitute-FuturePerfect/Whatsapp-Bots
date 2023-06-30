**advance io original code**

```
const catalyst = require('zcatalyst-sdk-node');
const app = express();
app.use(express.json());

```

**advance io modified code**

```
const catalyst = require('zoho-catalyst-sdk');
const app = express.Router();
```

**basic io original code**

```
module.exports = (context, basicIO) => {
  const catalystApp = catalyst.initialize(context);
  var result = {
    OperationStatus: "SUCCESS",
  };

  var rowID = basicIO.getArgument("id");

  const datastore = catalystApp.datastore();
  const table = datastore.table("SystemPrompts");
  table
    .deleteRows(rowID)
    .then((deleteQueryResult) => {
      basicIO.write(JSON.stringify(result));
      context.close();
    })
    .catch((err) => {
      result["OperationStatus"] = "ZCQL_ERR";
      basicIO.write(JSON.stringify(result));
      context.close();
    });
};
```

**basic io modified code**

```
module.exports = async (basicIO) => {
  const catalystApp = catalyst.initialize();
  var result = {
    OperationStatus: "SUCCESS",
  };

  var rowID = basicIO["id"];

  const datastore = catalystApp.datastore();
  const table = datastore.table("SystemPrompts");
  try {
    const deleteQueryResult = await table.deleteRows(rowID);
    return JSON.stringify(result);
  } catch (error) {
    result["OperationStatus"] = "ZCQL_ERR";
    return JSON.stringify(result);
  }
};

```

**original basic io function call**

```
let functions = catalystApp.functions();

functions.execute("calculateEnglishProficiency", {
  args: {
    Mobile: requestBody["Mobile"],
    Texts: JSON.stringify(requestBody["Texts"]),
  },
});
```

**modified basic io function call**

```
const calculateEnglishProficiency = require("./common/calculateEnglishProficiency.js");
calculateEnglishProficiency({
  Mobile: requestBody["Mobile"],
  Texts: JSON.stringify(requestBody["Texts"]),
});
```
